import { Error, Order, ProductSortField } from '../constants';
import { AppDataSource } from '../config/ormConfig';
import { Repository } from 'typeorm';
import { CategoryEntity } from '../entities/category.entity';
import { ProductEntity } from '../entities/product.entity';
import { ProductService } from '../services/product.service';
import { UserEntity } from '../entities/user.entity';
import { OrderEntity } from '../entities/order.entity';
import { OrderProductEntity } from '../entities/orderProduct.entity';
import { PageDto } from '../commons/dtos/page.dto';
import { ProductSaleNumberDto } from '../commons/dtos/ProductSaleNumber.dto';

describe('ProductService', () => {
  let productService: ProductService;
  let categoryRepository: Repository<CategoryEntity>;
  let productRepository: Repository<ProductEntity>;
  let userRepository: Repository<UserEntity>;
  let orderRepository: Repository<OrderEntity>;
  let orderProductRepository: Repository<OrderProductEntity>;

  beforeAll(async () => {
    await AppDataSource.initialize();
    productService = new ProductService();
    categoryRepository = AppDataSource.getRepository(CategoryEntity);
    productRepository = AppDataSource.getRepository(ProductEntity);
    userRepository = AppDataSource.getRepository(UserEntity);
    orderRepository = AppDataSource.getRepository(OrderEntity);
    orderProductRepository = AppDataSource.getRepository(OrderProductEntity);
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
    const firstCategory = await categoryRepository.findOne({
      where: { name: 'COMBO 1 NGƯỜI' },
    });
    if (firstCategory !== null) {
      await productRepository.save({
        name: 'Combo Gà Rán 1',
        image:
          'https://static.kfcvietnam.com.vn/images/items/lg/D-CBO-CHICKEN-1.jpg?v=41P1nL',
        basePrice: 59000,
        currentPrice: 59000,
        description:
          '1 Miếng Gà + 1 Khoai Tây Chiên / 1 Khoai Tây Nghiền & Bắp Cải Trộn + 1 Pepsi (lớn)',
        categories: [firstCategory],
        cartProducts: [],
        feedbacks: [],
        orderProducts: [],
      });
      await productRepository.save({
        name: 'Combo Gà Rán 2',
        image:
          'https://static.kfcvietnam.com.vn/images/items/lg/D-CBO-CHICKEN-1.jpg?v=41P1nL',
        basePrice: 89000,
        currentPrice: 80000,
        description:
          '2 Miếng Gà + 1 Khoai Tây Chiên / 1 Khoai Tây Nghiền & Bắp Cải Trộn + 1 Pepsi (lớn)',
        categories: [firstCategory],
        cartProducts: [],
        feedbacks: [],
        orderProducts: [],
      });
    }
    const user = userRepository.create({
      userName: 'user01',
      email: 'user01@gmail.com',
      password: '',
      fullName: 'User Full Name',
    });
    const createdUser = await userRepository.save(user);
    const order = orderRepository.create({
      deliveryAddress: 'Address',
      shippingFee: 10000,
      total: 149000,
      user: createdUser,
    });
    const createdOrder = await orderRepository.save(order);
    const products = await productRepository.find();
    products.forEach(async (product) => {
      const orderProduct = orderProductRepository.create({
        quantity: 1,
        price: product.currentPrice,
        order: createdOrder,
        product,
      });
      await orderProductRepository.save(orderProduct);
    });
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
      await queryRunner.query('TRUNCATE TABLE `order`');
      await queryRunner.query('TRUNCATE TABLE `product`');
      await queryRunner.query('TRUNCATE TABLE `user`');
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

  describe('getDiscountProduct', () => {
    it('should return discount products', async () => {
      const result = await productService.getDiscountProduct();
      expect(result.length).toEqual(1);
      expect(result[0]).toBeInstanceOf(ProductEntity);
      expect(result[0].currentPrice).toBeLessThan(result[0].basePrice);
    });
  });

  describe('getNewProduct', () => {
    it('should return discount products', async () => {
      const result = await productService.getNewProduct();
      expect(result.length).toEqual(2);
      expect(result[0]).toBeInstanceOf(ProductEntity);
    });
  });

  describe('getProductsByCategory', () => {
    it('should return product by category', async () => {
      const result = await productService.getProductsByCategory();
      expect(result.length).toEqual(6);
      result.map((item) => {
        if (item.category === 'COMBO 1 NGƯỜI') {
          expect(item.products.length).toEqual(2);
          expect(item.products[0]).toBeInstanceOf(ProductEntity);
        } else {
          expect(item.products.length).toEqual(0);
        }
      });
    });
  });

  describe('getProductDetail', () => {
    it('should return ProductEntity', async () => {
      const product = await productRepository.findOne({
        where: {
          name: 'Combo Gà Rán 1',
        },
      });
      if (product !== null) {
        const result = await productService.getProductDetail(product.id);
        expect(result).toBeInstanceOf(ProductEntity);
        expect(result?.name).toEqual('Combo Gà Rán 1');
      }
    });

    it('should return null if id is invalid', async () => {
      const product = await productRepository.findOne({
        where: {
          id: 10000,
        },
      });
      if (product === null) {
        const result = await productService.getProductDetail(10000);
        expect(result).toBeNull();
      }
    });
  });

  describe('getProductPage', () => {
    it('should return product page and page meta with no filters', async () => {
      const pageOptions = {
        page: 1,
        order: Order.ASC,
        sortField: ProductSortField.PRICE,
        skip: 0,
        take: 10,
      };
      const result = await productService.getProductPage(pageOptions);
      expect(result).toBeInstanceOf(PageDto<ProductEntity>);
      expect(result.data.length).toBeGreaterThanOrEqual(0); // Expect some products or none
    });

    it('should return product page and page meta with minPrice filter', async () => {
      const pageOptions = {
        page: 1,
        order: Order.ASC,
        sortField: ProductSortField.PRICE,
        skip: 0,
        take: 10,
        minPrice: 50000,
      };
      const result = await productService.getProductPage(pageOptions);
      expect(result).toBeInstanceOf(PageDto<ProductEntity>);
      result.data.forEach(product => {
        expect(product.currentPrice).toBeGreaterThanOrEqual(50000);
      });
    });

    it('should return product page and page meta with maxPrice filter', async () => {
      const pageOptions = {
        page: 1,
        order: Order.ASC,
        sortField: ProductSortField.PRICE,
        skip: 0,
        take: 10,
        maxPrice: 100000,
      };
      const result = await productService.getProductPage(pageOptions);
      expect(result).toBeInstanceOf(PageDto<ProductEntity>);
      result.data.forEach(product => {
        expect(product.currentPrice).toBeLessThanOrEqual(100000);
      });
    });

    it('should return product page and page meta with rating filter', async () => {
      const pageOptions = {
        page: 1,
        order: Order.ASC,
        sortField: ProductSortField.RATING,
        skip: 0,
        take: 10,
        rating: 4,
      };
      const result = await productService.getProductPage(pageOptions);
      expect(result).toBeInstanceOf(PageDto<ProductEntity>);
      result.data.forEach(product => {
        expect(product.averageRating).toBeGreaterThanOrEqual(4);
      });
    });

    it('should return product page and page meta with keyword filter', async () => {
      const pageOptions = {
        page: 1,
        order: Order.ASC,
        sortField: ProductSortField.PRICE,
        skip: 0,
        take: 10,
        keyword: 'combo',
      };
      const result = await productService.getProductPage(pageOptions);
      expect(result).toBeInstanceOf(PageDto<ProductEntity>);
      result.data.forEach(product => {
        expect(product.name).toMatch(/combo/i);
      });
    });

    it('should return product page and page meta with onSale filter', async () => {
      const pageOptions = {
        page: 1,
        order: Order.ASC,
        sortField: ProductSortField.PRICE,
        skip: 0,
        take: 10,
        onSale: true,
      };
      const result = await productService.getProductPage(pageOptions);
      expect(result).toBeInstanceOf(PageDto<ProductEntity>);
      result.data.forEach(product => {
        expect(product.currentPrice).toBeLessThan(product.basePrice);
      });
    });

    it('should return product page and page meta with multiple filters', async () => {
      const category = await categoryRepository.findOne({ where: { name: 'COMBO 1 NGƯỜI' } });
      if (category) {
        const pageOptions = {
          page: 1,
          order: Order.ASC,
          sortField: ProductSortField.PRICE,
          skip: 0,
          take: 10,
          keyword: 'combo',
          onSale: true,
          categoryIds: [category.id],
          minPrice: 70000,
          maxPrice: 80000,
        };
        const result = await productService.getProductPage(pageOptions);
        expect(result).toBeInstanceOf(PageDto<ProductEntity>);
        expect(result.data.length).toBeGreaterThanOrEqual(0);
        result.data.forEach(product => {
          expect(product.currentPrice).toBeGreaterThanOrEqual(70000);
          expect(product.currentPrice).toBeLessThanOrEqual(80000);
          expect(product.categories.some(c => c.id === category.id)).toBeTruthy();
          expect(product.currentPrice).toBeLessThan(product.basePrice);
        });
      }
    });
  });

  describe('getAllCategories', () => {
    it('should return all categories', async () => {
      const result = await productService.getAllCategories();
      expect(result.length).toEqual(6);
      expect(result[0]).toBeInstanceOf(CategoryEntity);
    });
  });

  describe('createProduct', () => {
    it('should create and return new product', async () => {
      const category = await categoryRepository.findOne({
        where: {
          name: 'BURGER - CƠM - MÌ Ý',
        },
      });
      if (category !== null) {
        const createDto = {
          name: 'Burger Zinger',
          image:
            'https://static.kfcvietnam.com.vn/images/items/lg/Burger-Zinger.jpg?v=41P1nL',
          basePrice: 54000,
          currentPrice: 54000,
          description: '1 Burger Zinger',
          categoryId: category.id,
        };
        const result = await productService.createProduct(createDto);
        expect(result).toBeInstanceOf(ProductEntity);
        expect(result.name).toEqual('Burger Zinger');
        expect(result.categories[0].id).toEqual(category.id);
      }
    });

    it('should throw error if category not found', async () => {
      const category = await categoryRepository.findOne({
        where: {
          id: 10000,
        },
      });
      if (category === null) {
        const createDto = {
          name: 'Burger Zinger',
          image:
            'https://static.kfcvietnam.com.vn/images/items/lg/Burger-Zinger.jpg?v=41P1nL',
          basePrice: 54000,
          currentPrice: 54000,
          description: '1 Burger Zinger',
          categoryId: 10000,
        };
        try {
          await productService.createProduct(createDto);
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBe(Error.CATEGORY_NOT_FOUND);
        }
      }
    });
  });

  describe('saveProduct', () => {
    it('should save and return ProductEntity', async () => {
      const product = await productRepository.findOne({
        where: { name: 'Burger Zinger' },
      });
      if (product !== null) {
        product.basePrice = 60000;
        const result = await productService.saveProduct(product);
        expect(result).toBeInstanceOf(ProductEntity);
        expect(result.basePrice).toEqual(60000);
      }
    });
  });

  describe('updateProduct', () => {
    it('should update and return ProductEntity', async () => {
      const product = await productRepository.findOne({
        where: { name: 'Burger Zinger' },
        relations: ['categories'],
      });
      if (product !== null) {
        const updateDto = {
          name: 'Burger Zinger',
          image:
            'https://static.kfcvietnam.com.vn/images/items/lg/Burger-Zinger.jpg?v=41P1nL',
          basePrice: 54000,
          currentPrice: 54000,
          description: '1 Burger Zinger',
          categoryId: product.categories[0].id,
        };
        const result = await productService.updateProduct(product, updateDto);
        expect(result).toBeInstanceOf(ProductEntity);
        expect(result.basePrice).toEqual(54000);
      }
    });

    it('should throw error if category not found', async () => {
      const product = await productRepository.findOne({
        where: { name: 'Burger Zinger' },
      });
      const category = await categoryRepository.findOne({
        where: {
          id: 10000,
        },
      });
      if (product !== null && category === null) {
        const updateDto = {
          name: 'Burger Zinger',
          image:
            'https://static.kfcvietnam.com.vn/images/items/lg/Burger-Zinger.jpg?v=41P1nL',
          basePrice: 54000,
          currentPrice: 54000,
          description: '1 Burger Zinger',
          categoryId: 10000,
        };
        try {
          await productService.updateProduct(product, updateDto);
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBe(Error.CATEGORY_NOT_FOUND);
        }
      }
    });
  });

  describe('getCategoryProductNumber', () => {
    it('should return the number of products of the category', async () => {
      const category = await categoryRepository.findOne({
        where: { name: 'COMBO 1 NGƯỜI' },
      });
      if (category !== null) {
        const result = await productService.getCategoryProductNumber(
          category.id,
        );
        expect(result).toEqual(2);
      }
    });
  });

  describe('getTopPurchasedProduct', () => {
    it('should return top purchased products', async () => {
      const result = await productService.getTopPurchasedProduct(2);
      expect(result[0]).toBeInstanceOf(ProductSaleNumberDto);
      expect(result.length).toEqual(2);
    });
  });

  describe('getSuggestionProduct', () => {
    it('should return empty array if user is undefined', async () => {
      const result = await productService.getSuggestionProduct();
      expect(result.length).toEqual(0);
    });

    it('should return suggestion products', async () => {
      const user = await userRepository.findOne({
        where: { userName: 'user01' },
      });
      if (user !== null) {
        const result = await productService.getSuggestionProduct(user);
        expect(result.length).toEqual(2);
        expect(result[0]).toBeInstanceOf(ProductEntity);
      }
    });
  });
});
