import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PAGINATION } from '../constants/app.constant';

export class PaginationDto {
  @ApiPropertyOptional({ default: PAGINATION.DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = PAGINATION.DEFAULT_PAGE;

  @ApiPropertyOptional({ default: PAGINATION.DEFAULT_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION.MAX_LIMIT)
  limit?: number = PAGINATION.DEFAULT_LIMIT;
}
