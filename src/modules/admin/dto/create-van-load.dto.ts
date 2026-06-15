import { IsUUID, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateVanLoadDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() vanAssignmentId: string;
  @ApiProperty() @IsUUID() @IsNotEmpty() inventoryId: string;
  @ApiProperty() @IsNumber() @IsPositive() @Type(() => Number) loadedUnits: number;
  @ApiProperty() @IsNumber() @IsPositive() @Type(() => Number) ratePerUnit: number;
}
