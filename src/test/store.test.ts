import { Error, Order } from '../constants';
import { AppDataSource } from '../config/ormConfig';
import { Repository } from 'typeorm';
import { StoreService } from '../services/store.service';
import { StoreEntity } from '../entities/store.entity';

describe('StoreService', () => {
  let storeService: StoreService;
  let storeRepository: Repository<StoreEntity>;

  beforeAll(async () => {
    await AppDataSource.initialize();
    storeService = new StoreService();
    storeRepository = AppDataSource.getRepository(StoreEntity);
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

  describe('findOneById', () => {
    it('should return StoreEntity if id is valid', async () => {
      const store = await storeRepository.findOne({
        where: { name: 'KFC Đường Nguyễn Xí' },
      });
      if (store) {
        const result = await storeService.findOneById(store.id);
        expect(result).toBeInstanceOf(StoreEntity);
        if (result instanceof StoreEntity) {
          expect(result.id).toBe(store.id);
        }
      }
    });

    it('should return null if admin is not found', async () => {
      const store = await storeRepository.findOne({
        where: { id: 10000 },
      });
      if (store === null) {
        const result = await storeService.findOneById(10000);
        expect(result).toBeNull();
      }
    });
  });

  describe('getAllStores', () => {
    it('should return all stores', async () => {
      const result = await storeService.getAllStores();
      expect(result.length).toEqual(2);
      expect(result[0]).toBeInstanceOf(StoreEntity);
    });
  });

  describe('getStorePage', () => {
    it('should return store page and page meta', async () => {
      const pageOptions = {
        order: Order.ASC,
        page: 1,
        take: 10,
        skip: 0,
      };
      const result = await storeService.getStorePage(pageOptions);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0]).toBeInstanceOf(StoreEntity);
      expect(result.meta).toEqual({
        page: 1,
        take: 10,
        itemCount: 2,
        pageCount: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      });
    });

    it('should return store page matching keyword and page meta', async () => {
      const pageOptions = {
        keyword: 'Nguyễn Xí',
        order: Order.ASC,
        page: 1,
        take: 10,
        skip: 0,
      };
      const result = await storeService.getStorePage(pageOptions);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0]).toBeInstanceOf(StoreEntity);
      expect(result.meta).toEqual({
        page: 1,
        take: 10,
        itemCount: 1,
        pageCount: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      });
    });
  });

  describe('createNewStore', () => {
    it('should create and return new store', async () => {
      const createOptions = {
        name: 'KFC Giga Mall 2',
        address: '240-242 Kha Vạn Cân, Hiệp Bình Chánh, Thủ Đức, Hồ Chí Minh',
        phoneNumber: '0123456789',
      };
      const result = await storeService.createNewStore(createOptions);
      expect(result).toBeInstanceOf(StoreEntity);
      expect(result.name).toEqual('KFC Giga Mall 2');
    });
  });

  describe('updateStore', () => {
    it('should update store data and return StoreEntity', async () => {
      const store = await storeRepository.findOne({
        where: { name: 'KFC Giga Mall 2' },
      });
      if (store !== null) {
        const updateOptions = {
          id: store.id,
          name: 'KFC Giga Mall 2',
          address: '240-242 Kha Vạn Cân, Hiệp Bình Chánh, Thủ Đức, Hồ Chí Minh',
          phoneNumber: '9876543210',
        };
        const result = await storeService.updateStore(updateOptions);
        expect(result).toBeInstanceOf(StoreEntity);
        expect(result.phoneNumber).toEqual('9876543210');
      }
    });

    it('should throw store not found if id is invalid', async () => {
      const store = await storeRepository.findOne({
        where: { id: 10000 },
      });
      if (store === null) {
        const updateOptions = {
          id: 10000,
          name: 'KFC Giga Mall 2',
          address: '240-242 Kha Vạn Cân, Hiệp Bình Chánh, Thủ Đức, Hồ Chí Minh',
          phoneNumber: '9876543210',
        };
        try {
          await storeService.updateStore(updateOptions);
          // Fail the test if no error is thrown
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBe(Error.STORE_NOT_FOUND);
        }
      }
    });
  });

  describe('deleteStore', () => {
    it('should delete store', async () => {
      const storeToDelete = await storeRepository.findOne({
        where: { name: 'KFC Giga Mall 2' },
      });
      if (storeToDelete !== null) {
        await storeService.deleteStore(storeToDelete.id);
        const store = await storeRepository.findOne({
          where: { name: 'KFC Giga Mall 2' },
        });
        expect(store).toBeNull();
      }
    });
  });
});
