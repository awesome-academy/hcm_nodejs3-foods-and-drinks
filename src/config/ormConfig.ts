import { join } from 'path';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

const { DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE } = process.env;

const port = DB_PORT ? parseInt(DB_PORT) : 3306;

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: DB_HOST,
  port: port,
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  synchronize: false,
  logging: true,
  migrations: ['./src/migrations/*.ts'],
  entities: [join(__dirname, '../entities/*.entity.{ts, js}')],
});
