import { AppDataSource } from '../config/ormConfig';
import { Repository } from 'typeorm';
import { CategoryEntity } from '../entities/category.entity';
import { ProductEntity } from '../entities/product.entity';
import { UserEntity } from '../entities/user.entity';
import { FeedbackService } from '../services/feedback.service';
import { FeedbackEntity } from '../entities/feedback.entity';
import { Error, FeedbackSortField, Order } from '../constants';
import { updateFeedbackDto } from '../commons/dtos/updateFeedback.dto';
import { PageDto } from '../commons/dtos/page.dto';

describe('FeedbackService', () => {
  let feedbackService: FeedbackService;
  let feedbackRepository: Repository<FeedbackEntity>;
  let categoryRepository: Repository<CategoryEntity>;
  let productRepository: Repository<ProductEntity>;
  let userRepository: Repository<UserEntity>;
  let createdUser: UserEntity;

  beforeAll(async () => {
    await AppDataSource.initialize();
    feedbackService = new FeedbackService();
    feedbackRepository = AppDataSource.getRepository(FeedbackEntity);
    categoryRepository = AppDataSource.getRepository(CategoryEntity);
    productRepository = AppDataSource.getRepository(ProductEntity);
    userRepository = AppDataSource.getRepository(UserEntity);
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
  });

  afterAll(async () => {
    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
      await queryRunner.query('TRUNCATE TABLE `product_category`');
      await queryRunner.query('TRUNCATE TABLE `category`');
      await queryRunner.query('TRUNCATE TABLE `feedback`');
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

  describe('findOneById', () => {
    afterAll(async () => {
      const queryRunner = AppDataSource.createQueryRunner();

      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
        await queryRunner.query('TRUNCATE TABLE `feedback`');
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
      const feedback = await feedbackRepository.findOne({
        where: { id: 10000 },
      });
      if (feedback === null) {
        const result = await feedbackService.findOneById(10000);
        expect(result).toBeNull();
      }
    });

    it('should return feedbackEntity', async () => {
      const products = await productRepository.find();
      if (products.length > 0) {
        const feedback = feedbackRepository.create({
          star: 5,
          image: '',
          content: '',
          user: createdUser,
          product: products[0],
        });
        const createdFeedback = await feedbackRepository.save(feedback);
        const result = await feedbackService.findOneById(createdFeedback.id);
        expect(result).toBeInstanceOf(FeedbackEntity);
        if (result !== null) {
          expect(result.id).toEqual(createdFeedback.id);
        }
      }
    });

    it('should return feedbackEntity', async () => {
      const feedbacks = await feedbackRepository.find();
      if (feedbacks.length > 0) {
        const result = await feedbackService.findOneById(feedbacks[0].id);
        expect(result).toBeInstanceOf(FeedbackEntity);
        if (result !== null) {
          expect(result.id).toEqual(feedbacks[0].id);
        }
      }
    });
  });

  describe('findOneByUserAndProduct', () => {
    afterAll(async () => {
      const queryRunner = AppDataSource.createQueryRunner();

      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
        await queryRunner.query('TRUNCATE TABLE `feedback`');
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
      const product = await productRepository.findOne({
        where: { id: 10000 },
      });
      if (product === null) {
        const result = await feedbackService.findOneByUserAndProduct(
          createdUser.id,
          10000,
        );
        expect(result).toBeNull();
      }
    });

    it('should return feedbackEntity', async () => {
      const products = await productRepository.find();
      if (products.length > 0) {
        const feedback = feedbackRepository.create({
          star: 5,
          image: '',
          content: '',
          user: createdUser,
          product: products[0],
        });
        await feedbackRepository.save(feedback);
        const result = await feedbackService.findOneByUserAndProduct(
          createdUser.id,
          products[0].id,
        );
        expect(result).toBeInstanceOf(FeedbackEntity);
      }
    });
  });

  describe('createFeedback', () => {
    afterAll(async () => {
      const queryRunner = AppDataSource.createQueryRunner();

      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
        await queryRunner.query('TRUNCATE TABLE `feedback`');
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    });

    it('should throw product not found error', async () => {
      const product = await productRepository.findOne({
        where: { id: 10000 },
      });
      if (product === null) {
        const createOption = {
          productId: 10000,
          star: 5,
        };
        try {
          await feedbackService.createFeedback(createOption, createdUser);
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toEqual(Error.PRODUCT_NOT_FOUND);
        }
      }
    });

    it('should create and return FeedbackEntity', async () => {
      const products = await productRepository.find();
      if (products.length > 0) {
        const createOption = {
          productId: products[0].id,
          image: '',
          content: '',
          star: 5,
        };
        const result = await feedbackService.createFeedback(
          createOption,
          createdUser,
        );
        expect(result).toBeInstanceOf(FeedbackEntity);
        if (result !== null) {
          expect(result.star).toEqual(5);
        }
      }
    });

    it('should update exiting feedback and return FeedbackEntity', async () => {
      const products = await productRepository.find();
      if (products.length > 0) {
        const createOption = {
          productId: products[0].id,
          image: '',
          content: '',
          star: 4,
        };
        const result = await feedbackService.createFeedback(
          createOption,
          createdUser,
        );
        expect(result).toBeInstanceOf(FeedbackEntity);
        if (result !== null) {
          expect(result.star).toEqual(4);
        }
      }
    });
  });

  describe('update feedback', () => {
    beforeAll(async () => {
      const products = await productRepository.find();
      if (products.length > 0) {
        const feedback = feedbackRepository.create({
          star: 5,
          image: '',
          content: '',
          user: createdUser,
          product: products[0],
        });
        await feedbackRepository.save(feedback);
      }
    });

    afterAll(async () => {
      const queryRunner = AppDataSource.createQueryRunner();

      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
        await queryRunner.query('TRUNCATE TABLE `feedback`');
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    });

    it('should throw feedback not found error', async () => {
      const feedback = await feedbackRepository.findOne({
        where: { id: 10000 },
      });
      if (feedback === null) {
        const updateOption = {
          feedbackId: 10000,
          star: 4,
        };
        try {
          await feedbackService.updateFeedback(updateOption);
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toEqual(Error.FEEDBACK_NOT_FOUND);
        }
      }
    });

    it('should update and return FeedbackEntity', async () => {
      const feedback = await feedbackRepository.findOne({
        where: { star: 5 },
      });
      if (feedback !== null) {
        const updateOption = {
          feedbackId: feedback.id,
          star: 4,
        };
        const result = await feedbackService.updateFeedback(updateOption);
        expect(result).toBeInstanceOf(FeedbackEntity);
        if (result !== null) {
          expect(result.star).toEqual(4);
        }
      }
    });
  });

  describe('getFeedbackPage', () => {
    beforeAll(async () => {
      const products = await productRepository.find();
      if (products.length > 0) {
        const feedback = feedbackRepository.create({
          star: 4,
          image: 'image-url',
          content: 'content',
          user: createdUser,
          product: products[0],
        });
        await feedbackRepository.save(feedback);
      }
    });

    afterAll(async () => {
      const queryRunner = AppDataSource.createQueryRunner();

      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
        await queryRunner.query('TRUNCATE TABLE `feedback`');
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    });

    it('should return feedback page and page meta', async () => {
      const products = await productRepository.find();
      if (products.length > 0) {
        const pageOptions = {
          page: 1,
          take: 10,
          skip: 0,
          order: Order.ASC,
          sortField: FeedbackSortField.CREATED_AT,
          haveImage: true,
          haveContent: true,
          productId: products[0].id,
        };
        const result = await feedbackService.getFeedbackPage(pageOptions);
        expect(result).toBeInstanceOf(PageDto<FeedbackEntity>);
        expect(result.data.length).toBeGreaterThan(0);
      }
    });

    it('should return feedback page and page meta', async () => {
      const products = await productRepository.find();
      if (products.length > 0) {
        const pageOptions = {
          page: 1,
          take: 10,
          skip: 0,
          order: Order.ASC,
          sortField: FeedbackSortField.CREATED_AT,
          haveImage: true,
          haveContent: false,
          productId: products[0].id,
        };
        const result = await feedbackService.getFeedbackPage(pageOptions);
        expect(result).toBeInstanceOf(PageDto<FeedbackEntity>);
        expect(result.data.length).toBeGreaterThan(0);
      }
    });

    it('should return feedback page and page meta', async () => {
      const products = await productRepository.find();
      if (products.length > 0) {
        const pageOptions = {
          page: 1,
          take: 10,
          skip: 0,
          order: Order.ASC,
          sortField: FeedbackSortField.CREATED_AT,
          haveImage: false,
          haveContent: true,
          productId: products[0].id,
        };
        const result = await feedbackService.getFeedbackPage(pageOptions);
        expect(result).toBeInstanceOf(PageDto<FeedbackEntity>);
        expect(result.data.length).toBeGreaterThan(0);
      }
    });
  });
});
