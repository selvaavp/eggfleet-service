import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

function getKey(envKey: string): Buffer {
  // Ensure exactly 32 bytes
  return Buffer.from(envKey.padEnd(32, '0').slice(0, 32), 'utf8');
}

function getIv(envIv: string): Buffer {
  // Ensure exactly 16 bytes
  return Buffer.from(envIv.padEnd(16, '0').slice(0, 16), 'utf8');
}

export function encrypt(text: string): string {
  if (!text) return text;
  const key = getKey(process.env.ENCRYPTION_KEY ?? '');
  const iv = getIv(process.env.ENCRYPTION_IV ?? '');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return encrypted.toString('base64');
}

export function decrypt(encryptedBase64: string): string {
  if (!encryptedBase64) return encryptedBase64;
  const key = getKey(process.env.ENCRYPTION_KEY ?? '');
  const iv = getIv(process.env.ENCRYPTION_IV ?? '');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
