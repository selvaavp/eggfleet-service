import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

import { databaseConfig } from './config/database.config';
import { jwtConfig } from './config/jwt.config';
import { firebaseConfig } from './config/firebase.config';
import { uploadConfig } from './config/upload.config';
import { throttleConfig } from './config/throttle.config';

import { AuthModule } from './modules/auth/auth.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DriverModule } from './modules/driver/driver.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, firebaseConfig, uploadConfig, throttleConfig],
      // Use ENV_FILE env var so dev and prod can load different files:
      //   dev : ENV_FILE=.env      (default)
      //   prod: ENV_FILE=.env.prod (set by scripts/start-prod.sh)
      envFilePath: process.env.ENV_FILE || '.env',
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.get('database'),
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('throttle.ttl', 60000),
          limit: config.get<number>('throttle.limit', 100),
        },
      ],
    }),

    AuthModule,
    NotificationsModule,
    DriverModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
