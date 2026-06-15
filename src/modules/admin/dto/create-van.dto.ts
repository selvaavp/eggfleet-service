import { IsString, IsNotEmpty, IsOptional, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateVanDto {
  @ApiProperty({ description: 'Van registration/number plate' })
  @IsString() @IsNotEmpty() vanNumber: string;

  @ApiProperty({ description: 'Van name or model' })
  @IsString() @IsNotEmpty() name: string;

  @ApiPropertyOptional({ description: 'Load capacity in units' })
  @IsOptional() @IsNumber() @IsPositive() @Type(() => Number) loadCapacity?: number;
}

export class UpdateVanDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @IsPositive() @Type(() => Number) loadCapacity?: number;
}
