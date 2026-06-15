import { IsUUID, IsEnum, IsDateString, IsString, IsOptional, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory } from '../../../common/enums/expense-category.enum';

export class CreateExpenseDto {
  @ApiProperty({ enum: ExpenseCategory })
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @ApiProperty({ description: 'Free-text label for the expense, e.g. "Diesel refill"' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'Date of expense (YYYY-MM-DD)' })
  @IsDateString()
  expenseDate: string;

  @ApiPropertyOptional({ description: 'Required when category is VEHICLE' })
  @IsOptional()
  @IsUUID()
  vanId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
