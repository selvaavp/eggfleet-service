import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = registerAs('database', (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'eggfleet',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [__dirname + '/../database/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: process.env.DB_SYNCHRONIZE === 'true' || process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
}));
