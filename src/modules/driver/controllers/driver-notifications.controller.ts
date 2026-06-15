import { Controller, Get, Put, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { Role } from '../../../common/enums/role.enum';
import { NotificationsService } from '../../notifications/notifications.service';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@ApiTags('Driver — Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DRIVER)
@Controller('driver/notifications')
export class DriverNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get driver notifications' })
  list(@CurrentUser() user: CurrentUserPayload, @Query() pagination: PaginationDto) {
    return this.notificationsService.getForUser(user.sub, pagination.page, pagination.limit);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark single notification as read' })
  async markRead(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.notificationsService.markRead(id, user.sub);
    return { message: 'Notification marked as read', data: null };
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser() user: CurrentUserPayload) {
    await this.notificationsService.markAllRead(user.sub);
    return { message: 'All notifications marked as read', data: null };
  }
}
