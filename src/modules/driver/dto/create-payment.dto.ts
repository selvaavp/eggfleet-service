import { Transform, Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsUUID, IsNumber, IsPositive, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '../../../common/enums/payment-method.enum';

export class CreatePaymentDto {
  @ApiProperty({ type: [String] })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return value.split(',').map((v) => v.trim()).filter(Boolean);
      }
    }
    return value;
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  deliveryIds: string[];

  @ApiProperty({ example: 650.00 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ example: '2026-05-09' })
  @IsDateString()
  paymentDate: string;
}
