import { Error, Order } from '../constants';
import { AppDataSource } from '../config/ormConfig';
import { Repository } from 'typeorm';
import { CategoryService } from '../services/category.service';
import { CategoryEntity } from '../entities/category.entity';
import { ProductEntity } from '../entities/product.entity';

describe('CategoryService', () => {
  let categoryService: CategoryService;
  let categoryRepository: Repository<CategoryEntity>;
  let productRepository: Repository<ProductEntity>;

  beforeAll(async () => {
    await AppDataSource.initialize();
    categoryService = new CategoryService();
    categoryRepository = AppDataSource.getRepository(CategoryEntity);
    productRepository = AppDataSource.getRepository(ProductEntity);
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
      await queryRunner.query('TRUNCATE TABLE `product`');
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
    it('should return CategoryEntity if id is valid', async () => {
      const category = await categoryRepository.findOne({
        where: { name: 'COMBO 1 NGƯỜI' },
      });
      if (category) {
        const result = await categoryService.findOneById(category.id);
        expect(result).toBeInstanceOf(CategoryEntity);
        if (result instanceof CategoryEntity) {
          expect(result.id).toBe(category.id);
        }
      }
    });

    it('should return null if category is not found', async () => {
      const category = await categoryRepository.findOne({
        where: { id: 10000 },
      });
      if (category === null) {
        const result = await categoryService.findOneById(10000);
        expect(result).toBeNull();
      }
    });
  });

  describe('getAllCategories', () => {
    it('should return all categories', async () => {
      const result = await categoryService.getAllCategories();
      expect(result.length).toEqual(6);
      expect(result[0]).toBeInstanceOf(CategoryEntity);
    });
  });

  describe('getCategoryPage', () => {
    it('should return category page and page meta', async () => {
      const pageOptions = {
        order: Order.ASC,
        page: 1,
        take: 10,
        skip: 0,
      };
      const result = await categoryService.getCategoryPage(pageOptions);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0]).toBeInstanceOf(CategoryEntity);
      expect(result.meta).toEqual({
        page: 1,
        take: 10,
        itemCount: 6,
        pageCount: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      });
    });

    it('should return category page matching keyword and page meta', async () => {
      const pageOptions = {
        keyword: 'COMBO',
        order: Order.ASC,
        page: 1,
        take: 10,
        skip: 0,
      };
      const result = await categoryService.getCategoryPage(pageOptions);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0]).toBeInstanceOf(CategoryEntity);
      expect(result.meta).toEqual({
        page: 1,
        take: 10,
        itemCount: 2,
        pageCount: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      });
    });
  });

  describe('createCategory', () => {
    it('should create and return new category', async () => {
      const createOptions = {
        name: 'New category',
      };
      const result = await categoryService.createCategory(createOptions);
      expect(result).toBeInstanceOf(CategoryEntity);
      expect(result.name).toEqual('New category');
    });
  });

  describe('updateCategory', () => {
    it('should update category and return CategoryEntity', async () => {
      const category = await categoryRepository.findOne({
        where: { name: 'New category' },
      });
      if (category !== null) {
        const updateOptions = {
          name: 'Updated category',
        };
        const result = await categoryService.updateCategory(
          category,
          updateOptions,
        );
        expect(result).toBeInstanceOf(CategoryEntity);
        expect(result.name).toEqual('Updated category');
      }
    });
  });

  describe('deleteCategory', () => {
    it('should delete category', async () => {
      const categoryToDelete = await categoryRepository.findOne({
        where: { name: 'Updated category' },
      });
      if (categoryToDelete !== null) {
        await categoryService.deleteCategory(categoryToDelete.id);
        const category = await categoryRepository.findOne({
          where: { name: 'Updated category' },
        });
        expect(category).toBeNull();
      }
    });

    it('should throw error if category has products', async () => {
      const categoryToDelete = await categoryRepository.findOne({
        where: { name: 'COMBO 1 NGƯỜI' },
      });
      if (categoryToDelete !== null) {
        try {
          await categoryService.deleteCategory(categoryToDelete.id);
          // Fail the test if no error is thrown
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBe(Error.CANNOT_DELETE_CATEGORY);
        }
      }
    });
  });

  describe('getCategoryProductNumber', () => {
    it('should return category product number', async () => {
      const category = await categoryRepository.findOne({
        where: { name: 'COMBO 1 NGƯỜI' },
      });
      if (category !== null) {
        const result = await categoryService.getCategoryProductNumber(
          category.id,
        );
        expect(result).toEqual(1);
      }
    });
  });
});
