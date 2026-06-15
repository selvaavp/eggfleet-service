import {
  Controller, Get, Post, Body, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { Role } from '../../../common/enums/role.enum';
import { DriverHandoversService } from '../services/driver-handovers.service';
import { CreateHandoverDto } from '../dto/create-handover.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DateFilterDto } from '../../../common/dto/date-filter.dto';

@ApiTags('Driver — Handovers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DRIVER)
@Controller('driver')
export class DriverHandoversController {
  constructor(private readonly handoversService: DriverHandoversService) {}

  @Get('admins')
  @ApiOperation({ summary: 'List admins for handover "handed to" dropdown' })
  getAdmins() {
    return this.handoversService.getAdmins();
  }

  @Get('handover/summary')
  @ApiOperation({ summary: 'Get pre-populated handover summary (cash total + van load items)' })
  getSummary(@CurrentUser() user: CurrentUserPayload) {
    return this.handoversService.getSummary(user.sub);
  }

  @Post('handovers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit daily cash + egg handover' })
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateHandoverDto) {
    return this.handoversService.create(user.sub, dto);
  }

  @Get('handovers')
  @ApiOperation({ summary: 'Get handover history' })
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query() filter: DateFilterDto,
    @Query() pagination: PaginationDto,
  ) {
    return this.handoversService.list(user.sub, filter.date, pagination.page, pagination.limit);
  }
}
