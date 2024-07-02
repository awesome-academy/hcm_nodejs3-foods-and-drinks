import * as dotenv from 'dotenv';
import type { DataSourceOptions } from 'typeorm';
import { DataSource } from 'typeorm';
import type { SeederOptions } from 'typeorm-extension';
import { runSeeders } from 'typeorm-extension';
import { CategoryEntity } from '../entities/category.entity';
import CategorySeeder from './category.seeder';
import { ProductEntity } from '../entities/product.entity';
import ProductSeeder from './product.seeder';
import { CartProductEntity } from '../entities/cartProduct.entity';
import { FeedbackEntity } from '../entities/feedback.entity';
import { OrderProductEntity } from '../entities/orderProduct.entity';
import { AdminEntity } from '../entities/admin.entity';
import { OrderEntity } from '../entities/order.entity';
import { PaymentEntity } from '../entities/payment.entity';
import { StoreEntity } from '../entities/store.entity';
import { UserEntity } from '../entities/user.entity';
import StoreSeeder from './store.seeder';
import AdminSeeder from './admin.seeder';
dotenv.config();

const {
  DB_HOST,
  DB_PORT,
  DB_USERNAME,
  DB_PASSWORD,
  DB_DATABASE,
  DB_TEST_DATABASE,
  NODE_ENV,
} = process.env;

const port = DB_PORT ? parseInt(DB_PORT) : 3306;

const database = NODE_ENV === 'test' ? DB_TEST_DATABASE : DB_DATABASE;

async function executeSeeding() {
  const options: DataSourceOptions & SeederOptions = {
    type: 'mysql',
    host: DB_HOST,
    port: port,
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: database,
    entities: [
      AdminEntity,
      CartProductEntity,
      CategoryEntity,
      FeedbackEntity,
      OrderEntity,
      OrderProductEntity,
      PaymentEntity,
      ProductEntity,
      StoreEntity,
      UserEntity,
    ],
    seeds: [CategorySeeder, ProductSeeder, StoreSeeder, AdminSeeder],
  };

  const dataSource = new DataSource(options);
  await dataSource.initialize();

  await runSeeders(dataSource);
}

executeSeeding().catch(console.error);
