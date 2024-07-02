import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { AdminEntity } from '../entities/admin.entity';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRE, Role } from '../constants';
import { AuthService } from '../services/auth.service';
import { AppDataSource } from '../config/ormConfig';

jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: Repository<UserEntity>;
  let adminRepository: Repository<AdminEntity>;

  beforeAll(async () => {
    await AppDataSource.initialize();
    authService = new AuthService();
    userRepository = AppDataSource.getRepository(UserEntity);
    adminRepository = AppDataSource.getRepository(AdminEntity);
    const newUser = userRepository.create({
      userName: 'testAccount',
      email: 'testEmail@gmail.com',
      password: '',
      fullName: 'testFullName',
    });
    await userRepository.save(newUser);
  });

  afterAll(async () => {
    await userRepository.delete({ userName: 'testAccount' });
    await AppDataSource.destroy();
  });

  describe('createJwt', () => {
    it('should create a JWT for a UserEntity with user role', async () => {
      const user = await userRepository.findOne({
        where: { userName: 'testAccount' },
      });
      const token = 'mockToken';

      if (user !== null) {
        (jwt.sign as jest.Mock).mockImplementation(
          (payload, secret, options) => {
            expect(payload).toEqual({ id: user.id, role: Role.USER });
            expect(secret).toBe(JWT_SECRET);
            expect(options).toEqual({ expiresIn: JWT_EXPIRE });
            return token;
          },
        );

        const result = authService.createJwt(user);
        expect(result).toBe(token);
      }
    });

    it('should create a JWT for an AdminEntity with admin role', async () => {
      const admin = await adminRepository.findOne({
        where: { userName: 'admin' },
      });
      const token = 'mockToken';

      if (admin !== null) {
        (jwt.sign as jest.Mock).mockImplementation(
          (payload, secret, options) => {
            expect(payload).toEqual({ id: admin.id, role: Role.ADMIN });
            expect(secret).toBe(JWT_SECRET);
            expect(options).toEqual({ expiresIn: JWT_EXPIRE });
            return token;
          },
        );

        const result = authService.createJwt(admin);
        expect(result).toBe(token);
      }
    });
  });
});
