import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { Role } from '../../../common/enums/role.enum';
import { DriverDashboardService } from '../services/driver-dashboard.service';
import { NotificationsService } from '../../notifications/notifications.service';

@ApiTags('Driver — Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DRIVER)
@Controller('driver')
export class DriverDashboardController {
  constructor(
    private readonly dashboardService: DriverDashboardService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get driver dashboard (van, load summary, cash in hand)' })
  getDashboard(@CurrentUser() user: CurrentUserPayload) {
    return this.dashboardService.getDashboard(user.sub);
  }

  @Get('notifications/count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getNotificationCount(@CurrentUser() user: CurrentUserPayload) {
    const unreadCount = await this.notificationsService.getUnreadCount(user.sub);
    return { message: 'OK', data: { unreadCount } };
  }
}
