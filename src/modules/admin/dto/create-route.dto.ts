import { IsString, IsNotEmpty, IsOptional, IsArray, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRouteDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsUUID('4', { each: true }) storeIds?: string[];
}

export class UpdateRouteDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsUUID('4', { each: true }) storeIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
