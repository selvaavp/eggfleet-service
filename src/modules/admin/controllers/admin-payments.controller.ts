import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { Role } from '../../../common/enums/role.enum';
import { AdminPaymentsService } from '../services/admin-payments.service';
import { CreateVendorPaymentDto } from '../dto/create-vendor-payment.dto';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DateFilterDto } from '../../../common/dto/date-filter.dto';

class UpdateDriverPaymentStatusDto {
  @ApiProperty({ enum: [PaymentStatus.APPROVED, PaymentStatus.REJECTED] })
  @IsEnum([PaymentStatus.APPROVED, PaymentStatus.REJECTED])
  status: PaymentStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

@ApiTags('Admin — Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(private readonly paymentsService: AdminPaymentsService) {}

  @Get('drivers')
  @ApiOperation({ summary: 'List all driver payments filtered by date' })
  listDriverPayments(@Query() filter: DateFilterDto, @Query() pagination: PaginationDto) {
    return this.paymentsService.listDriverPayments(filter.date, pagination.page, pagination.limit);
  }

  @Get('vendors')
  @ApiOperation({ summary: 'List vendor payments. Optional: ?vendorId=' })
  @ApiQuery({ name: 'vendorId', required: false })
  listVendorPayments(
    @Query('vendorId') vendorId: string | undefined,
    @Query() pagination: PaginationDto,
  ) {
    return this.paymentsService.listVendorPayments(vendorId, pagination.page, pagination.limit);
  }

  @Post('vendors')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a vendor payment' })
  createVendorPayment(@Body() dto: CreateVendorPaymentDto, @CurrentUser() admin: CurrentUserPayload) {
    return this.paymentsService.createVendorPayment(dto, admin.sub);
  }

  @Patch('drivers/:id/status')
  @ApiOperation({ summary: 'Approve or reject a driver payment proof. Body: { status: APPROVED|REJECTED, note? }' })
  updateDriverPaymentStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDriverPaymentStatusDto,
    @CurrentUser() admin: CurrentUserPayload,
  ) {
    return this.paymentsService.updateDriverPaymentStatus(id, dto.status, admin.sub, dto.note);
  }
}
