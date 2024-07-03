import { CartService } from './../services/cart.service';
import {
  Error as ErrorMessage,
  Interval,
  Order,
  OrderSortField,
  OrderStatus,
  OrderType,
  PaymentStatus,
  PaymentType,
} from '../constants';
import { AppDataSource } from '../config/ormConfig';
import { Repository } from 'typeorm';
import { CategoryEntity } from '../entities/category.entity';
import { ProductEntity } from '../entities/product.entity';
import { UserEntity } from '../entities/user.entity';
import { OrderEntity } from '../entities/order.entity';
import { OrderProductEntity } from '../entities/orderProduct.entity';
import { OrderService } from '../services/order.service';
import { CreateOrderDto } from '../commons/dtos/createOrder.dto';
import { StoreEntity } from '../entities/store.entity';
import { Request, Response } from 'express';
import { VnpayReturnUrlQueryDto } from '../commons/dtos/vnpayReturnUrlQuery.dto';
import { PaymentEntity } from '../entities/payment.entity';
import { PageDto } from '../commons/dtos/page.dto';
import { OrderNumberByStatusDto } from '../commons/dtos/orderNumberByStatus.dto';
import { OrderNumberByPaymentStatusDto } from '../commons/dtos/orderNumberByPaymentStatus.dto';
import { OrderNumberByStoreDto } from '../commons/dtos/orderNumberByStore.dto';
import { RevenueAnalysis } from '../commons/dtos/revenueAnalysis.dto';
import { StoreRevenueAnalysis } from '../commons/dtos/storeRevenueAnalysis.dto';
import { ProductAnalysis } from '../commons/dtos/productAnalysis.dto';

describe('OrderService', () => {
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

  describe('createOrder', () => {
    beforeEach(async () => {
      const products = await productRepository.find();
      await Promise.all(
        products.map(async (product) => {
          await cartService.addToCart(createdUser, product.id);
        }),
      );
    });

    afterAll(async () => {
      const queryRunner = AppDataSource.createQueryRunner();

      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
        await queryRunner.query('TRUNCATE TABLE `payment`');
        await queryRunner.query('TRUNCATE TABLE `order_product`');
        await queryRunner.query('TRUNCATE TABLE `order`');
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    });

    it('should create an pick up order successfully', async () => {
      const req = {} as Request;
      const res = { render: jest.fn() } as unknown as Response;
      const store = await storeRepository.findOne({
        where: { name: 'KFC Đường Nguyễn Xí' },
      });
      if (store !== null) {
        const createOptions: CreateOrderDto = {
          orderType: OrderType.PICK_UP,
          paymentType: PaymentType.COD,
          phoneNumber: '1234567890',
          note: 'Test Note',
          storeId: store.id,
        };

        await orderService.createOrder(req, res, createdUser, createOptions);
        const orders = await orderRepository.find();
        expect(orders.length).toEqual(1);
        const order = await orderRepository.findOne({
          where: { phoneNumber: '1234567890' },
        });
        expect(order).toBeInstanceOf(OrderEntity);
        if (order !== null) {
          expect(order.orderType).toEqual(OrderType.PICK_UP);
          expect(order.paymentType).toEqual(PaymentType.COD);
          expect(order.deliveryAddress).toEqual(
            '217 Nguyễn Xí, P.13, Bình Thạnh, Hồ Chí Minh',
          );
          expect(order.note).toEqual('Test Note');
          expect(order.total).toEqual(184000);
          expect(order.status).toEqual(OrderStatus.PENDING);
          expect(order.paymentStatus).toEqual(PaymentStatus.INCOMPLETE);
        }
      }
    });

    it('should create a delivery order successfully', async () => {
      const req = {} as Request;
      const res = { render: jest.fn() } as unknown as Response;
      const createOptions: CreateOrderDto = {
        orderType: OrderType.DELIVERY,
        paymentType: PaymentType.COD,
        address: 'Test address',
        phoneNumber: '1234567890',
        note: 'Test Note',
      };

      await orderService.createOrder(req, res, createdUser, createOptions);
      const orders = await orderRepository.find();
      expect(orders.length).toEqual(2);
      const order = await orderRepository.findOne({
        where: { deliveryAddress: 'Test address' },
      });
      expect(order).toBeInstanceOf(OrderEntity);
      if (order !== null) {
        expect(order.orderType).toEqual(OrderType.DELIVERY);
        expect(order.paymentType).toEqual(PaymentType.COD);
        expect(order.deliveryAddress).toEqual('Test address');
        expect(order.note).toEqual('Test Note');
        expect(order.total).toEqual(194000);
        expect(order.status).toEqual(OrderStatus.PENDING);
        expect(order.paymentStatus).toEqual(PaymentStatus.INCOMPLETE);
      }
    });

    it('should integrate vn-pay successfully', async () => {
      const req = {} as Request;
      const res = {
        render: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;
      const store = await storeRepository.findOne({
        where: { name: 'KFC Đường Nguyễn Xí' },
      });
      if (store !== null) {
        const createOptions: CreateOrderDto = {
          orderType: OrderType.PICK_UP,
          paymentType: PaymentType.VNPAY,
          phoneNumber: '1234567890',
          note: 'Test Note',
          storeId: store.id,
        };

        await orderService.createOrder(req, res, createdUser, createOptions);
        const orders = await orderRepository.find();
        expect(orders.length).toEqual(3);
        const order = await orderRepository.findOne({
          where: { paymentType: PaymentType.VNPAY },
        });
        expect(order).toBeInstanceOf(OrderEntity);
        if (order !== null) {
          expect(order.orderType).toEqual(OrderType.PICK_UP);
          expect(order.paymentType).toEqual(PaymentType.VNPAY);
          expect(order.deliveryAddress).toEqual(
            '217 Nguyễn Xí, P.13, Bình Thạnh, Hồ Chí Minh',
          );
          expect(order.note).toEqual('Test Note');
          expect(order.total).toEqual(184000);
          expect(order.status).toEqual(OrderStatus.PENDING);
          expect(order.paymentStatus).toEqual(PaymentStatus.INCOMPLETE);
        }
      }
    });
  });

  describe('calculateOrderTotal', () => {
    beforeEach(async () => {
      const products = await productRepository.find();
      await Promise.all(
        products.map(async (product) => {
          await cartService.addToCart(createdUser, product.id);
        }),
      );
    });

    afterEach(async () => {
      await cartService.removeProductFromCart(createdUser);
    });

    afterAll(async () => {
      const queryRunner = AppDataSource.createQueryRunner();

      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
        await queryRunner.query('TRUNCATE TABLE `payment`');
        await queryRunner.query('TRUNCATE TABLE `order_product`');
        await queryRunner.query('TRUNCATE TABLE `order`');
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    });

    it('should calculate pickup order successfully', async () => {
      const cartProducts = await cartService.getCartProducts(createdUser);
      const result = orderService.calculateOrderTotal(cartProducts, true);
      expect(result).toEqual(184000);
    });

    it('should calculate delivery order successfully', async () => {
      const cartProducts = await cartService.getCartProducts(createdUser);
      const result = orderService.calculateOrderTotal(cartProducts, false);
      expect(result).toEqual(194000);
    });
  });

  describe('saveOrderTransaction', () => {
    afterAll(async () => {
      const queryRunner = AppDataSource.createQueryRunner();

      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
        await queryRunner.query('TRUNCATE TABLE `payment`');
        await queryRunner.query('TRUNCATE TABLE `order_product`');
        await queryRunner.query('TRUNCATE TABLE `order`');
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    });

    it('should return order not found message', async () => {
      const order = await orderRepository.findOne({ where: { id: 10000 } });
      if (order === null) {
        const vnPayResponse: VnpayReturnUrlQueryDto = {
          vnp_Amount: '18400000',
          vnp_BankCode: 'NCB',
          vnp_BankTranNo: 'VNP14494656',
          vnp_CardType: 'ATM',
          vnp_OrderInfo: 'Giao dich cho Don hang 10000',
          vnp_PayDate: '20240705092820',
          vnp_ResponseCode: '00',
          vnp_TmnCode: 'I7Q47IH0',
          vnp_TransactionNo: '14494656',
          vnp_TransactionStatus: '00',
          vnp_TxnRef: '10000',
          vnp_SecureHash:
            'c970413f0f3d2f2074914a72882dc62aad1102eef373c6d8885aeb5ee11c8b238bed76b1882b45ed17e5fcc17daa2df483f49e4d0cac44d12cbd2abdd3c82b5c',
        };
        const result = await orderService.saveOrderTransaction(vnPayResponse);
        expect(result).toEqual(ErrorMessage.ORDER_NOT_FOUND);
      }
    });

    it('should return order has been paid message', async () => {
      const products = await productRepository.find();
      await Promise.all(
        products.map(async (product) => {
          await cartService.addToCart(createdUser, product.id);
        }),
      );
      const req = {} as Request;
      const res = { render: jest.fn() } as unknown as Response;
      const createOptions: CreateOrderDto = {
        orderType: OrderType.DELIVERY,
        paymentType: PaymentType.COD,
        address: 'Test address',
        phoneNumber: '1234567890',
        note: 'Test Note',
      };

      await orderService.createOrder(req, res, createdUser, createOptions);
      const orders = await orderRepository.find();
      if (orders.length > 0) {
        const order = orders[0];
        order.paymentStatus = PaymentStatus.COMPLETE;
        await orderRepository.save(order);
        const vnPayResponse: VnpayReturnUrlQueryDto = {
          vnp_Amount: '18400000',
          vnp_BankCode: 'NCB',
          vnp_BankTranNo: 'VNP14494656',
          vnp_CardType: 'ATM',
          vnp_OrderInfo: 'Giao dich cho Don hang 10000',
          vnp_PayDate: '20240705092820',
          vnp_ResponseCode: '00',
          vnp_TmnCode: 'I7Q47IH0',
          vnp_TransactionNo: '14494656',
          vnp_TransactionStatus: '00',
          vnp_TxnRef: order.id.toString(),
          vnp_SecureHash:
            'c970413f0f3d2f2074914a72882dc62aad1102eef373c6d8885aeb5ee11c8b238bed76b1882b45ed17e5fcc17daa2df483f49e4d0cac44d12cbd2abdd3c82b5c',
        };
        const result = await orderService.saveOrderTransaction(vnPayResponse);
        expect(result).toEqual(ErrorMessage.ORDER_HAS_BEEN_PAID);
      }
    });

    it('should update order payment status and create new PaymentEntity', async () => {
      const products = await productRepository.find();
      await Promise.all(
        products.map(async (product) => {
          await cartService.addToCart(createdUser, product.id);
        }),
      );
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
        note: 'VNPAY order',
      };

      await orderService.createOrder(req, res, createdUser, createOptions);
      const order = await orderRepository.findOne({
        where: {
          paymentType: OrderType.DELIVERY,
          note: 'VNPAY order',
        },
      });
      if (order !== null) {
        await orderRepository.save(order);
        const vnPayResponse: VnpayReturnUrlQueryDto = {
          vnp_Amount: '18400000',
          vnp_BankCode: 'NCB',
          vnp_BankTranNo: 'VNP14494656',
          vnp_CardType: 'ATM',
          vnp_OrderInfo: 'Giao dich cho Don hang 10000',
          vnp_PayDate: '20240705092820',
          vnp_ResponseCode: '00',
          vnp_TmnCode: 'I7Q47IH0',
          vnp_TransactionNo: '14494656',
          vnp_TransactionStatus: '00',
          vnp_TxnRef: order.id.toString(),
          vnp_SecureHash:
            'c970413f0f3d2f2074914a72882dc62aad1102eef373c6d8885aeb5ee11c8b238bed76b1882b45ed17e5fcc17daa2df483f49e4d0cac44d12cbd2abdd3c82b5c',
        };
        const result = await orderService.saveOrderTransaction(vnPayResponse);
        expect(result).toBeInstanceOf(PaymentEntity);
        const updatedOrder = await orderRepository.findOne({
          where: { id: order.id },
        });
        if (updatedOrder !== null) {
          expect(updatedOrder.paymentStatus).toEqual(PaymentStatus.COMPLETE);
        }
      }
    });
  });

  describe('findOneById', () => {
    beforeAll(async () => {
      const products = await productRepository.find();
      await Promise.all(
        products.map(async (product) => {
          await cartService.addToCart(createdUser, product.id);
        }),
      );
      const req = {} as Request;
      const res = {
        render: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;
      const createOptions: CreateOrderDto = {
        orderType: OrderType.DELIVERY,
        paymentType: PaymentType.COD,
        address: 'Test address',
        phoneNumber: '1234567890',
        note: 'Test note',
      };

      await orderService.createOrder(req, res, createdUser, createOptions);
    });

    afterAll(async () => {
      const queryRunner = AppDataSource.createQueryRunner();

      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
        await queryRunner.query('TRUNCATE TABLE `payment`');
        await queryRunner.query('TRUNCATE TABLE `order_product`');
        await queryRunner.query('TRUNCATE TABLE `order`');
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    });

    it('should return null', async () => {
      const order = await orderRepository.findOne({ where: { id: 10000 } });
      if (order === null) {
        const result = await orderService.findOneById(10000);
        expect(result).toBeNull();
      }
    });

    it('should return OrderEntity', async () => {
      const orders = await orderRepository.find();
      if (orders.length > 0) {
        const result = await orderService.findOneById(orders[0].id);
        expect(result).toBeInstanceOf(OrderEntity);
        if (result !== null) {
          expect(result.id).toEqual(orders[0].id);
        }
      }
    });
  });

  describe('getOrderById', () => {
    beforeAll(async () => {
      const products = await productRepository.find();
      await Promise.all(
        products.map(async (product) => {
          await cartService.addToCart(createdUser, product.id);
        }),
      );
      const req = {} as Request;
      const res = {
        render: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;
      const createOptions: CreateOrderDto = {
        orderType: OrderType.DELIVERY,
        paymentType: PaymentType.COD,
        address: 'Test address',
        phoneNumber: '1234567890',
        note: 'Test note',
      };

      await orderService.createOrder(req, res, createdUser, createOptions);
    });

    afterAll(async () => {
      const queryRunner = AppDataSource.createQueryRunner();

      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
        await queryRunner.query('TRUNCATE TABLE `payment`');
        await queryRunner.query('TRUNCATE TABLE `order_product`');
        await queryRunner.query('TRUNCATE TABLE `order`');
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    });

    it('should return null', async () => {
      const order = await orderRepository.findOne({ where: { id: 10000 } });
      if (order === null) {
        const result = await orderService.getOrderById(10000);
        expect(result).toBeNull();
      }
    });

    it('should return OrderEntity', async () => {
      const orders = await orderRepository.find();
      if (orders.length > 0) {
        const result = await orderService.getOrderById(orders[0].id);
        expect(result).toBeInstanceOf(OrderEntity);
        if (result !== null) {
          expect(result.id).toEqual(orders[0].id);
        }
      }
    });
  });

  describe('getOrderPage', () => {
    beforeAll(async () => {
      const products = await productRepository.find();
      await Promise.all(
        products.map(async (product) => {
          await cartService.addToCart(createdUser, product.id);
        }),
      );
      const req = {} as Request;
      const res = {
        render: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;
      const createOptions: CreateOrderDto = {
        orderType: OrderType.DELIVERY,
        paymentType: PaymentType.COD,
        address: 'Test address',
        phoneNumber: '1234567890',
        note: 'Test note',
      };

      await orderService.createOrder(req, res, createdUser, createOptions);
    });

    afterAll(async () => {
      const queryRunner = AppDataSource.createQueryRunner();

      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
        await queryRunner.query('TRUNCATE TABLE `payment`');
        await queryRunner.query('TRUNCATE TABLE `order_product`');
        await queryRunner.query('TRUNCATE TABLE `order`');
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    });

    it('should return order page and page meta', async () => {
      const pageOptions = {
        order: Order.ASC,
        page: 1,
        take: 10,
        skip: 0,
        sortField: OrderSortField.CREATED_AT,
      };
      const result = await orderService.getOrderPage(pageOptions);
      expect(result).toBeInstanceOf(PageDto<OrderEntity>);
      expect(result.data.length).toEqual(1);
    });

    it('should return order page and page meta', async () => {
      const pageOptions = {
        order: Order.ASC,
        page: 1,
        take: 10,
        skip: 0,
        sortField: OrderSortField.CREATED_AT,
        userId: createdUser.id,
      };
      const result = await orderService.getOrderPage(pageOptions);
      expect(result).toBeInstanceOf(PageDto<OrderEntity>);
      expect(result.data.length).toEqual(1);
    });

    it('should return order page and page meta', async () => {
      const pageOptions = {
        order: Order.ASC,
        page: 1,
        take: 10,
        skip: 0,
        sortField: OrderSortField.CREATED_AT,
        orderType: OrderType.DELIVERY,
      };
      const result = await orderService.getOrderPage(pageOptions);
      expect(result).toBeInstanceOf(PageDto<OrderEntity>);
      expect(result.data.length).toEqual(1);
    });

    it('should return order page and page meta', async () => {
      const pageOptions = {
        order: Order.ASC,
        page: 1,
        take: 10,
        skip: 0,
        sortField: OrderSortField.CREATED_AT,
        orderStatus: OrderStatus.PENDING,
      };
      const result = await orderService.getOrderPage(pageOptions);
      expect(result).toBeInstanceOf(PageDto<OrderEntity>);
      expect(result.data.length).toEqual(1);
    });

    it('should return order page and page meta', async () => {
      const pageOptions = {
        order: Order.ASC,
        page: 1,
        take: 10,
        skip: 0,
        sortField: OrderSortField.CREATED_AT,
        minValue: 300000,
      };
      const result = await orderService.getOrderPage(pageOptions);
      expect(result).toBeInstanceOf(PageDto<OrderEntity>);
      expect(result.data.length).toEqual(0);
    });

    it('should return order page and page meta', async () => {
      const pageOptions = {
        order: Order.ASC,
        page: 1,
        take: 10,
        skip: 0,
        sortField: OrderSortField.CREATED_AT,
        maxValue: 100000,
      };
      const result = await orderService.getOrderPage(pageOptions);
      expect(result).toBeInstanceOf(PageDto<OrderEntity>);
      expect(result.data.length).toEqual(0);
    });

    it('should return order page and page meta', async () => {
      const pageOptions = {
        order: Order.ASC,
        page: 1,
        take: 10,
        skip: 0,
        sortField: OrderSortField.CREATED_AT,
        userId: createdUser.id,
        orderType: OrderType.DELIVERY,
        orderStatus: OrderStatus.COMPLETED,
        minValue: 300000,
        maxValue: 400000,
      };
      const result = await orderService.getOrderPage(pageOptions);
      expect(result).toBeInstanceOf(PageDto<OrderEntity>);
      expect(result.data.length).toEqual(0);
    });
  });

  describe('updateOrderStatus', () => {
    beforeEach(async () => {
      const products = await productRepository.find();
      await Promise.all(
        products.map(async (product) => {
          await cartService.addToCart(createdUser, product.id);
        }),
      );
      const req = {} as Request;
      const res = {
        render: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;
      const createOptions: CreateOrderDto = {
        orderType: OrderType.DELIVERY,
        paymentType: PaymentType.COD,
        address: 'Test address',
        phoneNumber: '1234567890',
        note: 'Test note',
      };

      await orderService.createOrder(req, res, createdUser, createOptions);
    });

    afterEach(async () => {
      const queryRunner = AppDataSource.createQueryRunner();

      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
        await queryRunner.query('TRUNCATE TABLE `payment`');
        await queryRunner.query('TRUNCATE TABLE `order_product`');
        await queryRunner.query('TRUNCATE TABLE `order`');
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    });

    it('should throw bad input error if order not found', async () => {
      const order = await orderRepository.findOne({where: {id: 10000}});
      if(order===null){
        const updateOptions = {
          id: 10000,
          orderStatus: OrderStatus.CANCELED,
        };
        try{
          await orderService.updateOrderStatus(updateOptions);
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toEqual(Error(ErrorMessage.BAD_INPUT));
        }
      }
    });

    it('should update order status from pending to canceled', async () => {
      const order = await orderRepository.findOne({where: {phoneNumber: '1234567890'}});
      if(order!==null){
        const updateOptions = {
          id: order.id,
          orderStatus: OrderStatus.CANCELED,
        };
        const result = await orderService.updateOrderStatus(updateOptions);
        expect(result).toBeInstanceOf(OrderEntity);
        expect(result.id).toEqual(order.id);
        expect(result.status).toEqual(OrderStatus.CANCELED);
      }
    });

    it('should update order status from pending to approved', async () => {
      const order = await orderRepository.findOne({where: {phoneNumber: '1234567890'}});
      if(order!==null){
        const updateOptions = {
          id: order.id,
          orderStatus: OrderStatus.APPROVED,
        };
        const result = await orderService.updateOrderStatus(updateOptions);
        expect(result).toBeInstanceOf(OrderEntity);
        expect(result.id).toEqual(order.id);
        expect(result.status).toEqual(OrderStatus.APPROVED);
      }
    });

    it('should update order status from pending to approved', async () => {
      const order = await orderRepository.findOne({where: {phoneNumber: '1234567890'}});
      if(order!==null){
        const updateOptions = {
          id: order.id,
          orderStatus: OrderStatus.REJECTED,
          rejectReason: 'Reason',
        };
        const result = await orderService.updateOrderStatus(updateOptions);
        expect(result).toBeInstanceOf(OrderEntity);
        expect(result.id).toEqual(order.id);
        expect(result.status).toEqual(OrderStatus.REJECTED);
        expect(result.rejectReason).toEqual('Reason');
      }
    });

    it('should throw bad input error if order not in pending status', async () => {
      const order = await orderRepository.findOne({where: {phoneNumber: '1234567890'}});
      if(order!==null){
        const updateOptions = {
          id: order.id,
          orderStatus: OrderStatus.CANCELED,
        };
        order.status = OrderStatus.APPROVED;
        await orderRepository.save(order);
        try{
          await orderService.updateOrderStatus(updateOptions);
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toEqual(Error(ErrorMessage.BAD_INPUT));
        }
      }
    });

    it('should update order status from approved to ready', async () => {
      const order = await orderRepository.findOne({where: {phoneNumber: '1234567890'}});
      if(order!==null){
        const updateOptions = {
          id: order.id,
          orderStatus: OrderStatus.READY,
        };
        order.status = OrderStatus.APPROVED;
        await orderRepository.save(order);
        const result = await orderService.updateOrderStatus(updateOptions);
        expect(result).toBeInstanceOf(OrderEntity);
        expect(result.id).toEqual(order.id);
        expect(result.status).toEqual(OrderStatus.READY);
      }
    });

    it('should throw bad input error if order not in ready status', async () => {
      const order = await orderRepository.findOne({where: {phoneNumber: '1234567890'}});
      if(order!==null){
        const updateOptions = {
          id: order.id,
          orderStatus: OrderStatus.READY,
        };
        try{
          await orderService.updateOrderStatus(updateOptions);
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toEqual(Error(ErrorMessage.BAD_INPUT));
        }
      }
    });

    it('should update order status from ready to delivered', async () => {
      const order = await orderRepository.findOne({where: {phoneNumber: '1234567890'}});
      if(order!==null){
        const updateOptions = {
          id: order.id,
          orderStatus: OrderStatus.DELIVERED,
        };
        order.status = OrderStatus.READY;
        await orderRepository.save(order);
        const result = await orderService.updateOrderStatus(updateOptions);
        expect(result).toBeInstanceOf(OrderEntity);
        expect(result.id).toEqual(order.id);
        expect(result.status).toEqual(OrderStatus.DELIVERED);
      }
    });

    it('should throw bad input error if order not in ready status', async () => {
      const order = await orderRepository.findOne({where: {phoneNumber: '1234567890'}});
      if(order!==null){
        const updateOptions = {
          id: order.id,
          orderStatus: OrderStatus.DELIVERED,
        };
        try{
          await orderService.updateOrderStatus(updateOptions);
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toEqual(Error(ErrorMessage.BAD_INPUT));
        }
      }
    });

    it('should update order status from delivered to completed', async () => {
      const order = await orderRepository.findOne({where: {phoneNumber: '1234567890'}});
      if(order!==null){
        const updateOptions = {
          id: order.id,
          orderStatus: OrderStatus.COMPLETED,
        };
        order.status = OrderStatus.DELIVERED;
        await orderRepository.save(order);
        const result = await orderService.updateOrderStatus(updateOptions);
        expect(result).toBeInstanceOf(OrderEntity);
        expect(result.id).toEqual(order.id);
        expect(result.status).toEqual(OrderStatus.COMPLETED);
        expect(result.paymentStatus).toEqual(PaymentStatus.COMPLETE);
      }
    });

    it('should throw bad input error if order not in delivered', async () => {
      const order = await orderRepository.findOne({where: {phoneNumber: '1234567890'}});
      if(order!==null){
        const updateOptions = {
          id: order.id,
          orderStatus: OrderStatus.COMPLETED,
        };
        try{
          await orderService.updateOrderStatus(updateOptions);
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toEqual(Error(ErrorMessage.BAD_INPUT));
        }
      }
    });
  });

  describe('updateOrderStore', () => {
    beforeEach(async () => {
      const products = await productRepository.find();
      await Promise.all(
        products.map(async (product) => {
          await cartService.addToCart(createdUser, product.id);
        }),
      );
      const req = {} as Request;
      const res = {
        render: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;
      const createOptions: CreateOrderDto = {
        orderType: OrderType.DELIVERY,
        paymentType: PaymentType.COD,
        address: 'Test address',
        phoneNumber: '1234567890',
        note: 'Test note',
      };

      await orderService.createOrder(req, res, createdUser, createOptions);
    });

    afterEach(async () => {
      const queryRunner = AppDataSource.createQueryRunner();

      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
        await queryRunner.query('TRUNCATE TABLE `payment`');
        await queryRunner.query('TRUNCATE TABLE `order_product`');
        await queryRunner.query('TRUNCATE TABLE `order`');
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    });

    it('should throw store not found error', async () => {
      const order = await orderRepository.findOne({where: {phoneNumber: '1234567890'}});
      const store = await storeRepository.findOne({where:{id: 10000}});
      if(order!==null && store===null){
        const updateOptions = {
          orderId: order.id,
          storeId: 10000,
        };
        try{
          await orderService.updateOrderStore(updateOptions);
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toEqual(Error(ErrorMessage.STORE_NOT_FOUND));
        }
      }
    });

    it('should throw bad input error', async () => {
      const order = await orderRepository.findOne({where: {id: 10000}});
      const store = await storeRepository.findOne({where:{name: 'KFC Đường Nguyễn Xí'}});
      if(order===null && store!==null){
        const updateOptions = {
          orderId: 10000,
          storeId: store.id,
        };
        try{
          await orderService.updateOrderStore(updateOptions);
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toEqual(Error(ErrorMessage.BAD_INPUT));
        }
      }
    });

    it('should throw bad input error', async () => {
      const order = await orderRepository.findOne({where: {phoneNumber: '1234567890'}});
      const store = await storeRepository.findOne({where:{name: 'KFC Đường Nguyễn Xí'}});
      if(order!==null && store!==null){
        const updateOptions = {
          orderId: order.id,
          storeId: store.id,
        };
        order.status = OrderStatus.APPROVED;
        await orderRepository.save(order);
        try{
          await orderService.updateOrderStore(updateOptions);
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toEqual(Error(ErrorMessage.BAD_INPUT));
        }
      }
    });

    it('should update order store successfully', async () => {
      const order = await orderRepository.findOne({
        where: {phoneNumber: '1234567890'},
      });
      const store = await storeRepository.findOne({
        where:{name: 'KFC Đường Nguyễn Xí'},
      });
      if(order!==null && store!==null){
        const updateOptions = {
          orderId: order.id,
          storeId: store.id,
        };
        await orderService.updateOrderStore(updateOptions);
        const updatedOrder = await orderRepository.findOne({
          where: {id: order.id},
          relations: ['store'],
        });
        if(updatedOrder!==null){
          expect(updatedOrder.store.id).toEqual(store.id);
        }
      }
    });
  });

  describe('getUserOrderNumber', () => {
    beforeEach(async () => {
      const products = await productRepository.find();
      await Promise.all(
        products.map(async (product) => {
          await cartService.addToCart(createdUser, product.id);
        }),
      );
      const req = {} as Request;
      const res = {
        render: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;
      const createOptions: CreateOrderDto = {
        orderType: OrderType.DELIVERY,
        paymentType: PaymentType.COD,
        address: 'Test address',
        phoneNumber: '1234567890',
        note: 'Test note',
      };

      await orderService.createOrder(req, res, createdUser, createOptions);
    });

    afterEach(async () => {
      const queryRunner = AppDataSource.createQueryRunner();

      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
        await queryRunner.query('TRUNCATE TABLE `payment`');
        await queryRunner.query('TRUNCATE TABLE `order_product`');
        await queryRunner.query('TRUNCATE TABLE `order`');
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    });

    it('should return user order number', async () => {
      const result = await orderService.getUserOrderNumber(createdUser.id);
      expect(result).toEqual(1);
    });

    it('should return user order number', async () => {
      const result = await orderService.getUserOrderNumber(
        createdUser.id,
        OrderStatus.PENDING,
      );
      expect(result).toEqual(1);
    });

    it('should return user order number', async () => {
      const result = await orderService.getUserOrderNumber(
        createdUser.id,
        OrderStatus.APPROVED,
      );
      expect(result).toEqual(0);
    });
  });

  describe('getStoreOrderNumber', () => {
    beforeAll(async () => {
      const products = await productRepository.find();
      await Promise.all(
        products.map(async (product) => {
          await cartService.addToCart(createdUser, product.id);
        }),
      );
      const store = await storeRepository.findOne({
        where: {name: 'KFC Đường Nguyễn Xí'},
      });
      const req = {} as Request;
      const res = {
        render: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;
      const createOptions: CreateOrderDto = {
        orderType: OrderType.DELIVERY,
        paymentType: PaymentType.COD,
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
        await queryRunner.query('TRUNCATE TABLE `payment`');
        await queryRunner.query('TRUNCATE TABLE `order_product`');
        await queryRunner.query('TRUNCATE TABLE `order`');
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    });

    it('should return store order number', async () => {
      const store = await storeRepository.findOne({
        where: {name: 'KFC Đường Nguyễn Xí'},
      });
      if(store!==null) {
        const result = await orderService.getStoreOrderNumber(store.id);
        expect(result).toEqual(1);
      }
    });

    it('should return store order number', async () => {
      const store = await storeRepository.findOne({
        where: {name: 'KFC Đường Nguyễn Xí'},
      });
      if(store!==null) {
        const result = await orderService.getStoreOrderNumber(
          store.id,
          OrderStatus.APPROVED,
        );
        expect(result).toEqual(0);
      }
    });

    it('should return store order number', async () => {
      const store = await storeRepository.findOne({
        where: {name: 'KFC Đường Xô Viết Nghệ Tĩnh'},
      });
      if(store!==null) {
        const result = await orderService.getStoreOrderNumber(store.id);
        expect(result).toEqual(0);
      }
    });
  });

  describe('getNumberOfOrderByStatus', () => {
    beforeAll(async () => {
      const products = await productRepository.find();
      await Promise.all(
        products.map(async (product) => {
          await cartService.addToCart(createdUser, product.id);
        }),
      );
      const store = await storeRepository.findOne({
        where: {name: 'KFC Đường Nguyễn Xí'},
      });
      const req = {} as Request;
      const res = {
        render: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;
      const createOptions: CreateOrderDto = {
        orderType: OrderType.DELIVERY,
        paymentType: PaymentType.COD,
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
        await queryRunner.query('TRUNCATE TABLE `payment`');
        await queryRunner.query('TRUNCATE TABLE `order_product`');
        await queryRunner.query('TRUNCATE TABLE `order`');
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    });

    it('should return number of order by status', async () => {
      const result = await orderService.getNumberOfOrderByStatus();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toBeInstanceOf(OrderNumberByStatusDto);
    });
  });

  describe('getNumberOfOrderByPaymentStatus', () => {
    beforeAll(async () => {
      const products = await productRepository.find();
      await Promise.all(
        products.map(async (product) => {
          await cartService.addToCart(createdUser, product.id);
        }),
      );
      const store = await storeRepository.findOne({
        where: {name: 'KFC Đường Nguyễn Xí'},
      });
      const req = {} as Request;
      const res = {
        render: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;
      const createOptions: CreateOrderDto = {
        orderType: OrderType.DELIVERY,
        paymentType: PaymentType.COD,
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
        await queryRunner.query('TRUNCATE TABLE `payment`');
        await queryRunner.query('TRUNCATE TABLE `order_product`');
        await queryRunner.query('TRUNCATE TABLE `order`');
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    });

    it('should return number of order by payment status', async () => {
      const result = await orderService.getNumberOfOrderByPaymentStatus();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toBeInstanceOf(OrderNumberByPaymentStatusDto);
    });
  });

  describe('getNumberOfOrderByStore', () => {
    beforeAll(async () => {
      const products = await productRepository.find();
      await Promise.all(
        products.map(async (product) => {
          await cartService.addToCart(createdUser, product.id);
        }),
      );
      const store = await storeRepository.findOne({
        where: {name: 'KFC Đường Nguyễn Xí'},
      });
      const req = {} as Request;
      const res = {
        render: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;
      const createOptions: CreateOrderDto = {
        orderType: OrderType.DELIVERY,
        paymentType: PaymentType.COD,
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
        await queryRunner.query('TRUNCATE TABLE `payment`');
        await queryRunner.query('TRUNCATE TABLE `order_product`');
        await queryRunner.query('TRUNCATE TABLE `order`');
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    });

    it('should return number of order by store', async () => {
      const result = await orderService.getNumberOfOrderByStore();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toBeInstanceOf(OrderNumberByStoreDto);
    });
  });

  describe('getRevenue', () => {
    beforeAll(async () => {
      const products = await productRepository.find();
      await Promise.all(
        products.map(async (product) => {
          await cartService.addToCart(createdUser, product.id);
        }),
      );
      const store = await storeRepository.findOne({
        where: {name: 'KFC Đường Nguyễn Xí'},
      });
      const req = {} as Request;
      const res = {
        render: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;
      const createOptions: CreateOrderDto = {
        orderType: OrderType.DELIVERY,
        paymentType: PaymentType.COD,
        address: 'Test address',
        phoneNumber: '1234567890',
        note: 'Test note',
        storeId: store?.id,
      };

      await orderService.createOrder(req, res, createdUser, createOptions);
      const orders = await orderRepository.find();
      if(orders.length>0){
        orders[0].paymentStatus = PaymentStatus.COMPLETE;
        await orderRepository.save(orders[0]);
      }
    });

    afterAll(async () => {
      const queryRunner = AppDataSource.createQueryRunner();

      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
        await queryRunner.query('TRUNCATE TABLE `payment`');
        await queryRunner.query('TRUNCATE TABLE `order_product`');
        await queryRunner.query('TRUNCATE TABLE `order`');
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    });

    it('should return revenue analysis data', async () => {
      const options = {
        interval: Interval.DAY,
      };
      const result = await orderService.getRevenue(options);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toBeInstanceOf(RevenueAnalysis);
    });

    it('should return revenue analysis data by store', async () => {
      const store = await storeRepository.findOne({
        where: {name: 'KFC Đường Nguyễn Xí'},
      });
      if(store !== null) {
        const options = {
          interval: Interval.DAY,
          storeId: store.id,
        };
        const result = await orderService.getRevenue(options);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toBeInstanceOf(RevenueAnalysis);
      }
    });

    it('should return revenue analysis filter by date', async () => {
      const currentDate = new Date();
      const options = {
        interval: Interval.DAY,
        startDate: new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000),
      };
      const result = await orderService.getRevenue(options);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toBeInstanceOf(RevenueAnalysis);
    });
  });

  describe('getStoreRevenue', () => {
    beforeAll(async () => {
      const products = await productRepository.find();
      await Promise.all(
        products.map(async (product) => {
          await cartService.addToCart(createdUser, product.id);
        }),
      );
      const store = await storeRepository.findOne({
        where: {name: 'KFC Đường Nguyễn Xí'},
      });
      const req = {} as Request;
      const res = {
        render: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;
      const createOptions: CreateOrderDto = {
        orderType: OrderType.DELIVERY,
        paymentType: PaymentType.COD,
        address: 'Test address',
        phoneNumber: '1234567890',
        note: 'Test note',
        storeId: store?.id,
      };

      await orderService.createOrder(req, res, createdUser, createOptions);
      const orders = await orderRepository.find();
      if(orders.length>0){
        orders[0].paymentStatus = PaymentStatus.COMPLETE;
        await orderRepository.save(orders[0]);
      }
    });

    afterAll(async () => {
      const queryRunner = AppDataSource.createQueryRunner();

      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
        await queryRunner.query('TRUNCATE TABLE `payment`');
        await queryRunner.query('TRUNCATE TABLE `order_product`');
        await queryRunner.query('TRUNCATE TABLE `order`');
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    });

    it('should return store revenue analysis data', async () => {
      const currentDate = new Date();
      const options = {
        interval: Interval.DAY,
        startDate: new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000),
      };
      const result = await orderService.getStoreRevenue(options);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toBeInstanceOf(StoreRevenueAnalysis);
    });

    it('should return store revenue analysis data', async () => {
      const currentDate = new Date();
      const options = {
        interval: Interval.DAY,
        startDate: new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
      };
      const result = await orderService.getStoreRevenue(options);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toBeInstanceOf(StoreRevenueAnalysis);
    });
  });

  describe('getProductAnalysis', () => {
    beforeAll(async () => {
      const products = await productRepository.find();
      await Promise.all(
        products.map(async (product) => {
          await cartService.addToCart(createdUser, product.id);
        }),
      );
      const store = await storeRepository.findOne({
        where: {name: 'KFC Đường Nguyễn Xí'},
      });
      const req = {} as Request;
      const res = {
        render: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;
      const createOptions: CreateOrderDto = {
        orderType: OrderType.DELIVERY,
        paymentType: PaymentType.COD,
        address: 'Test address',
        phoneNumber: '1234567890',
        note: 'Test note',
        storeId: store?.id,
      };

      await orderService.createOrder(req, res, createdUser, createOptions);
      const orders = await orderRepository.find();
      if(orders.length>0){
        orders[0].paymentStatus = PaymentStatus.COMPLETE;
        await orderRepository.save(orders[0]);
      }
    });

    afterAll(async () => {
      const queryRunner = AppDataSource.createQueryRunner();

      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
        await queryRunner.query('TRUNCATE TABLE `payment`');
        await queryRunner.query('TRUNCATE TABLE `order_product`');
        await queryRunner.query('TRUNCATE TABLE `order`');
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    });

    it('should return product analysis data', async () => {
      const currentDate = new Date();
      const options = {
        interval: Interval.DAY,
        startDate: new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000),
      };
      const result = await orderService.getProductAnalysis(options);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toBeInstanceOf(ProductAnalysis);
    });

    it('should return product analysis data', async () => {
      const currentDate = new Date();
      const options = {
        interval: Interval.DAY,
        startDate: new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
      };
      const result = await orderService.getProductAnalysis(options);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toBeInstanceOf(ProductAnalysis);
    });

    it('should return product analysis data', async () => {
      const store = await storeRepository.findOne({
        where: {name: 'KFC Đường Nguyễn Xí'},
      });
      const currentDate = new Date();
      const options = {
        interval: Interval.DAY,
        startDate: new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        storeId: store?.id,
      };
      const result = await orderService.getProductAnalysis(options);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toBeInstanceOf(ProductAnalysis);
    });

    it('should return product analysis data', async () => {
      const store = await storeRepository.findOne({
        where: {name: 'KFC Đường Nguyễn Xí'},
      });
      const category = await categoryRepository.findOne({
        where: {name: 'COMBO 1 NGƯỜI'},
      });
      const currentDate = new Date();
      const options = {
        interval: Interval.DAY,
        startDate: new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        storeId: store?.id,
        categoryId: category?.id,
      };
      const result = await orderService.getProductAnalysis(options);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toBeInstanceOf(ProductAnalysis);
    });
  });
});
