import { CartService } from './../services/cart.service';
import { OrderType, PaymentType } from '../constants';
import { AppDataSource } from '../config/ormConfig';
import { Repository } from 'typeorm';
import { CategoryEntity } from '../entities/category.entity';
import { ProductEntity } from '../entities/product.entity';
import { UserEntity } from '../entities/user.entity';
import { OrderEntity } from '../entities/order.entity';
import { OrderService } from '../services/order.service';
import { CreateOrderDto } from '../commons/dtos/createOrder.dto';
import { StoreEntity } from '../entities/store.entity';
import { Request, Response } from 'express';
import { VnpayReturnUrlQueryDto } from '../commons/dtos/vnpayReturnUrlQuery.dto';
import { PaymentEntity } from '../entities/payment.entity';
import { PaymentService } from '../services/payment.service';

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let orderService: OrderService;
  let cartService: CartService;
  let categoryRepository: Repository<CategoryEntity>;
  let productRepository: Repository<ProductEntity>;
  let userRepository: Repository<UserEntity>;
  let orderRepository: Repository<OrderEntity>;
  let storeRepository: Repository<StoreEntity>;
  let createdUser: UserEntity;

  beforeAll(async () => {
    await AppDataSource.initialize();
    paymentService = new PaymentService();
    orderService = new OrderService();
    cartService = new CartService();
    categoryRepository = AppDataSource.getRepository(CategoryEntity);
    productRepository = AppDataSource.getRepository(ProductEntity);
    userRepository = AppDataSource.getRepository(UserEntity);
    orderRepository = AppDataSource.getRepository(OrderEntity);
    storeRepository = AppDataSource.getRepository(StoreEntity);
    await categoryRepository.insert([
      {
        name: 'COMBO 1 NGƯỜI',
      },
      {
        name: 'COMBO NHÓM',
      },
      {
        name: 'GÀ RÁN - GÀ QUAY',
      },
      {
        name: 'BURGER - CƠM - MÌ Ý',
      },
      {
        name: 'THỨC ĂN NHẸ',
      },
      {
        name: 'THỨC UỐNG & TRÁNG MIỆNG',
      },
    ]);
    const categories = await categoryRepository.find();
    if (categories.length === 6) {
      await productRepository.save({
        name: 'Combo Gà Rán 1',
        image:
          'https://static.kfcvietnam.com.vn/images/items/lg/D-CBO-CHICKEN-1.jpg?v=41P1nL',
        basePrice: 59000,
        currentPrice: 59000,
        description:
          '1 Miếng Gà + 1 Khoai Tây Chiên / 1 Khoai Tây Nghiền & Bắp Cải Trộn + 1 Pepsi (lớn)',
        categories: [categories[0]],
        cartProducts: [],
        feedbacks: [],
        orderProducts: [],
      });
      const user = userRepository.create({
        userName: 'user01',
        email: 'thuan17082002@gmail.com',
        password: '',
        fullName: 'User Full Name',
      });
      createdUser = await userRepository.save(user);
      await productRepository.save({
        name: 'Combo Gà Rán 2',
        image:
          'https://static.kfcvietnam.com.vn/images/items/lg/D-CBO-CHICKEN-1.jpg?v=41P1nL',
        basePrice: 89000,
        currentPrice: 80000,
        description:
          '2 Miếng Gà + 1 Khoai Tây Chiên / 1 Khoai Tây Nghiền & Bắp Cải Trộn + 1 Pepsi (lớn)',
        categories: [categories[0]],
        cartProducts: [],
        feedbacks: [],
        orderProducts: [],
      });
      await productRepository.save({
        name: 'Burger Tôm',
        image:
          'https://static.kfcvietnam.com.vn/images/items/lg/Burger-Shrimp.jpg?v=41P1nL',
        basePrice: 45000,
        currentPrice: 45000,
        description: 'Burger Tôm',
        categories: [categories[3]],
        cartProducts: [],
        feedbacks: [],
        orderProducts: [],
      });
    }
    await storeRepository.insert([
      {
        name: 'KFC Đường Nguyễn Xí',
        address: '217 Nguyễn Xí, P.13, Bình Thạnh, Hồ Chí Minh',
        phoneNumber: '0123456789',
      },
      {
        name: 'KFC Đường Xô Viết Nghệ Tĩnh',
        address: 'Số 195 Xô Viết Nghệ Tĩnh, P.17, Bình Thạnh, Hồ Chí Minh',
        phoneNumber: '0123456789',
      },
    ]);
    const products = await productRepository.find();
    await Promise.all(
      products.map(async (product) => {
        await cartService.addToCart(createdUser, product.id);
      }),
    );
    const store = await storeRepository.findOne({
      where: { name: 'KFC Đường Nguyễn Xí' },
    });
    const req = {} as Request;
    const res = {
      render: jest.fn(),
      redirect: jest.fn(),
    } as unknown as Response;
    const createOptions: CreateOrderDto = {
      orderType: OrderType.DELIVERY,
      paymentType: PaymentType.VNPAY,
      address: 'Test address',
      phoneNumber: '1234567890',
      note: 'Test note',
      storeId: store?.id,
    };

    await orderService.createOrder(req, res, createdUser, createOptions);
  });

  afterAll(async () => {
    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
      await queryRunner.query('TRUNCATE TABLE `product_category`');
      await queryRunner.query('TRUNCATE TABLE `category`');
      await queryRunner.query('TRUNCATE TABLE `order_product`');
      await queryRunner.query('TRUNCATE TABLE `cart_product`');
      await queryRunner.query('TRUNCATE TABLE `payment`');
      await queryRunner.query('TRUNCATE TABLE `order`');
      await queryRunner.query('TRUNCATE TABLE `product`');
      await queryRunner.query('TRUNCATE TABLE `user`');
      await queryRunner.query('TRUNCATE TABLE `store`');
      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
      await AppDataSource.destroy();
    }
  });

  describe('saveTransaction', () => {
    it('should save transaction and return PaymentEntity', async () => {
      const orders = await orderRepository.find();
      if (orders.length > 0) {
        const vnPayResponse: VnpayReturnUrlQueryDto = {
          vnp_Amount: '18400000',
          vnp_BankCode: 'NCB',
          vnp_BankTranNo: 'VNP14494656',
          vnp_CardType: 'ATM',
          vnp_OrderInfo: 'Giao dich cho Don hang ' + orders[0].id.toString(),
          vnp_PayDate: '20240705092820',
          vnp_ResponseCode: '00',
          vnp_TmnCode: 'I7Q47IH0',
          vnp_TransactionNo: '14494656',
          vnp_TransactionStatus: '00',
          vnp_TxnRef: orders[0].id.toString(),
          vnp_SecureHash:
            'c970413f0f3d2f2074914a72882dc62aad1102eef373c6d8885aeb5ee11c8b238bed76b1882b45ed17e5fcc17daa2df483f49e4d0cac44d12cbd2abdd3c82b5c',
        };
        const result = await paymentService.saveTransaction(
          orders[0],
          vnPayResponse,
        );
        expect(result).toBeInstanceOf(PaymentEntity);
      }
    });
  });

  describe('findOrderPayment', () => {
    it('should return order PaymentEntity', async () => {
      const orders = await orderRepository.find();
      if (orders.length > 0) {
        const result = await paymentService.findOrderPayment(orders[0].id);
        expect(result).toBeInstanceOf(PaymentEntity);
      }
    });

    it('should return PaymentEntity', async () => {
      const orders = await orderRepository.find();
      if (orders.length > 0) {
        const result = await paymentService.findOrderPayment(
          orders[0].id.toString(),
        );
        expect(result).toBeInstanceOf(PaymentEntity);
      }
    });

    it('should return null', async () => {
      const order = await orderRepository.findOne({
        where: { id: 10000 },
      });
      if (order === null) {
        const result = await paymentService.findOrderPayment(10000);
        expect(result).toBeNull();
      }
    });
  });
});
