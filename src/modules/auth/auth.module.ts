import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '../../database/entities/user.entity';
import { OtpToken } from '../../database/entities/otp-token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, OtpToken]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}), // secrets injected per sign call via ConfigService
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy],
})
export class AuthModule {}
