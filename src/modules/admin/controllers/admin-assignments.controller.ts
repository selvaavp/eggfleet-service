import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { AdminAssignmentsService } from '../services/admin-assignments.service';
import { CreateVanAssignmentDto } from '../dto/create-van-assignment.dto';
import { UpdateVanAssignmentDto } from '../dto/update-van-assignment.dto';
import { VanAssignmentStatus } from '../../../common/enums/van-assignment-status.enum';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DateFilterDto } from '../../../common/dto/date-filter.dto';

@ApiTags('Admin — Van Assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/assignments')
export class AdminAssignmentsController {
  constructor(private readonly assignmentsService: AdminAssignmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List van assignments filtered by date' })
  list(@Query() filter: DateFilterDto, @Query() pagination: PaginationDto) {
    return this.assignmentsService.list(filter.date, pagination.page, pagination.limit);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a van assignment' })
  create(@Body() dto: CreateVanAssignmentDto) {
    return this.assignmentsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get assignment detail with van loads' })
  getById(@Param('id') id: string) {
    return this.assignmentsService.getById(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update assignment status. Body: { status: PENDING|IN_PROGRESS|COMPLETED }' })
  updateStatus(@Param('id') id: string, @Body('status') status: VanAssignmentStatus) {
    return this.assignmentsService.updateStatus(id, status);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update van assignment (driver, van, route)' })
  update(@Param('id') id: string, @Body() dto: UpdateVanAssignmentDto) {
    return this.assignmentsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete assignment and its van loads if no deliveries have started' })
  remove(@Param('id') id: string) {
    return this.assignmentsService.remove(id);
  }
}
