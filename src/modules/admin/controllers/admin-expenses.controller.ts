import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { Role } from '../../../common/enums/role.enum';
import { ExpenseCategory } from '../../../common/enums/expense-category.enum';
import { AdminExpensesService } from '../services/admin-expenses.service';
import { CreateExpenseDto } from '../dto/create-expense.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DateRangeFilterDto } from '../../../common/dto/date-filter.dto';

@ApiTags('Admin — Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/expenses')
export class AdminExpensesController {
  constructor(private readonly expensesService: AdminExpensesService) {}

  @Get()
  @ApiOperation({ summary: 'List expenses with optional date range/category filter' })
  @ApiQuery({ name: 'category', enum: ExpenseCategory, required: false })
  list(
    @Query() filter: DateRangeFilterDto,
    @Query('category') category: ExpenseCategory | undefined,
    @Query() pagination: PaginationDto,
  ) {
    return this.expensesService.list(filter.startDate, filter.endDate, category, pagination.page, pagination.limit);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get total expenses and breakdown by category for a date range' })
  getSummary(@Query() filter: DateRangeFilterDto) {
    return this.expensesService.getSummary(filter.startDate, filter.endDate);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record an expense' })
  create(@Body() dto: CreateExpenseDto, @CurrentUser() admin: CurrentUserPayload) {
    return this.expensesService.create(dto, admin.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an expense by ID' })
  getById(@Param('id') id: string) {
    return this.expensesService.getById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an expense' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateExpenseDto>) {
    return this.expensesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an expense' })
  remove(@Param('id') id: string) {
    return this.expensesService.remove(id);
  }
}
