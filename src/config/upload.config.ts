import { registerAs } from '@nestjs/config';

export const uploadConfig = registerAs('upload', () => ({
  dir: process.env.UPLOAD_DIR ?? './uploads',
  maxPaymentProofMb: parseInt(process.env.UPLOAD_MAX_FILE_SIZE_MB ?? '5', 10),
  maxProfilePictureMb: parseInt(process.env.PROFILE_PICTURE_MAX_MB ?? '2', 10),
}));
