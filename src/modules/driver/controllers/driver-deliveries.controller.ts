import {
  Controller, Get, Post, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { Role } from '../../../common/enums/role.enum';
import { DriverDeliveriesService } from '../services/driver-deliveries.service';
import { CreateDeliveryDto } from '../dto/create-delivery.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DateFilterDto } from '../../../common/dto/date-filter.dto';

@ApiTags('Driver — Deliveries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DRIVER)
@Controller('driver')
export class DriverDeliveriesController {
  constructor(private readonly deliveriesService: DriverDeliveriesService) {}

  @Get('stores')
  @ApiOperation({ summary: 'Get stores on driver assigned route (for new delivery dropdown)' })
  getStores(@CurrentUser() user: CurrentUserPayload) {
    return this.deliveriesService.getStoresForDriver(user.sub);
  }

  @Get('van-loads')
  @ApiOperation({ summary: 'Get van loads for today active assignment (for Add Delivery Step 2)' })
  getVanLoads(@CurrentUser() user: CurrentUserPayload) {
    return this.deliveriesService.getVanLoads(user.sub);
  }

  @Get('deliveries/summary')
  @ApiOperation({ summary: 'Get delivery summary for a date' })
  getSummary(@CurrentUser() user: CurrentUserPayload, @Query() filter: DateFilterDto) {
    return this.deliveriesService.summary(user.sub, filter.date);
  }

  @Get('deliveries')
  @ApiOperation({ summary: 'List deliveries by date with pagination' })
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query() filter: DateFilterDto,
    @Query() pagination: PaginationDto,
  ) {
    return this.deliveriesService.list(user.sub, filter.date, pagination.page, pagination.limit);
  }

  @Post('deliveries')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new delivery' })
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateDeliveryDto) {
    return this.deliveriesService.create(user.sub, dto);
  }

  @Get('deliveries/:id')
  @ApiOperation({ summary: 'Get delivery detail by ID' })
  getById(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.deliveriesService.getById(id, user.sub);
  }

  @Get('deliveries/:storeId/unpaid')
  @ApiOperation({ summary: 'Get unpaid/ partial deliveries for a store' })
  getUnpaid(@Param('storeId') storeId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.deliveriesService.getUnpaidByStore(storeId, user.sub);
  }
}
