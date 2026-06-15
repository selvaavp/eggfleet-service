import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { AdminVendorsService } from '../services/admin-vendors.service';
import { CreateVendorDto, UpdateVendorDto } from '../dto/create-vendor.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DateRangeFilterDto } from '../../../common/dto/date-filter.dto';

class VendorDetailQueryDto extends PaginationDto {
  startDate?: string;
  endDate?: string;
}

@ApiTags('Admin — Vendors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/vendors')
export class AdminVendorsController {
  constructor(private readonly vendorsService: AdminVendorsService) {}

  @Get()
  @ApiOperation({ summary: 'List all vendors' })
  list(@Query() pagination: PaginationDto) {
    return this.vendorsService.list(pagination.page, pagination.limit);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new vendor' })
  create(@Body() dto: CreateVendorDto) {
    return this.vendorsService.create(dto);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get vendor stats summary' })
  getVendorSummary(@Param('id') id: string, @Query() query: DateRangeFilterDto) {
    return this.vendorsService.getVendorSummary(id, query.startDate, query.endDate);
  }

  @Get(':id/purchases')
  @ApiOperation({ summary: 'Get paginated purchase history for a vendor' })
  getVendorPurchases(@Param('id') id: string, @Query() query: VendorDetailQueryDto) {
    return this.vendorsService.getVendorPurchases(id, query.page, query.limit, query.startDate, query.endDate);
  }

  @Get(':id/payment-history')
  @ApiOperation({ summary: 'Get paginated payment history for a vendor' })
  getVendorPaymentHistory(@Param('id') id: string, @Query() query: VendorDetailQueryDto) {
    return this.vendorsService.getVendorPaymentHistory(id, query.page, query.limit, query.startDate, query.endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vendor by ID (sensitive fields decrypted)' })
  getById(@Param('id') id: string) {
    return this.vendorsService.getById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update vendor' })
  update(@Param('id') id: string, @Body() dto: UpdateVendorDto) {
    return this.vendorsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete vendor' })
  remove(@Param('id') id: string) {
    return this.vendorsService.remove(id);
  }
}
