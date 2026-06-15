import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Van } from '../../../database/entities/van.entity';
import { VanAssignment } from '../../../database/entities/van-assignment.entity';
import { VanLoad } from '../../../database/entities/van-load.entity';
import { Delivery } from '../../../database/entities/delivery.entity';
import { CreateVanDto, UpdateVanDto } from '../dto/create-van.dto';
import { normalizePagination, buildMeta } from '../../../common/utils/pagination.util';
import { DeliveryPaymentStatus } from '../../../common/enums/payment-status.enum';

@Injectable()
export class AdminVansService {
  constructor(
    @InjectRepository(Van) private vanRepo: Repository<Van>,
    @InjectRepository(VanAssignment) private assignmentRepo: Repository<VanAssignment>,
    @InjectRepository(VanLoad) private vanLoadRepo: Repository<VanLoad>,
    @InjectRepository(Delivery) private deliveryRepo: Repository<Delivery>,
  ) {}

  async list(page = 1, limit = 10) {
    const norm = normalizePagination({ page, limit });
    const [items, total] = await this.vanRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (norm.page - 1) * norm.limit,
      take: norm.limit,
    });
    return { message: 'Vans retrieved', data: items, meta: buildMeta(total, norm.page, norm.limit) };
  }

  async create(dto: CreateVanDto) {
    const existing = await this.vanRepo.findOne({ where: { vanNumber: dto.vanNumber } });
    if (existing) throw new ConflictException('Van with this number already exists');
    const van = this.vanRepo.create({
      vanNumber: dto.vanNumber,
      name: dto.name,
      loadCapacity: dto.loadCapacity ?? 0,
    });
    await this.vanRepo.save(van);
    return { message: 'Van created', data: van };
  }

  async getById(id: string) {
    const van = await this.vanRepo.findOne({ where: { id } });
    if (!van) throw new NotFoundException('Van not found');
    return { message: 'Van retrieved', data: van };
  }

  async update(id: string, dto: UpdateVanDto) {
    const van = await this.vanRepo.findOne({ where: { id } });
    if (!van) throw new NotFoundException('Van not found');
    if (dto.name !== undefined) van.name = dto.name;
    if (dto.loadCapacity !== undefined) van.loadCapacity = dto.loadCapacity;
    await this.vanRepo.save(van);
    return { message: 'Van updated', data: van };
  }

  async remove(id: string) {
    const van = await this.vanRepo.findOne({ where: { id } });
    if (!van) throw new NotFoundException('Van not found');
    van.isActive = false;
    await this.vanRepo.save(van);
    return { message: 'Van deactivated', data: null };
  }

  async getFleetOverview(date: string) {
    const vans = await this.vanRepo.find({ order: { name: 'ASC' } });

    const assignments = await this.assignmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.driver', 'driver')
      .leftJoinAndSelect('a.route', 'route')
      .where('a.assignedDate = :date', { date })
      .andWhere('a.status IN (:...statuses)', { statuses: ['ACTIVE', 'COMPLETED'] })
      .getMany();

    const assignIds = assignments.map((a) => a.id);
    let loadTotals: { vanAssignmentId: string; totalLoaded: string }[] = [];
    if (assignIds.length > 0) {
      loadTotals = await this.vanLoadRepo
        .createQueryBuilder('vl')
        .select('vl.vanAssignmentId', 'vanAssignmentId')
        .addSelect('SUM(vl.loadedUnits)', 'totalLoaded')
        .where('vl.vanAssignmentId IN (:...ids)', { ids: assignIds })
        .groupBy('vl.vanAssignmentId')
        .getRawMany();
    }

    const data = vans.map((van) => {
      const assignment = assignments.find((a) => a.vanId === van.id) ?? null;
      const totalLoaded = assignment
        ? parseInt(loadTotals.find((l) => l.vanAssignmentId === assignment.id)?.totalLoaded ?? '0', 10)
        : 0;
      return { ...van, assignment: assignment ? { ...assignment, totalLoaded } : null };
    });

    return { message: 'Fleet overview retrieved', data };
  }

  async getVanDetail(vanId: string, date: string, page: number, limit: number) {
    const van = await this.vanRepo.findOne({ where: { id: vanId } });
    if (!van) throw new NotFoundException('Van not found');

    const assignment = await this.assignmentRepo.findOne({
      where: { vanId, assignedDate: date },
      relations: ['driver', 'route'],
    });

    let stats = { totalLoaded: 0, totalSold: 0, currentBalance: 0 };
    let stockSpec: { ratePerUnit: number; loaded: number; sold: number; balance: number }[] = [];
    let routeActivity: { data: any[]; total: number; page: number; totalPages: number } = {
      data: [],
      total: 0,
      page,
      totalPages: 0,
    };

    if (assignment) {
      const vanLoads = await this.vanLoadRepo.find({ where: { vanAssignmentId: assignment.id } });

      stockSpec = vanLoads
        .map((vl) => ({
          ratePerUnit: Number(vl.ratePerUnit),
          loaded: vl.loadedUnits,
          sold: vl.soldUnits,
          balance: vl.loadedUnits - vl.soldUnits - vl.damagedUnits - vl.returnedUnits,
        }))
        .sort((a, b) => a.ratePerUnit - b.ratePerUnit);

      stats.totalLoaded = vanLoads.reduce((s, vl) => s + vl.loadedUnits, 0);
      stats.totalSold = vanLoads.reduce((s, vl) => s + vl.soldUnits, 0);
      stats.currentBalance = vanLoads.reduce(
        (s, vl) => s + (vl.loadedUnits - vl.soldUnits - vl.damagedUnits - vl.returnedUnits),
        0,
      );

      const norm = normalizePagination({ page, limit });
      const [deliveries, total] = await this.deliveryRepo.findAndCount({
        where: { vanAssignmentId: assignment.id },
        relations: ['store'],
        order: { createdAt: 'ASC' },
        skip: (norm.page - 1) * norm.limit,
        take: norm.limit,
      });

      routeActivity = {
        data: deliveries.map((d) => ({
          storeName: d.store?.name ?? '—',
          qtySold: d.totalUnits,
          paid: d.paymentStatus === DeliveryPaymentStatus.PAID ? Number(d.totalAmount) : 0,
          pending: d.paymentStatus !== DeliveryPaymentStatus.PAID ? Number(d.totalAmount) : 0,
        })),
        total,
        page: norm.page,
        totalPages: buildMeta(total, norm.page, norm.limit).totalPages,
      };
    }

    return { message: 'Van detail retrieved', data: { van, assignment, stats, stockSpec, routeActivity } };
  }
}
