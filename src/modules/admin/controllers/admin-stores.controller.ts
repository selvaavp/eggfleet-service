import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { AdminStoresService } from '../services/admin-stores.service';
import { CreateStoreDto, UpdateStoreDto } from '../dto/create-store.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DateRangeFilterDto } from '../../../common/dto/date-filter.dto';

@ApiTags('Admin — Stores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/stores')
export class AdminStoresController {
  constructor(private readonly storesService: AdminStoresService) {}

  @Get()
  @ApiOperation({ summary: 'List all stores' })
  list(@Query() pagination: PaginationDto) {
    return this.storesService.list(pagination.page, pagination.limit);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new store' })
  create(@Body() dto: CreateStoreDto) {
    return this.storesService.create(dto);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get store summary stats' })
  getSummary(@Param('id') id: string, @Query() query: DateRangeFilterDto) {
    return this.storesService.getStoreSummary(id, query.startDate, query.endDate);
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'Get store delivery history' })
  getDeliveries(
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
    @Query() dateFilter: DateRangeFilterDto,
  ) {
    return this.storesService.getStoreDeliveries(id, pagination.page, pagination.limit, dateFilter.startDate, dateFilter.endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get store by ID' })
  getById(@Param('id') id: string) {
    return this.storesService.getById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update store' })
  update(@Param('id') id: string, @Body() dto: UpdateStoreDto) {
    return this.storesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove store' })
  remove(@Param('id') id: string) {
    return this.storesService.remove(id);
  }
}
