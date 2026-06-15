import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { AdminDashboardService } from '../services/admin-dashboard.service';

@ApiTags('Admin — Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard summary' })
  getDashboard(@Query('month') month?: string) {
    return this.dashboardService.getDashboard(month);
  }
}
