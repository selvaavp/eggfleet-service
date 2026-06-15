import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Phone number (driver) or email (admin)', example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: 'Secret@123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  rememberDevice?: boolean;
}
