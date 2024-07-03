import { Error, Gender, Order } from '../constants';
import { AppDataSource } from '../config/ormConfig';
import { UserService } from '../services/user.service';
import { UserEntity } from '../entities/user.entity';
import { RegisterDto } from '../commons/dtos/register.dto';
import { Repository } from 'typeorm';
import { LoginDto } from '../commons/dtos/login.dto';
import bcryptjs from 'bcryptjs';

describe('UserService', () => {
  let userService: UserService;
  let userRepository: Repository<UserEntity>;

  beforeAll(async () => {
    await AppDataSource.initialize();
    userService = new UserService();
    userRepository = AppDataSource.getRepository(UserEntity);
    const newUser = userRepository.create({
      userName: 'user01',
      email: 'user01@gmail.com',
      fullName: 'User Full Name',
    });
    const salt = await bcryptjs.genSalt(10);
    newUser.password = await bcryptjs.hash('12345678', salt);
    await userRepository.save(newUser);
  });

  afterAll(async () => {
    // Clean up by deleting the test user and destroying the data source
    await userRepository.delete({ userName: 'user01' });
    await AppDataSource.destroy();
  });

  describe('registerUser', () => {
    it('should create and return new User', async () => {
      const registerDto: RegisterDto = {
        userName: 'user02',
        email: 'user02@gmail.com',
        password: '12345678',
        fullName: 'User Full Name',
      };

      // Use the query runner's manager to handle the transaction
      const result = await userService.registerUser(registerDto);
      expect(result).toBeInstanceOf(UserEntity);
      expect(result.userName).toBe('user02');
      expect(result.email).toBe('user02@gmail.com');
      expect(result.fullName).toBe('User Full Name');
      await userRepository.delete({ userName: 'user02' });
    });

    it('should return error if userName is duplicate', async () => {
      const registerDto: RegisterDto = {
        userName: 'user01',
        email: 'user02@gmail.com',
        password: '12345678',
        fullName: 'User Full Name',
      };

      const result = await userService.registerUser(registerDto);
      expect(result).toEqual({ userName: Error.DUPLICATE_USER_NAME });
    });

    it('should return error if email is duplicate', async () => {
      const registerDto: RegisterDto = {
        userName: 'user02',
        email: 'user01@gmail.com',
        password: '12345678',
        fullName: 'User Full Name',
      };

      const result = await userService.registerUser(registerDto);
      expect(result).toEqual({ email: Error.DUPLICATE_EMAIL });
    });
  });

  describe('userLogin', () => {
    it('should return invalid credential error if user not found', async () => {
      const loginDto: LoginDto = {
        userName: 'user007',
        password: '12345678',
      };

      const result = await userService.userLogin(loginDto);
      expect(result).toEqual(Error.INVALID_CREDENTIAL);
    });

    it('should return invalid credential error if password not match', async () => {
      const loginDto: LoginDto = {
        userName: 'user01',
        password: '1234',
      };

      const result = await userService.userLogin(loginDto);
      expect(result).toEqual(Error.INVALID_CREDENTIAL);
    });

    it('should return user if credential is valid', async () => {
      const loginDto: LoginDto = {
        userName: 'user01',
        password: '12345678',
      };

      const result = await userService.userLogin(loginDto);
      expect(result).toBeInstanceOf(UserEntity);
      if (result instanceof UserEntity) {
        expect(result.userName).toBe('user01');
      }
    });
  });

  describe('findById', () => {
    it('should return user if id is valid', async () => {
      const user = await userRepository.findOne({
        where: { userName: 'user01' },
      });
      if (user !== null) {
        const result = await userService.findById(user.id);
        expect(result).toBeInstanceOf(UserEntity);
        if (result !== null) {
          expect(result.id).toEqual(user.id);
        }
      }
    });

    it('should return null if id is invalid', async () => {
      const user = await userRepository.findOne({
        where: { id: 2 },
      });
      if (user === null) {
        const result = await userService.findById(2);
        expect(result).toBeNull();
      }
    });
  });

  describe('changePassword', () => {
    it('should return error if password not match', async () => {
      const user = await userRepository.findOne({
        where: { userName: 'user01' },
      });
      if (user !== null) {
        const changePassworDto = {
          password: '1234',
          newPassword: '12345678',
          confirmPassword: '12345678',
        };
        const result = await userService.changePassword(user, changePassworDto);
        expect(result).toEqual({
          password: [Error.INVALID_CREDENTIAL],
        });
      }
    });

    it('should update user password', async () => {
      const user = await userRepository.findOne({
        where: { userName: 'user01' },
      });
      if (user !== null) {
        const changePassworDto = {
          password: '12345678',
          newPassword: '1234',
          confirmPassword: '1234',
        };
        const result = await userService.changePassword(user, changePassworDto);
        expect(result).toBeInstanceOf(UserEntity);
        if (result instanceof UserEntity) {
          const isMatch = await bcryptjs.compare('1234', result.password);
          expect(isMatch).toEqual(true);
        }
      }
    });
  });

  describe('updateAvatar', () => {
    it('should update user avatar', async () => {
      const user = await userRepository.findOne({
        where: { userName: 'user01' },
      });
      if (user !== null) {
        const updateAvatarDto = {
          avatar: 'newAvatarUrl',
        };
        const result = await userService.updateAvatar(user, updateAvatarDto);
        expect(result.avatar).toEqual('newAvatarUrl');
      }
    });
  });

  describe('updatePersonalInfo', () => {
    it('should update user personal information', async () => {
      const user = await userRepository.findOne({
        where: { userName: 'user01' },
      });
      if (user !== null) {
        const updateOptions = {
          fullName: 'New full name',
          gender: Gender.MALE,
          address: 'New address',
          phoneNumber: '0123456789',
          dob: new Date('01-01-2000'),
        };
        const result = await userService.updatePersonalInfo(
          user,
          updateOptions,
        );
        expect(result.fullName).toEqual('New full name');
        expect(result.gender).toEqual(Gender.MALE);
        expect(result.address).toEqual('New address');
        expect(result.phoneNumber).toEqual('0123456789');
        expect(result.dob).toEqual(new Date('01-01-2000'));
      }
    });
  });

  describe('getUserPage', () => {
    it('should return user page and page meta', async () => {
      const pageOptions = {
        order: Order.ASC,
        page: 1,
        take: 10,
        skip: 0,
      };
      const result = await userService.getUserPage(pageOptions);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0]).toBeInstanceOf(UserEntity);
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
});
