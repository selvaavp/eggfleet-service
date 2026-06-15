import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Route } from '../../../database/entities/route.entity';
import { Store } from '../../../database/entities/store.entity';
import { RouteStore } from '../../../database/entities/route-store.entity';
import { CreateRouteDto, UpdateRouteDto } from '../dto/create-route.dto';
import { normalizePagination, buildMeta } from '../../../common/utils/pagination.util';

@Injectable()
export class AdminRoutesService {
  constructor(
    @InjectRepository(Route) private routeRepo: Repository<Route>,
    @InjectRepository(Store) private storeRepo: Repository<Store>,
    @InjectRepository(RouteStore) private routeStoreRepo: Repository<RouteStore>,
  ) {}

  async list(page = 1, limit = 10) {
    const norm = normalizePagination({ page, limit });
    const [items, total] = await this.routeRepo.findAndCount({
      order: { name: 'ASC' },
      skip: (norm.page - 1) * norm.limit,
      take: norm.limit,
    });

    let countMap = new Map<string, number>();
    if (items.length > 0) {
      const counts = await this.storeRepo
        .createQueryBuilder('s')
        .select('s.route_id', 'routeId')
        .addSelect('COUNT(s.id)', 'count')
        .where('s.route_id IN (:...ids)', { ids: items.map((r) => r.id) })
        .groupBy('s.route_id')
        .getRawMany();
      countMap = new Map(counts.map((c) => [c.routeId, Number(c.count)]));
    }

    const data = items.map((r) => ({ ...r, storeCount: countMap.get(r.id) ?? 0 }));
    return { message: 'Routes retrieved', data, meta: buildMeta(total, norm.page, norm.limit) };
  }

  async getById(id: string) {
    const route = await this.routeRepo.findOne({ where: { id }, relations: ['routeStores', 'routeStores.store'] });
    if (!route) throw new NotFoundException('Route not found');
    return { message: 'Route retrieved', data: route };
  }

  async create(dto: CreateRouteDto) {
    const existing = await this.routeRepo.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Route with this name already exists');
    const route = this.routeRepo.create({ name: dto.name, description: dto.description });
    await this.routeRepo.save(route);
    if (dto.storeIds?.length) await this.assignStores(route.id, dto.storeIds);
    return { message: 'Route created', data: route };
  }

  async update(id: string, dto: UpdateRouteDto) {
    const route = await this.routeRepo.findOne({ where: { id } });
    if (!route) throw new NotFoundException('Route not found');
    if (dto.name) route.name = dto.name;
    if (dto.description !== undefined) route.description = dto.description;
    if (dto.isActive !== undefined) route.isActive = dto.isActive;
    await this.routeRepo.save(route);
    if (dto.storeIds) {
      await this.routeStoreRepo.delete({ routeId: id });
      await this.assignStores(id, dto.storeIds);
    }
    return { message: 'Route updated', data: route };
  }

  async remove(id: string) {
    const route = await this.routeRepo.findOne({ where: { id } });
    if (!route) throw new NotFoundException('Route not found');
    await this.routeRepo.delete(id);
    return { message: 'Route deleted', data: null };
  }

  private async assignStores(routeId: string, storeIds: string[]) {
    const entries = storeIds.map((storeId, idx) =>
      this.routeStoreRepo.create({ routeId, storeId, sortOrder: idx + 1 }),
    );
    await this.routeStoreRepo.save(entries);
  }
}
