import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { OTP } from '../constants/app.constant';

export function generateOtp(): string {
  const min = Math.pow(10, OTP.LENGTH - 1);
  const max = Math.pow(10, OTP.LENGTH) - 1;
  return String(min + (crypto.randomInt(max - min + 1)));
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

export async function verifyOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}
