import { registerAs } from '@nestjs/config';

export const throttleConfig = registerAs('throttle', () => ({
  ttl: parseInt(process.env.THROTTLE_TTL_SECONDS ?? '60', 10) * 1000,
  limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
}));
