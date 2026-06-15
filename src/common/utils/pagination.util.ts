import { SelectQueryBuilder } from 'typeorm';
import { PAGINATION } from '../constants/app.constant';
import { PaginationMeta } from '../interfaces/paginated-response.interface';

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export function normalizePagination(params: PaginationParams): Required<PaginationParams> {
  return {
    page: Math.max(1, params.page ?? PAGINATION.DEFAULT_PAGE),
    limit: Math.min(
      Math.max(1, params.limit ?? PAGINATION.DEFAULT_LIMIT),
      PAGINATION.MAX_LIMIT,
    ),
  };
}

export function buildMeta(total: number, page: number, limit: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function paginate<T>(
  qb: SelectQueryBuilder<T>,
  page: number,
  limit: number,
): Promise<{ items: T[]; total: number }> {
  const [items, total] = await qb
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();
  return { items, total };
}
