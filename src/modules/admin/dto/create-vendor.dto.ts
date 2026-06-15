import { IsString, IsNotEmpty, IsOptional, IsEmail, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVendorDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty() @IsString() @IsNotEmpty() phone: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() aadharNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankAccountNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankIfsc?: string;
}

export class UpdateVendorDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() aadharNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankAccountNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankIfsc?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
