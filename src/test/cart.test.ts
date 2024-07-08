import { CART_MAX_QUANTITY, Error } from '../constants';
import { AppDataSource } from '../config/ormConfig';
import { Repository } from 'typeorm';
import { CartProductEntity } from '../entities/cartProduct.entity';
import { UserEntity } from '../entities/user.entity';
import { ProductEntity } from '../entities/product.entity';
import { CategoryEntity } from '../entities/category.entity';
import { CartService } from '../services/cart.service';

describe('CartService', () => {
  let cartService: CartService;
  let cartProductRepository: Repository<CartProductEntity>;
  let categoryRepository: Repository<CategoryEntity>;
  let userRepository: Repository<UserEntity>;
  let productRepository: Repository<ProductEntity>;
  let createdUser: UserEntity;

  beforeAll(async () => {
    await AppDataSource.initialize();
    cartService = new CartService();
    cartProductRepository = AppDataSource.getRepository(CartProductEntity);
    categoryRepository = AppDataSource.getRepository(CategoryEntity);
    userRepository = AppDataSource.getRepository(UserEntity);
    productRepository = AppDataSource.getRepository(ProductEntity);
    await categoryRepository.insert([
      {
        name: 'COMBO 1 NGƯỜI',
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
    createdUser = await userRepository.save(user);
  });

  afterAll(async () => {
    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
      await queryRunner.query('TRUNCATE TABLE `product_category`');
      await queryRunner.query('TRUNCATE TABLE `category`');
      await queryRunner.query('TRUNCATE TABLE `cart_product`');
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

  describe('addToCart', () => {
    it('should return error if id is invalid', async () => {
      const product = await productRepository.findOne({ where: { id: 10000 } });
      if (product === null) {
        const result = await cartService.addToCart(createdUser, 10000);
        expect(result).toEqual(Error.PRODUCT_NOT_FOUND);
      }
    });

    it('should add product to user cart', async () => {
      const product = await productRepository.findOne({
        where: { name: 'Combo Gà Rán 1' },
      });
      if (product !== null) {
        const result = await cartService.addToCart(createdUser, product.id);
        expect(result).toBeInstanceOf(CartProductEntity);
        if (result instanceof CartProductEntity) {
          expect(result.quantity).toEqual(1);
          expect(result.user.id).toEqual(createdUser.id);
          expect(result.product.id).toEqual(product.id);
        }
      }
    });

    it('should increase cart product quantity by 1', async () => {
      const product = await productRepository.findOne({
        where: { name: 'Combo Gà Rán 1' },
      });
      if (product !== null) {
        const result = await cartService.addToCart(createdUser, product.id);
        expect(result).toBeInstanceOf(CartProductEntity);
        if (result instanceof CartProductEntity) {
          expect(result.quantity).toEqual(2);
          expect(result.user.id).toEqual(createdUser.id);
          expect(result.product.id).toEqual(product.id);
        }
      }
    });
  });

  describe('getCartProducts', () => {
    it('should return list of CartProductEntity', async () => {
      const result = await cartService.getCartProducts(createdUser);
      expect(result.length).toEqual(1);
      expect(result[0]).toBeInstanceOf(CartProductEntity);
    });
  });

  describe('orderValue', () => {
    it('should return order value', async () => {
      const cartProducts = await cartService.getCartProducts(createdUser);
      const result = cartService.orderValue(cartProducts, 10000);
      expect(result).toEqual(128000);
    });
  });

  describe('updateCartProduct', () => {
    it('should return false', async () => {
      const cartProduct = await cartProductRepository.findOne({
        where: { id: 10000 },
      });
      if (cartProduct === null) {
        const result = await cartService.updateCartProduct(10000, 2);
        expect(result).toEqual(false);
      }
    });

    it('should update cart product quantity', async () => {
      const cartProducts = await cartService.getCartProducts(createdUser);
      if (cartProducts.length > 0) {
        const result = await cartService.updateCartProduct(
          cartProducts[0].id,
          10,
        );
        expect(result).toEqual(true);
        const cartProduct = await cartProductRepository.findOne({
          where: { id: cartProducts[0].id },
        });
        if (cartProduct !== null) {
          expect(cartProduct.quantity).toEqual(10);
        }
      }
    });

    it('should return error string', async () => {
      const cartProducts = await cartService.getCartProducts(createdUser);
      if (cartProducts.length > 0) {
        const result = await cartService.updateCartProduct(
          cartProducts[0].id,
          CART_MAX_QUANTITY + 1,
        );
        expect(result).toEqual(Error.EXCEEDED_MAXIMUM_CART_QUANTITY);
      }
    });

    it('should delete cart product', async () => {
      const cartProducts = await cartService.getCartProducts(createdUser);
      if (cartProducts.length > 0) {
        const result = await cartService.updateCartProduct(
          cartProducts[0].id,
          -1,
        );
        expect(result).toEqual(true);
        const cartProduct = await cartProductRepository.findOne({
          where: { id: cartProducts[0].id },
        });
        expect(cartProduct).toBeNull();
      }
    });
  });

  describe('removeProductFromCart', () => {
    it('should remove product from cart', async () => {
      const product = await productRepository.findOne({
        where: { name: 'Combo Gà Rán 1' },
      });
      if (product !== null) {
        await cartService.addToCart(createdUser, product.id);
        await cartService.removeProductFromCart(createdUser);
        const cartProducts = await cartService.getCartProducts(createdUser);
        expect(cartProducts.length).toEqual(0);
      }
    });
  });

  describe('countCartItem', () => {
    it('should equal 0', async () => {
      const result = await cartService.countCartItem(createdUser);
      expect(result).toEqual(0);
    });

    it('should equal 2', async () => {
      const products = await productRepository.find();
      if (products.length > 0) {
        await Promise.all(
          products.map(async (product) => {
            await cartService.addToCart(createdUser, product.id);
          }),
        );
        const result = await cartService.countCartItem(createdUser);
        expect(result).toEqual(2);
      }
    });
  });
});
