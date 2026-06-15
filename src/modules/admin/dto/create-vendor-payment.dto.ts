import { IsUUID, IsNotEmpty, IsNumber, IsPositive, IsDateString, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../../../common/enums/payment-method.enum';
import { VendorPaymentStatus } from '../../../common/enums/vendor-payment-status.enum';

export class CreateVendorPaymentDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() vendorId: string;
  @ApiProperty() @IsNumber() @IsPositive() @Type(() => Number) amount: number;
  @ApiProperty({ enum: PaymentMethod }) @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;
  @ApiProperty() @IsDateString() paymentDate: string;
  @ApiPropertyOptional({ enum: VendorPaymentStatus }) @IsOptional() @IsEnum(VendorPaymentStatus) status?: VendorPaymentStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
