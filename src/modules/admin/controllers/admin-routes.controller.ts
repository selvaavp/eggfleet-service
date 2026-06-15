import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { AdminRoutesService } from '../services/admin-routes.service';
import { CreateRouteDto, UpdateRouteDto } from '../dto/create-route.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@ApiTags('Admin — Routes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/routes')
export class AdminRoutesController {
  constructor(private readonly routesService: AdminRoutesService) {}

  @Get()
  @ApiOperation({ summary: 'List all routes' })
  list(@Query() pagination: PaginationDto) {
    return this.routesService.list(pagination.page, pagination.limit);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a route with optional store assignments' })
  create(@Body() dto: CreateRouteDto) {
    return this.routesService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get route with stores' })
  getById(@Param('id') id: string) {
    return this.routesService.getById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update route and stores' })
  update(@Param('id') id: string, @Body() dto: UpdateRouteDto) {
    return this.routesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete route' })
  remove(@Param('id') id: string) {
    return this.routesService.remove(id);
  }
}
