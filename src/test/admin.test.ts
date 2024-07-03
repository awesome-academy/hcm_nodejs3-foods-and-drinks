import { AdminService } from './../services/admin.service';
import { AdminEntity } from '../entities/admin.entity';
import { Error } from '../constants';
import { AppDataSource } from '../config/ormConfig';
import { LoginDto } from '../commons/dtos/login.dto';
import { Repository } from 'typeorm';
import bcryptjs from 'bcryptjs';

jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let adminService: AdminService;
  let adminRepository: Repository<AdminEntity>;
  let createdAdmin: AdminEntity;

  beforeAll(async () => {
    await AppDataSource.initialize();
    adminService = new AdminService();
    adminRepository = AppDataSource.getRepository(AdminEntity);
    const admin = adminRepository.create({
      userName: 'admin',
      email: 'admin@gmail.com',
    });
    const salt = await bcryptjs.genSalt(10);
    admin.password = await bcryptjs.hash('12345678', salt);
    createdAdmin = await adminRepository.save(admin);
  });

  afterAll(async () => {
    await adminRepository.delete({ userName: 'admin' });
    await AppDataSource.destroy();
  });

  describe('adminLogin', () => {
    it('should return invalid credential error if admin is not found or password does not match', async () => {
      const loginDto: LoginDto = { userName: 'admin', password: '' };

      const result = await adminService.adminLogin(loginDto);
      expect(result).toBe(Error.INVALID_CREDENTIAL);
    });

    it('should return admin if credentials are valid', async () => {
      const loginDto: LoginDto = { userName: 'admin', password: '12345678' };

      const result = await adminService.adminLogin(loginDto);
      expect(result).toBeInstanceOf(AdminEntity);
      if (result instanceof AdminEntity) {
        expect(result.userName).toBe('admin');
      }
    });
  });

  describe('findById', () => {
    it('should return admin if id is valid', async () => {
      const result = await adminService.findById(createdAdmin.id);
      expect(result).toBeInstanceOf(AdminEntity);
      if (result instanceof AdminEntity) {
        expect(result.id).toBe(createdAdmin.id);
      }
    });

    it('should return null if admin is not found', async () => {
      const nonExistentAdminId = createdAdmin.id + 1000;
      const result = await adminService.findById(nonExistentAdminId);
      expect(result).toBeNull();
    });
  });

  describe('getAdminDashboardCommonData', () => {
    it('should return the correct admin dashboard common data', async () => {
      const result = await adminService.getAdminDashboardCommonData();

      expect(result.totalOrder).toBe(0);
      expect(result.totalProduct).toBe(0);
      expect(result.totalUser).toBe(0);
      expect(result.totalStore).toBe(0);
      expect(result.totalCategory).toBe(0);
      expect(result.totalRevenue).toBe(0);
    });
  });
});
