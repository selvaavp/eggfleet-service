import { Controller, Get, Patch, Param, Query, UseGuards, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { Role } from '../../../common/enums/role.enum';
import { AdminHandoversService } from '../services/admin-handovers.service';
import { HandoverStatus } from '../../../common/enums/handover-status.enum';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DateFilterDto } from '../../../common/dto/date-filter.dto';

@ApiTags('Admin — Handovers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/handovers')
export class AdminHandoversController {
  constructor(private readonly handoversService: AdminHandoversService) {}

  @Get()
  @ApiOperation({ summary: 'List handovers filtered by date' })
  list(@Query() filter: DateFilterDto, @Query() pagination: PaginationDto) {
    return this.handoversService.list(filter.date, pagination.page, pagination.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get handover detail' })
  getById(@Param('id') id: string) {
    return this.handoversService.getById(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Approve or reject handover. Body: { status: APPROVED|REJECTED, rejectionReason? }' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: HandoverStatus,
    @Body('rejectionReason') rejectionReason: string | undefined,
    @CurrentUser() admin: CurrentUserPayload,
  ) {
    return this.handoversService.updateStatus(id, status, admin.sub, rejectionReason);
  }
}
