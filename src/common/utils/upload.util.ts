import { BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import * as path from 'path';
import { UPLOAD } from '../constants/app.constant';
import { v4 as uuid } from 'uuid';

export function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });
}

export function buildUploadPath(subDir: string, originalName: string): string {
  const uploadRoot = process.env.UPLOAD_DIR ?? './uploads';
  const dir = path.join(uploadRoot, subDir);
  ensureDir(dir);
  const ext = path.extname(originalName);
  return path.join(dir, `${uuid()}${ext}`);
}

export function validateImageMimetype(
  file: Express.Multer.File,
  maxMb: number = UPLOAD.MAX_PAYMENT_PROOF_MB,
): void {
  if (!(UPLOAD.ALLOWED_IMAGE_TYPES as unknown as string[]).includes(file.mimetype)) {
    throw new BadRequestException('Only JPEG and PNG images are allowed');
  }
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new BadRequestException(`File size must not exceed ${maxMb}MB`);
  }
}

export function toPublicUrl(absolutePath: string): string {
  const uploadRoot = path.resolve(process.env.UPLOAD_DIR ?? './uploads');
  const rel = absolutePath.replace(uploadRoot, '').replace(/\\/g, '/');
  return `/uploads${rel}`;
}
