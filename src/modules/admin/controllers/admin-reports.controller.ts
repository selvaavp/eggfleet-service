import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { AdminReportsService } from '../services/admin-reports.service';

@ApiTags('Admin — Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly reportsService: AdminReportsService) {}

  @Get('daily-summary')
  @ApiOperation({ summary: 'Get detailed daily operations and financial sales report' })
  @ApiQuery({ name: 'date', required: false, description: 'Target date in YYYY-MM-DD format (defaults to today IST)' })
  getDailySummary(@Query('date') date?: string) {
    return this.reportsService.getDailySummary(date);
  }
}
