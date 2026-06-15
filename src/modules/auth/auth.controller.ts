import { Body, Controller, HttpCode, HttpStatus, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { OtpRequestDto } from './dto/otp-request.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login — phone (driver) or email (admin)' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (client discards tokens)' })
  logout() {
    return { message: 'Logged out successfully', data: null };
  }

  @Public()
  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request OTP for forgot password' })
  requestOtp(@Body() dto: OtpRequestDto) {
    return this.authService.requestOtp(dto);
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP — returns reset token' })
  verifyOtp(@Body() dto: OtpVerifyDto) {
    return this.authService.verifyOtp(dto);
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using reset token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('password/change')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password (authenticated)' })
  changePassword(@CurrentUser() user: CurrentUserPayload, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.sub, dto);
  }
}
