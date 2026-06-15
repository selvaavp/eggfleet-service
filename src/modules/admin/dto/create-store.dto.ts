import { IsString, IsNotEmpty, IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStoreDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ownerContactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() routeId?: string;
}

export class UpdateStoreDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ownerContactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() routeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
