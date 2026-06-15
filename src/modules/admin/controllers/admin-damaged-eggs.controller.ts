import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { Role } from '../../../common/enums/role.enum';
import { AdminDamagedEggsService } from '../services/admin-damaged-eggs.service';
import { CreateDamagedEggDto } from '../dto/create-damaged-egg.dto';
import { DamageReason } from '../../../common/enums/damage-reason.enum';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DateFilterDto } from '../../../common/dto/date-filter.dto';

@ApiTags('Admin — Damaged Eggs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/inventory/damaged')
export class AdminDamagedEggsController {
  constructor(private readonly damagedEggsService: AdminDamagedEggsService) {}

  @Get()
  @ApiOperation({ summary: 'List damaged egg records with optional date/reason filter' })
  @ApiQuery({ name: 'reason', enum: DamageReason, required: false })
  list(
    @Query() filter: DateFilterDto,
    @Query('reason') reason: DamageReason | undefined,
    @Query() pagination: PaginationDto,
  ) {
    return this.damagedEggsService.list(filter.date, reason, pagination.page, pagination.limit);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a damaged egg entry' })
  create(@Body() dto: CreateDamagedEggDto, @CurrentUser() admin: CurrentUserPayload) {
    return this.damagedEggsService.create(dto, admin.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a damaged egg record by ID' })
  getById(@Param('id') id: string) {
    return this.damagedEggsService.getById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a damaged egg record' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateDamagedEggDto>) {
    return this.damagedEggsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a damaged egg record' })
  remove(@Param('id') id: string) {
    return this.damagedEggsService.remove(id);
  }
}
