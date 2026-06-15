import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../../database/entities/user.entity';
import { OtpToken } from '../../database/entities/otp-token.entity';
import { Role } from '../../common/enums/role.enum';
import { ErrorCodes } from '../../common/constants/error-codes.constant';
import { JWT_TYPE } from '../../common/constants/app.constant';
import { generateOtp, hashOtp, verifyOtp } from '../../common/utils/otp.util';
import { LoginDto } from './dto/login.dto';
import { OtpRequestDto } from './dto/otp-request.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(OtpToken) private readonly otpRepo: Repository<OtpToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Login ─────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const isPhone = /^\d{10}$/.test(dto.identifier);
    const where = isPhone
      ? { phone: dto.identifier, role: Role.DRIVER }
      : { email: dto.identifier, role: Role.ADMIN };

    const user = await this.userRepo.findOne({ where });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException({
        errorCode: ErrorCodes.INVALID_CREDENTIALS,
        message: isPhone
          ? 'Invalid phone number or password'
          : 'Invalid email or password',
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException({
        errorCode: ErrorCodes.UNAUTHORIZED,
        message: 'Account is deactivated. Contact admin.',
      });
    }

    if (user.role === Role.ADMIN && !user.email?.trim()) {
      throw new UnauthorizedException({
        errorCode: ErrorCodes.UNAUTHORIZED,
        message: 'Admin account is missing a valid email. Contact support.',
      });
    }
    if (user.role === Role.DRIVER && (!user.phone || !/^\d{10}$/.test(user.phone))) {
      throw new UnauthorizedException({
        errorCode: ErrorCodes.UNAUTHORIZED,
        message: 'Driver account is missing a valid mobile number. Contact support.',
      });
    }

    const tokens = await this.issueTokens(user, dto.rememberDevice);

    return {
      message: 'Login successful',
      data: {
        ...tokens,
        user: this.formatUser(user),
      },
    };
  }

  // ─── Refresh Token ──────────────────────────────────────────────────────────

  async refresh(dto: RefreshTokenDto) {
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException({
        errorCode: ErrorCodes.TOKEN_EXPIRED,
        message: 'Refresh token expired, please login again',
      });
    }

    if (payload.type !== JWT_TYPE.REFRESH) {
      throw new UnauthorizedException({
        errorCode: ErrorCodes.TOKEN_INVALID,
        message: 'Invalid token',
      });
    }

    const accessToken = this.signAccess(payload.sub, payload.role);
    return { message: 'Token refreshed', data: { accessToken } };
  }

  // ─── OTP Request ────────────────────────────────────────────────────────────

  async requestOtp(dto: OtpRequestDto) {
    const isPhone = /^\d{10}$/.test(dto.identifier);
    const where = isPhone
      ? { phone: dto.identifier }
      : { email: dto.identifier };

    const user = await this.userRepo.findOne({ where });
    if (!user) {
      throw new NotFoundException({
        errorCode: ErrorCodes.NOT_FOUND,
        message: 'No account found with this phone/email',
      });
    }

    // Rate limit: check recent unexpired, unused OTP
    const recent = await this.otpRepo.findOne({
      where: { identifier: dto.identifier, isUsed: false },
      order: { createdAt: 'DESC' },
    });

    if (recent) {
      const cooldownMs = 60 * 1000;
      const elapsed = Date.now() - new Date(recent.createdAt).getTime();
      if (elapsed < cooldownMs) {
        throw new ConflictException({
          errorCode: ErrorCodes.TOO_MANY_REQUESTS,
          message: `Please wait ${Math.ceil((cooldownMs - elapsed) / 1000)} seconds before requesting a new OTP`,
        });
      }
    }

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.otpRepo.save(
      this.otpRepo.create({ identifier: dto.identifier, otpHash, expiresAt }),
    );

    // TODO: Send OTP via SMS (driver) or Email (admin) using configured provider
    // For now — log in dev, provider-agnostic stub
    if (process.env.NODE_ENV === 'development') {
      console.log(`[OTP] ${dto.identifier} → ${otp}`);
    }

    return {
      message: `OTP sent to ${dto.identifier}`,
      data: { expiresInMinutes: 10 },
    };
  }

  // ─── OTP Verify ─────────────────────────────────────────────────────────────

  async verifyOtp(dto: OtpVerifyDto) {
    const token = await this.otpRepo.findOne({
      where: { identifier: dto.identifier, isUsed: false },
      order: { createdAt: 'DESC' },
    });

    if (!token) {
      throw new BadRequestException({
        errorCode: ErrorCodes.INVALID_OTP,
        message: 'Invalid OTP',
      });
    }

    if (new Date() > new Date(token.expiresAt)) {
      throw new BadRequestException({
        errorCode: ErrorCodes.EXPIRED_OTP,
        message: 'OTP has expired, please request a new one',
      });
    }

    const valid = await verifyOtp(dto.otp, token.otpHash);
    if (!valid) {
      throw new BadRequestException({
        errorCode: ErrorCodes.INVALID_OTP,
        message: 'Invalid OTP',
      });
    }

    await this.otpRepo.update(token.id, { isUsed: true });

    const resetToken = this.jwtService.sign(
      { identifier: dto.identifier, type: JWT_TYPE.RESET },
      {
        secret: this.configService.get('jwt.resetSecret'),
        expiresIn: this.configService.get('jwt.resetExpiry'),
      },
    );

    return { message: 'OTP verified', data: { resetToken } };
  }

  // ─── Reset Password ──────────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto) {
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.resetToken, {
        secret: this.configService.get('jwt.resetSecret'),
      });
    } catch {
      throw new BadRequestException({
        errorCode: ErrorCodes.INVALID_RESET_TOKEN,
        message: 'Reset token is invalid or expired',
      });
    }

    if (payload.type !== JWT_TYPE.RESET) {
      throw new BadRequestException({
        errorCode: ErrorCodes.INVALID_RESET_TOKEN,
        message: 'Invalid reset token',
      });
    }

    const isPhone = /^\d{10}$/.test(payload.identifier);
    const where = isPhone
      ? { phone: payload.identifier }
      : { email: payload.identifier };

    const user = await this.userRepo.findOne({ where });
    if (!user) throw new NotFoundException({ errorCode: ErrorCodes.NOT_FOUND, message: 'User not found' });

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.userRepo.update(user.id, { passwordHash });

    return { message: 'Password updated successfully', data: null };
  }

  // ─── Change Password ─────────────────────────────────────────────────────────

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException({ errorCode: ErrorCodes.NOT_FOUND, message: 'User not found' });

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException({
        errorCode: ErrorCodes.INVALID_CREDENTIALS,
        message: 'Current password is incorrect',
      });
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.userRepo.update(userId, { passwordHash });

    return { message: 'Password changed successfully', data: null };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async issueTokens(user: User, remember = false) {
    const accessToken = this.signAccess(user.id, user.role);
    const refreshExpiry = remember
      ? this.configService.get<string>('jwt.refreshExpiryRemember')
      : this.configService.get<string>('jwt.refreshExpiry');

    const refreshToken = this.jwtService.sign(
      { sub: user.id, role: user.role, type: JWT_TYPE.REFRESH },
      { secret: this.configService.get('jwt.refreshSecret'), expiresIn: refreshExpiry },
    );

    return { accessToken, refreshToken };
  }

  private signAccess(userId: string, role: string): string {
    return this.jwtService.sign(
      { sub: userId, role, type: JWT_TYPE.ACCESS },
      {
        secret: this.configService.get('jwt.accessSecret'),
        expiresIn: this.configService.get('jwt.accessExpiry'),
      },
    );
  }

  private formatUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      role: user.role,
      phone: user.phone,
      email: user.email,
      profilePictureUrl: user.profilePictureUrl,
    };
  }
}
