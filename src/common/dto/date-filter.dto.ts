import { IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DateFilterDto {
  @ApiPropertyOptional({ example: '2026-05-09' })
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class DateRangeFilterDto {
  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-05-09' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
