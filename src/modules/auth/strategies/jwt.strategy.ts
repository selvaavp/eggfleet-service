import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../database/entities/user.entity';
import { ErrorCodes } from '../../../common/constants/error-codes.constant';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: { sub: string; role: string; type: string }) {
    if (payload.type !== 'access') {
      throw new UnauthorizedException({
        errorCode: ErrorCodes.TOKEN_INVALID,
        message: 'Invalid token type',
      });
    }

    const user = await this.userRepo.findOne({
      where: { id: payload.sub, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException({
        errorCode: ErrorCodes.UNAUTHORIZED,
        message: 'User not found or deactivated',
      });
    }

    return { sub: user.id, role: user.role, phone: user.phone, email: user.email };
  }
}
