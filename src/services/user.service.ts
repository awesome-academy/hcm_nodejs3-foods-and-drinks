import { UpdatePersonalInfo } from './../commons/dtos/updatePersonalInfo.dto';
import { RegisterDto } from './../commons/dtos/register.dto';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { AppDataSource } from '../config/ormConfig';
import { Error } from '../constants';
import bcryptjs from 'bcryptjs';
import { LoginDto } from '../commons/dtos/login.dto';
import { UserPageOptions } from '../commons/dtos/userPageOptions.dto';
import { PageDto } from '../commons/dtos/page.dto';
import { PageMetaDto } from '../commons/dtos/pageMeta.dto';
import { ChangePasswordDto } from '../commons/dtos/changePassword.dto';
import { UpdateAvatarDto } from '../commons/dtos/updateAvatar.dto';

export class UserService {
  private readonly userRepository: Repository<UserEntity>;
  constructor() {
    this.userRepository = AppDataSource.getRepository(UserEntity);
  }

  public async registerUser(registerDto: RegisterDto)
  : Promise<any | UserEntity> {
    const errors: any = {};
    //check duplicate userName
    const findByUserNameResult = await this.userRepository.findOne({
      where: {
        userName: registerDto.userName,
      },
    });
    if (findByUserNameResult!==null){
      errors.userName = Error.DUPLICATE_USER_NAME;
    }
    const findByEmailResult = await this.userRepository.findOne({
      where: {
        email: registerDto.email,
      },
    });
    if (findByEmailResult!==null){
      errors.email = Error.DUPLICATE_EMAIL;
    }
    if (Object.keys(errors).length > 0) {
      return errors;
    }
    const salt = await bcryptjs.genSalt(10); // Generate a salt
    // Hash the password with the generated salt
    const hashedPassword = await bcryptjs.hash(registerDto.password, salt);
    const newUser = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
    });
    return await this.userRepository.save(newUser);
  }

  public async userLogin(loginDto: LoginDto): Promise<string | UserEntity> {
    //check duplicate userName
    const user = await this.userRepository.findOne({
      where: [
        { userName: loginDto.userName },
        { email: loginDto.userName },
      ],
    });
    if (user===null){
      return Error.INVALID_CREDENTIAL;
    }
    const isMatch = 
      await bcryptjs.compare(loginDto.password, user.password);
    if (!isMatch) {
      return Error.INVALID_CREDENTIAL;
    }
    return user;
  }

  public async findById(id: number ): Promise<UserEntity | null> {
    return this.userRepository.findOne({where: {id: id}});
  }

  public async getUserPage(pageOptionsDto: UserPageOptions)
  : Promise<PageDto<UserEntity>> {
    const {
      order,
      take,
      skip,
      keyword,
      isActive,
    } = pageOptionsDto;
    const query = this.userRepository.createQueryBuilder('user');
    // Handle filter
    if(isActive !== undefined){
      query.andWhere('user.isActive = :isActive', {isActive: isActive});
    }
    if(keyword){
      query.andWhere(
        'MATCH(user.userName, user.email, user.fullName) AGAINST(:keyword IN BOOLEAN MODE)',
        { keyword: `*${keyword}*` },
      );
    }
    // Handle sort
    query.orderBy('user.id', order);

    // Handle paging
    query.skip(skip).take(take);

    // Retrieve entities
    const itemCount = await query.getCount();
    const entities = await query.getMany();

    const pageMeta = new PageMetaDto({pageOptionsDto, itemCount});
    return new PageDto(entities, pageMeta);
  }

  async changePassword(user: UserEntity, updateOptions: ChangePasswordDto)
  : Promise<any | UserEntity> {
    // Check password match
    const { password, newPassword } = updateOptions;
    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return {
        password : [Error.INVALID_CREDENTIAL],
      };
    }

    const salt = await bcryptjs.genSalt(10);
    const newHashPassword = await bcryptjs.hash(newPassword, salt);

    // Merge and save updated data
    this.userRepository.merge(user, {password: newHashPassword});
    return this.userRepository.save(user);
  }

  async updateAvatar(user: UserEntity, updateOptions: UpdateAvatarDto)
  : Promise< UserEntity> {
    user.avatar = updateOptions.avatar;
    return this.userRepository.save(user);
  }

  async updatePersonalInfo(user: UserEntity, updateOptions: UpdatePersonalInfo)
  : Promise< UserEntity> {
    this.userRepository.merge(user, updateOptions);
    return this.userRepository.save(user);
  }
}
