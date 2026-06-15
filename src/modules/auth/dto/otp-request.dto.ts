import { IsString, IsNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OtpRequestDto {
  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ enum: ['FORGOT_PASSWORD'] })
  @IsIn(['FORGOT_PASSWORD'])
  type: 'FORGOT_PASSWORD';
}
