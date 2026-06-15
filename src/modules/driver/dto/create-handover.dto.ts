import { Type } from 'class-transformer';
import {
  IsUUID, IsDateString, IsString, IsNumber,
  IsArray, ValidateNested, IsInt, Min, ArrayMinSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class HandoverEggItemDto {
  @ApiProperty()
  @IsUUID()
  vanLoadId: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  goodUnits: number;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  damagedUnits: number;
}

export class CreateHandoverDto {
  @ApiProperty()
  @IsUUID()
  adminId: string;

  @ApiProperty({ example: '2026-05-09' })
  @IsDateString()
  handoverDate: string;

  @ApiProperty({ example: '18:30' })
  @IsString()
  handoverTime: string;

  @ApiProperty({ example: 3200.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  cashAmount: number;

  @ApiProperty({ type: [HandoverEggItemDto] })
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => HandoverEggItemDto)
  eggItems: HandoverEggItemDto[];
}
