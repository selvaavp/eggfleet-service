import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { AdminVansService } from '../services/admin-vans.service';
import { CreateVanDto, UpdateVanDto } from '../dto/create-van.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@ApiTags('Admin — Vans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/vans')
export class AdminVansController {
  constructor(private readonly vansService: AdminVansService) {}

  @Get()
  @ApiOperation({ summary: 'List all vans' })
  list(@Query() pagination: PaginationDto) {
    return this.vansService.list(pagination.page, pagination.limit);
  }

  @Get('fleet-overview')
  @ApiOperation({ summary: 'Get fleet overview for a date' })
  getFleetOverview(@Query('date') date?: string) {
    const d = date ?? new Date().toISOString().slice(0, 10);
    return this.vansService.getFleetOverview(d);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new van' })
  create(@Body() dto: CreateVanDto) {
    return this.vansService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get van by ID' })
  getById(@Param('id') id: string) {
    return this.vansService.getById(id);
  }

  @Get(':id/detail')
  @ApiOperation({ summary: 'Get van detail (stock spec + route activity) for a date' })
  getVanDetail(
    @Param('id') id: string,
    @Query('date') date?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const d = date ?? new Date().toISOString().slice(0, 10);
    return this.vansService.getVanDetail(id, d, parseInt(page ?? '1', 10), parseInt(limit ?? '10', 10));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update van' })
  update(@Param('id') id: string, @Body() dto: UpdateVanDto) {
    return this.vansService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete van' })
  remove(@Param('id') id: string) {
    return this.vansService.remove(id);
  }
}
