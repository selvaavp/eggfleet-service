import { Type } from 'class-transformer';
import { IsArray, IsUUID, IsInt, IsPositive, IsOptional, IsNumber, Min, ValidateNested, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeliveryItemDto {
  @ApiProperty()
  @IsUUID()
  vanLoadId: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({ description: 'Override unit price; defaults to loaded rate if omitted' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

export class CreateDeliveryDto {
  @ApiProperty()
  @IsUUID()
  storeId: string;

  @ApiProperty({ type: [DeliveryItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DeliveryItemDto)
  items: DeliveryItemDto[];
}
