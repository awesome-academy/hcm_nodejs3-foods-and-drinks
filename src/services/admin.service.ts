import { Repository } from 'typeorm';
import { AdminEntity } from '../entities/admin.entity';
import { AppDataSource } from '../config/ormConfig';
import { LoginDto } from '../commons/dtos/login.dto';
import { Error, PaymentStatus } from '../constants';
import bcryptjs from 'bcryptjs';
import { AdminDashboardCommonDataDto } from '../commons/dtos/adminDashboardCommonData.dto';
import { OrderEntity } from '../entities/order.entity';
import { ProductEntity } from '../entities/product.entity';
import { UserEntity } from '../entities/user.entity';
import { StoreEntity } from '../entities/store.entity';
import { CategoryEntity } from '../entities/category.entity';

export class AdminService {
  private readonly adminRepository: Repository<AdminEntity>;
  constructor() {
    this.adminRepository = AppDataSource.getRepository(AdminEntity);
  }

  public async adminLogin(loginDto: LoginDto): Promise<string | AdminEntity> {
    const admin = await this.adminRepository.findOne({
      where: [
        { userName: loginDto.userName },
        { email: loginDto.userName },
      ],
    });
    if (admin===null){
      return Error.INVALID_CREDENTIAL;
    }
    const isMatch = 
      await bcryptjs.compare(loginDto.password, admin.password);
    if (!isMatch) {
      return Error.INVALID_CREDENTIAL;
    }
    return admin;
  }

  public async findById(id: number): Promise<AdminEntity | null> {
    return this.adminRepository.findOne({where: {id: id}});
  }

  public async getAdminDashboardCommonData()
  : Promise<AdminDashboardCommonDataDto> {
    const totalOrder = await AppDataSource.getRepository(OrderEntity)
    .count();
    const totalProduct = await AppDataSource.getRepository(ProductEntity)
    .count();
    const totalUser = await AppDataSource.getRepository(UserEntity).count();
    const totalStore = await AppDataSource.getRepository(StoreEntity).count();
    const totalCategory = await 
    AppDataSource.getRepository(CategoryEntity).count();
    const totalRevenue = 
    await AppDataSource.getRepository(OrderEntity).createQueryBuilder('order')
    .select('SUM(order.total)', 'totalRevenue')
    .where('order.paymentStatus = :paymentStatus', {paymentStatus: PaymentStatus.COMPLETE})
    .getRawOne().then(result=>result.totalRevenue);
    return {
      totalOrder, 
      totalProduct, 
      totalUser, 
      totalStore, 
      totalCategory,
      totalRevenue: parseInt(totalRevenue),
    };
  }
}
