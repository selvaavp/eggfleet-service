import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OtpVerifyDto {
  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: '482163', minLength: 6, maxLength: 6 })
  @IsString()
  @Length(6, 6)
  otp: string;
}
