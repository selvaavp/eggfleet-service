import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { AdminEmployeesService } from '../services/admin-employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from '../dto/create-employee.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DateRangeFilterDto } from '../../../common/dto/date-filter.dto';

@ApiTags('Admin — Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/employees')
export class AdminEmployeesController {
  constructor(private readonly employeesService: AdminEmployeesService) {}

  @Get()
  @ApiOperation({ summary: 'List all drivers/employees' })
  list(@Query() pagination: PaginationDto) {
    return this.employeesService.list(pagination.page, pagination.limit);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new driver employee' })
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get employee summary stats' })
  getSummary(@Param('id') id: string, @Query() query: DateRangeFilterDto) {
    return this.employeesService.getEmployeeSummary(id, query.startDate, query.endDate);
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'Get employee delivery history' })
  getDeliveries(
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
    @Query() dateFilter: DateRangeFilterDto,
  ) {
    return this.employeesService.getEmployeeDeliveries(id, pagination.page, pagination.limit, dateFilter.startDate, dateFilter.endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee by ID' })
  getById(@Param('id') id: string) {
    return this.employeesService.getById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update employee info' })
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Activate or deactivate employee' })
  toggleStatus(@Param('id') id: string) {
    return this.employeesService.toggleStatus(id);
  }

  @Patch(':id/avatar')
  @ApiOperation({ summary: 'Upload employee profile picture' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = './uploads/avatars';
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require('fs').mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|webp)$/)) {
          return cb(new Error('Only JPEG, PNG or WebP images are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadAvatar(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.employeesService.uploadAvatar(id, file);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete employee' })
  delete(@Param('id') id: string) {
    return this.employeesService.delete(id);
  }
}
