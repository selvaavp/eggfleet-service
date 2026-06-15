import {
  Controller, Get, Post, Body, Query,
  UseGuards, HttpCode, HttpStatus,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { Role } from '../../../common/enums/role.enum';
import { DriverPaymentsService } from '../services/driver-payments.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DateFilterDto } from '../../../common/dto/date-filter.dto';

@ApiTags('Driver — Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DRIVER)
@Controller('driver')
export class DriverPaymentsController {
  constructor(private readonly paymentsService: DriverPaymentsService) {}

  @Get('payments/summary')
  @ApiOperation({ summary: 'Get payment summary breakdown for a date' })
  getSummary(@CurrentUser() user: CurrentUserPayload, @Query() filter: DateFilterDto) {
    return this.paymentsService.getSummary(user.sub, filter.date);
  }

  @Get('payments')
  @ApiOperation({ summary: 'List payment history. method=ALL|CASH|UPI|BANK_TRANSFER' })
  @ApiQuery({ name: 'method', required: false, enum: ['ALL', 'CASH', 'UPI', 'BANK_TRANSFER'] })
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query() filter: DateFilterDto,
    @Query() pagination: PaginationDto,
    @Query('method') method?: string,
  ) {
    return this.paymentsService.list(user.sub, filter.date, method, pagination.page, pagination.limit);
  }

  @Post('payments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a payment (with optional proof screenshot)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('proofFile', { storage: memoryStorage() }))
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreatePaymentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.paymentsService.create(user.sub, dto, file);
  }
}
