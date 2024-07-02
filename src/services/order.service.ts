import { CartService } from './cart.service';
import { Request, Response } from 'express';
import { EntityManager, Repository } from 'typeorm';
import { AppDataSource } from '../config/ormConfig';
import { OrderEntity } from '../entities/order.entity';
import { CartProductEntity } from '../entities/cartProduct.entity';
import { 
  Error as ErrorMessage,   
  Interval,   
  OrderStatus,   
  OrderType, 
  PaymentStatus, 
  PaymentType, 
  SHIPPING_FEE,
} from '../constants';
import { CreateOrderDto } from '../commons/dtos/createOrder.dto';
import { StoreService } from './store.service';
import { UserEntity } from '../entities/user.entity';
import { OrderProductEntity } from '../entities/orderProduct.entity';
import { PaymentService } from './payment.service';
import { 
  VnpayReturnUrlQueryDto, 
} from '../commons/dtos/vnpayReturnUrlQuery.dto';
import { PaymentEntity } from '../entities/payment.entity';
import { formatDate, processPayment } from '../commons/utils';
import { OrderPageOptions } from '../commons/dtos/orderPageOptions.dto';
import { PageDto } from '../commons/dtos/page.dto';
import { PageMetaDto } from '../commons/dtos/pageMeta.dto';
import { UpdateOrderStatusDto } from '../commons/dtos/updateOrderStatus.dto';
import { UpdateOrderStoreDto } from '../commons/dtos/updateOrderStore.dto';
import { NodeMailerService } from '../third-party-services/nodemailer.service';
import { MailTitle } from '../constants/email';
import { OrderNumberByStatusDto } from '../commons/dtos/orderNumberByStatus.dto';
import { plainToClass } from 'class-transformer';
import { OrderNumberByPaymentStatusDto } from '../commons/dtos/orderNumberByPaymentStatus.dto';
import { OrderNumberByStoreDto } from '../commons/dtos/orderNumberByStore.dto';
import { RevenueAnalysisOption } from '../commons/dtos/revenueAnalysisOption.dto';
import { RevenueAnalysis } from '../commons/dtos/revenueAnalysis.dto';
import { StoreRevenueAnalysis } from '../commons/dtos/storeRevenueAnalysis.dto';
import { ProductAnalysis } from '../commons/dtos/productAnalysis.dto';

export class OrderService {
  private readonly orderRepository: Repository<OrderEntity>;
  private readonly orderProductRepository: Repository<OrderProductEntity>;
  private readonly storeService: StoreService;
  private readonly cartService: CartService;
  private readonly paymentService: PaymentService;
  private readonly mailService: NodeMailerService;
  constructor() {
    this.orderRepository = AppDataSource.getRepository(OrderEntity);
    this.orderProductRepository = 
      AppDataSource.getRepository(OrderProductEntity);
    this.storeService = new StoreService();
    this.cartService = new CartService();
    this.paymentService = new PaymentService();
    this.mailService = new NodeMailerService();
  }

  public async createOrder(
    req: Request,
    res: Response,
    user: UserEntity, 
    createOptions: CreateOrderDto,
  ) {
    const cartProducts = await this.cartService.getCartProducts(user);
    const orderTotal = this.calculateOrderTotal(
      cartProducts, 
      createOptions.orderType === OrderType.PICK_UP,
    );
    await AppDataSource.transaction(
      async (transactionalEntityManager: EntityManager) => {
      const newOrder = this.orderRepository.create({
        orderType: createOptions.orderType,
        paymentType: createOptions.paymentType,
        deliveryAddress: createOptions.address,
        phoneNumber: createOptions.phoneNumber,
        note: createOptions.note,
        shippingFee: SHIPPING_FEE,
        total: orderTotal,
        user,
      });
      if(createOptions.storeId){
        const store = await this.storeService
        .findOneById(createOptions.storeId);
        if(store) {
          newOrder.store = store;
          if(createOptions.orderType === OrderType.PICK_UP){
            newOrder.deliveryAddress = store.address;
            newOrder.shippingFee = 0;
          }
        }
      }

      const savedOrder = await transactionalEntityManager.save(newOrder);
      
      const orderProducts = cartProducts.map((cartProduct) => {
        return this.orderProductRepository.create({
          quantity: cartProduct.quantity,
          price: cartProduct.product.currentPrice,
          product: cartProduct.product,
          order: savedOrder,
        });
      });

      await transactionalEntityManager
      .insert(this.orderProductRepository.target, orderProducts);

      // Remove products from cart
      await this.cartService.removeProductFromCart(user);

      this.mailService.sendEmail(
        user.email, 
        MailTitle.PLACE_ORDER_SUCCESS,
        'create-order-success',
        {
          order: savedOrder,
          orderProducts: orderProducts,
          formatDate,
        },
      );

      switch(savedOrder.paymentType) {
        case PaymentType.VNPAY: {
          processPayment(req, res, savedOrder);
          break;
        }
        default: {
          res.render('user/order/thank-you', { user });
        }
      }
    }).catch((error) => {
      throw new Error('Transaction failed: ' + (error as Error).message);
    });
  }

  public calculateOrderTotal(
    items: CartProductEntity[], 
    isPickupOrder: boolean,
  ): number {
    let value: number = 0;
    items.forEach((item) => {
      value += item.product.currentPrice * item.quantity;
    });
    return isPickupOrder ? value : value + SHIPPING_FEE;
  }

  public async saveOrderTransaction(
    vnPayResponse: VnpayReturnUrlQueryDto,
  ): Promise<string | PaymentEntity> {
    const order = await this.findOneById(vnPayResponse.vnp_TxnRef);
    if (order === null) {
      return ErrorMessage.ORDER_NOT_FOUND;
    }
    if (order.paymentStatus === PaymentStatus.COMPLETE) {
      return ErrorMessage.ORDER_HAS_BEEN_PAID;
    }
    const saveResult = 
      await this.paymentService.saveTransaction(order, vnPayResponse);
    if(saveResult instanceof PaymentEntity){
      order.paymentStatus = PaymentStatus.COMPLETE;
      this.mailService.sendEmail(
        order.user.email, 
        MailTitle.PAYMENT_SUCCESS,
        'payment-success',
        {
          order,
          formatDate,
          payment: saveResult,
        },
      );
      await this.orderRepository.save(order);
    }
    return saveResult;
  }

  public async findOneById(id: number | string): Promise<OrderEntity | null> {
    const orderId = (typeof id === 'number') ? id : parseInt(id);
    return this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['user', 'store', 'orderProducts'],
    });
  }

  public async getOrderPage(pageOptionsDto: OrderPageOptions)
  :Promise<PageDto<OrderEntity>> {
    const {
      order,
      take,
      skip,
      sortField,
      orderType,
      orderStatus,
      paymentStatus,
      userId,
      minValue,
      maxValue,
    } = pageOptionsDto;
    const query = this.orderRepository.createQueryBuilder('order')
    .leftJoinAndSelect('order.user', 'user')
    .leftJoinAndSelect('order.store', 'store')
    .leftJoinAndSelect('order.orderProducts', 'orderProduct')
    .leftJoinAndSelect('orderProduct.product', 'product');

    //Handle filter
    if(userId) {
      query.andWhere('user.id = :userId', {userId: userId});
    }
    if(orderType) {
      query.andWhere(
        'order.orderType = :orderType', 
        {orderType: orderType},
      );
    }
    if(orderStatus) {
      query.andWhere(
        'order.status = :orderStatus', 
        {orderStatus: orderStatus},
      );
    }
    if(paymentStatus) {
      query.andWhere(
        'order.paymentStatus = :paymentStatus', 
        {paymentStatus: paymentStatus},
      );
    }
    if(minValue) {
      query.andWhere('order.total >= :minValue', 
        {minValue: minValue},
      );
    }
    if(maxValue) {
      query.andWhere('order.total <= :maxValue', 
        {maxValue: maxValue},
      );
    }
    
    //Handle sort
    query.orderBy('order.' + sortField, order)
    .addOrderBy('order.id', 'DESC');

    //Handle paging
    query.skip(skip).take(take);

    // Retrieve entities
    const itemCount = await query.getCount();
    const entities = await query.getMany();

    const pageMeta = new PageMetaDto({pageOptionsDto, itemCount});
    return new PageDto(entities, pageMeta);
  }

  public async getOrderById(id: number | string): Promise<OrderEntity | null> {
    const orderId = typeof id === 'number' ? id : parseInt(id);
    const query = this.orderRepository.createQueryBuilder('order')
    .leftJoinAndSelect('order.user', 'user')
    .leftJoinAndSelect('order.store', 'store')
    .leftJoinAndSelect('order.orderProducts', 'orderProduct')
    .leftJoinAndSelect('orderProduct.product', 'product')
    .where('order.id = :orderId', {orderId: orderId});
    return query.getOne();
  }

  public async updateOrderStatus(
    updateOption: UpdateOrderStatusDto): Promise<OrderEntity> {
    const order = await this.getOrderById(updateOption.id);
    if(!order){
      throw new Error(ErrorMessage.BAD_INPUT);
    }
    switch(updateOption.orderStatus) {
      case OrderStatus.CANCELED: {
        if(order.status !== OrderStatus.PENDING) {
          throw new Error(ErrorMessage.BAD_INPUT);
        }
        order.status = OrderStatus.CANCELED;
        this.sendOrderStatusUpdateMail(order, OrderStatus.PENDING);
        return this.orderRepository.save(order);
      }
      case OrderStatus.APPROVED: {
        if(order.status !== OrderStatus.PENDING) {
          throw new Error(ErrorMessage.BAD_INPUT);
        }
        order.status = OrderStatus.APPROVED;
        this.sendOrderStatusUpdateMail(order, OrderStatus.PENDING);
        const savedOrder = await this.orderRepository.save(order);
        return savedOrder; 
      }
      case OrderStatus.REJECTED: {
        if(order.status !== OrderStatus.PENDING) {
          throw new Error(ErrorMessage.BAD_INPUT);
        }
        order.status = OrderStatus.REJECTED;
        order.rejectReason = updateOption.rejectReason;
        this.sendOrderStatusUpdateMail(order, OrderStatus.PENDING);
        return this.orderRepository.save(order);
      }
      case OrderStatus.READY: {
        if(order.status !== OrderStatus.APPROVED) {
          throw new Error(ErrorMessage.BAD_INPUT);
        }
        order.status = OrderStatus.READY;
        this.sendOrderStatusUpdateMail(order, OrderStatus.APPROVED);
        return this.orderRepository.save(order);
      }
      case OrderStatus.DELIVERED: {
        if(order.status !== OrderStatus.READY) {
          throw new Error(ErrorMessage.BAD_INPUT);
        }
        order.status = OrderStatus.DELIVERED;
        this.sendOrderStatusUpdateMail(order, OrderStatus.READY);
        return this.orderRepository.save(order);
      }
      case OrderStatus.COMPLETED: {
        if(order.status !== OrderStatus.DELIVERED) {
          throw new Error(ErrorMessage.BAD_INPUT);
        }
        order.status = OrderStatus.COMPLETED;
        order.paymentStatus = PaymentStatus.COMPLETE;
        this.sendOrderStatusUpdateMail(order, OrderStatus.DELIVERED);
        return this.orderRepository.save(order);
      }
    }
    return order;
  }

  public async updateOrderStore(
    updateOption: UpdateOrderStoreDto): Promise<OrderEntity> {
    const store = await this.storeService.findOneById(updateOption.storeId);
    if(store === null) {
      throw new Error(ErrorMessage.STORE_NOT_FOUND);
    }
    const order = await this.orderRepository.findOne({where:{
      id: updateOption.orderId,
    }});
    if(!order){
      throw new Error(ErrorMessage.BAD_INPUT);
    }
    if(order.status !== OrderStatus.PENDING) {
      throw new Error(ErrorMessage.BAD_INPUT);
    }
    order.store = store;
    return this.orderRepository.save(order);
  }

  private async sendOrderStatusUpdateMail(
    order: OrderEntity, 
    oldStatus: OrderStatus,
  ) {
    await this.mailService.sendEmail(
      order.user.email, 
      MailTitle.ORDER_STATUS_UPDATE,
      'order-status-update',
      {
        order,
        orderProducts: order.orderProducts,
        oldStatus,
        formatDate,
      },
    );
  }

  public async getUserOrderNumber(userId: number, orderStatus?: OrderStatus)
  :Promise<number> {
    const query = this.orderRepository.createQueryBuilder('order')
    .leftJoin('order.user', 'user')
    .where('user.id = :userId', {userId: userId});
    if(orderStatus){
      query.andWhere('order.status = :status', {status: orderStatus});
    }
    return query.getCount();
  }

  public async getStoreOrderNumber(storeId: number, orderStatus?: OrderStatus)
  :Promise<number> {
    const query = this.orderRepository.createQueryBuilder('order')
    .leftJoin('order.store', 'store')
    .where('store.id = :storeId', {storeId: storeId});
    if(orderStatus){
      query.andWhere('order.status = :status', {status: orderStatus});
    }
    return query.getCount();
  }

  public async getNumberOfOrderByStatus(): Promise<OrderNumberByStatusDto[]> {
    const query = this.orderRepository.createQueryBuilder('order')
    .select('order.status', 'status')
    .addSelect('COUNT(*)', 'number')
    .groupBy('order.status');
    const result = await query.getRawMany();
    return plainToClass(OrderNumberByStatusDto, result);
  }

  public async getNumberOfOrderByPaymentStatus()
  : Promise<OrderNumberByPaymentStatusDto[]> {
    const query = this.orderRepository.createQueryBuilder('order')
    .select('order.paymentStatus', 'paymentStatus')
    .addSelect('COUNT(*)', 'number')
    .groupBy('order.paymentStatus');
    const result = await query.getRawMany();
    return plainToClass(OrderNumberByPaymentStatusDto, result);
  }

  public async getNumberOfOrderByStore()
  : Promise<OrderNumberByStoreDto[]> {
    const query = this.orderRepository.createQueryBuilder('order')
    .leftJoin('order.store', 'store')
    .select('store.name', 'name')
    .addSelect('COUNT(*)', 'number')
    .groupBy('store.id');
    const result = await query.getRawMany();
    return plainToClass(OrderNumberByStoreDto, result);
  }

  async getRevenue(options: RevenueAnalysisOption): Promise<RevenueAnalysis[]> {
    const { interval, startDate, endDate, storeId } = options;

    let dateFormat: string;
    switch (interval) {
      case Interval.DAY:
        dateFormat = '%Y-%m-%d';
        break;
      case Interval.MONTH:
        dateFormat = '%Y-%m';
        break;
      case Interval.YEAR:
        dateFormat = '%Y';
        break;
      default:
        throw new Error('Invalid interval');
    }

    const query = this.orderRepository.createQueryBuilder('order')
      .leftJoin('order.store', 'store')
      .select(`DATE_FORMAT(order.createdAt, '${dateFormat}')`, 'time')
      .addSelect('SUM(order.total)', 'total')
      .where('order.paymentStatus = :paymentStatus', {paymentStatus: PaymentStatus.COMPLETE})
      .groupBy('time')
      .orderBy('time', 'ASC');

    if (storeId) {
      query.andWhere('store.id = :storeId', {storeId: storeId});
    }

    if (startDate && endDate) {
      query.andWhere('order.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    } else if (startDate) {
      query.andWhere('order.createdAt >= :startDate', { startDate });
    } else if (endDate) {
      query.andWhere('order.createdAt <= :endDate', { endDate });
    }

    const result = await query.getRawMany();
    return plainToClass(RevenueAnalysis, result);
  }

  async getStoreRevenue(options: RevenueAnalysisOption)
  : Promise<StoreRevenueAnalysis[]> {
    const { startDate, endDate } = options;

    const query = this.orderRepository.createQueryBuilder('order')
      .leftJoin('order.store', 'store')
      .select('store.name', 'name')
      .addSelect('SUM(order.total)', 'total')
      .where('order.paymentStatus = :paymentStatus', {paymentStatus: PaymentStatus.COMPLETE})
      .groupBy('name')
      .orderBy('name', 'ASC');

    if (startDate && endDate) {
      query.andWhere('order.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    } else if (startDate) {
      query.andWhere('order.createdAt >= :startDate', { startDate });
    } else if (endDate) {
      query.andWhere('order.createdAt <= :endDate', { endDate });
    }

    const result = await query.getRawMany();
    return plainToClass(StoreRevenueAnalysis, result);
  }

  async getProductAnalysis(options: RevenueAnalysisOption)
  : Promise<ProductAnalysis[]> {
    const { startDate, endDate, storeId, categoryId } = options;

    const query = this.orderRepository.createQueryBuilder('order')
      .leftJoin('order.store', 'store')
      .leftJoin('order.orderProducts', 'orderProduct')
      .leftJoin('orderProduct.product', 'product')
      .leftJoin('product.categories', 'category')
      .select('product.name', 'name')
      .addSelect('SUM(orderProduct.quantity)', 'sellNumber')
      .where('order.paymentStatus = :paymentStatus', {paymentStatus: PaymentStatus.COMPLETE})
      .groupBy('name')
      .orderBy('name', 'ASC');
    
    if(storeId) {
      query.andWhere('store.id = :storeId', {storeId: storeId});
    }

    if(categoryId) {
      query.andWhere('category.id = :categoryId', {categoryId: categoryId});
    }

    if (startDate && endDate) {
      query.andWhere('order.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    } else if (startDate) {
      query.andWhere('order.createdAt >= :startDate', { startDate });
    } else if (endDate) {
      query.andWhere('order.createdAt <= :endDate', { endDate });
    }

    const result = await query.getRawMany();
    return plainToClass(ProductAnalysis, result);
  }
}
