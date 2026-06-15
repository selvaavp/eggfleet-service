import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateFcmTokenDto {
  @ApiProperty({ description: 'FCM device token from Firebase Cloud Messaging' })
  @IsString()
  @IsNotEmpty()
  fcmToken: string;
}
