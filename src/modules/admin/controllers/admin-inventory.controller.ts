import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { AdminInventoryService } from '../services/admin-inventory.service';
import { CreateInventoryDto } from '../dto/create-inventory.dto';
import { CreateVanLoadDto } from '../dto/create-van-load.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@ApiTags('Admin — Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/inventory')
export class AdminInventoryController {
  constructor(private readonly inventoryService: AdminInventoryService) {}

  @Get()
  @ApiOperation({ summary: 'List all inventory batches' })
  list(@Query() pagination: PaginationDto) {
    return this.inventoryService.listInventory(pagination.page, pagination.limit);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create inventory batch from vendor' })
  create(@Body() dto: CreateInventoryDto) {
    return this.inventoryService.createInventory(dto);
  }

  @Post('van-loads')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Load eggs from inventory onto a van assignment' })
  createVanLoad(@Body() dto: CreateVanLoadDto) {
    return this.inventoryService.createVanLoad(dto);
  }

  @Get('van-loads/:vanAssignmentId')
  @ApiOperation({ summary: 'Get van loads for a specific assignment' })
  getVanLoads(@Param('vanAssignmentId') vanAssignmentId: string) {
    return this.inventoryService.listVanLoads(vanAssignmentId);
  }
}
