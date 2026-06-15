import { IsUUID, IsNotEmpty, IsNumber, IsPositive, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateInventoryDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() vendorId: string;
  @ApiProperty() @IsDateString() purchaseDate: string;
  @ApiProperty() @IsNumber() @IsPositive() @Type(() => Number) totalUnits: number;
  @ApiProperty() @IsNumber() @IsPositive() @Type(() => Number) goodUnits: number;
  @ApiProperty() @IsNumber() @IsPositive() @Type(() => Number) ratePerUnit: number;
  @ApiProperty() @IsUUID() @IsNotEmpty() createdBy: string;
}
