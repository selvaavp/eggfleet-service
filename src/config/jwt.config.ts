import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? 'access-secret',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'refresh-secret',
  resetSecret: process.env.JWT_RESET_SECRET ?? 'reset-secret',
  accessExpiry: process.env.JWT_ACCESS_EXPIRY ?? '2d',
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY ?? '7d',
  refreshExpiryRemember: process.env.JWT_REFRESH_EXPIRY_REMEMBER ?? '30d',
  resetExpiry: process.env.JWT_RESET_EXPIRY ?? '10m',
}));
