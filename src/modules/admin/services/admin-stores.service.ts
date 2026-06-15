import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from '../../../database/entities/store.entity';
import { Delivery } from '../../../database/entities/delivery.entity';
import { Payment } from '../../../database/entities/payment.entity';
import { CreateStoreDto, UpdateStoreDto } from '../dto/create-store.dto';
import { normalizePagination, buildMeta } from '../../../common/utils/pagination.util';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';

@Injectable()
export class AdminStoresService {
  constructor(
    @InjectRepository(Store) private storeRepo: Repository<Store>,
    @InjectRepository(Delivery) private deliveryRepo: Repository<Delivery>,
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
  ) {}

  async list(page = 1, limit = 10) {
    const norm = normalizePagination({ page, limit });
    const [items, total] = await this.storeRepo.findAndCount({
      relations: ['route'],
      order: { name: 'ASC' },
      skip: (norm.page - 1) * norm.limit,
      take: norm.limit,
    });
    return { message: 'Stores retrieved', data: items, meta: buildMeta(total, norm.page, norm.limit) };
  }

  async create(dto: CreateStoreDto) {
    const store = this.storeRepo.create({
      name: dto.name,
      ownerContactName: dto.ownerContactName ?? '',
      phone: dto.phone ?? '',
      address: dto.address ?? '',
      routeId: dto.routeId ?? null,
    });
    await this.storeRepo.save(store);
    return { message: 'Store created', data: store };
  }

  async getById(id: string) {
    const store = await this.storeRepo.findOne({ where: { id }, relations: ['route'] });
    if (!store) throw new NotFoundException('Store not found');
    return { message: 'Store retrieved', data: store };
  }

  async update(id: string, dto: UpdateStoreDto) {
    const store = await this.storeRepo.findOne({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');
    if (dto.name !== undefined) store.name = dto.name;
    if (dto.ownerContactName !== undefined) store.ownerContactName = dto.ownerContactName;
    if (dto.phone !== undefined) store.phone = dto.phone;
    if (dto.address !== undefined) store.address = dto.address;
    if (dto.routeId !== undefined) store.routeId = dto.routeId ?? null;
    if (dto.isActive !== undefined) store.isActive = dto.isActive;
    await this.storeRepo.save(store);
    return { message: 'Store updated', data: store };
  }

  async remove(id: string) {
    const store = await this.storeRepo.findOne({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');
    store.isActive = false;
    await this.storeRepo.save(store);
    return { message: 'Store deactivated', data: null };
  }

  async getStoreSummary(id: string, startDate?: string, endDate?: string) {
    const store = await this.storeRepo.findOne({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');

    const deliveryQb = this.deliveryRepo
      .createQueryBuilder('d')
      .where('d.storeId = :id', { id });
    if (startDate) deliveryQb.andWhere('d.deliveryDate >= :startDate', { startDate });
    if (endDate) deliveryQb.andWhere('d.deliveryDate <= :endDate', { endDate });

    const deliveries = await deliveryQb
      .select('COUNT(d.id)', 'totalDeliveries')
      .addSelect('COALESCE(SUM(d.totalAmount), 0)', 'totalSalesAmount')
      .getRawOne();

    const paymentQb = this.paymentRepo
      .createQueryBuilder('p')
      .where('p.storeId = :id', { id })
      .andWhere('p.status = :status', { status: PaymentStatus.APPROVED });
    if (startDate) paymentQb.andWhere('p.paymentDate >= :startDate', { startDate });
    if (endDate) paymentQb.andWhere('p.paymentDate <= :endDate', { endDate });

    const payments = await paymentQb
      .select('COALESCE(SUM(p.amount), 0)', 'totalCollected')
      .getRawOne();

    const totalSalesAmount = Number(deliveries?.totalSalesAmount ?? 0);
    const totalCollected = Number(payments?.totalCollected ?? 0);

    return {
      message: 'Store summary retrieved',
      data: {
        totalDeliveries: Number(deliveries?.totalDeliveries ?? 0),
        totalSalesAmount,
        totalCollected,
        pendingAmount: Math.max(0, totalSalesAmount - totalCollected),
      },
    };
  }

  async getStoreDeliveries(id: string, page = 1, limit = 10, startDate?: string, endDate?: string) {
    const store = await this.storeRepo.findOne({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');

    const norm = normalizePagination({ page, limit });
    const qb = this.deliveryRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.vanAssignment', 'va')
      .leftJoinAndSelect('va.van', 'van')
      .where('d.storeId = :id', { id })
      .orderBy('d.deliveryDate', 'DESC')
      .addOrderBy('d.createdAt', 'DESC')
      .skip((norm.page - 1) * norm.limit)
      .take(norm.limit);

    if (startDate) qb.andWhere('d.deliveryDate >= :startDate', { startDate });
    if (endDate) qb.andWhere('d.deliveryDate <= :endDate', { endDate });

    const [deliveries, total] = await qb.getManyAndCount();

    // Fetch approved payment methods for these deliveries
    const deliveryIds = deliveries.map((d) => d.id);
    let paymentMap = new Map<string, string>();
    if (deliveryIds.length > 0) {
      const rows = await this.deliveryRepo.manager
        .createQueryBuilder()
        .select('pd.delivery_id', 'deliveryId')
        .addSelect('p.payment_method', 'paymentMethod')
        .from('payment_deliveries', 'pd')
        .innerJoin('payments', 'p', 'p.id = pd.payment_id AND p.status = :status', { status: PaymentStatus.APPROVED })
        .where('pd.delivery_id IN (:...ids)', { ids: deliveryIds })
        .getRawMany();
      paymentMap = new Map(rows.map((r) => [r.deliveryId, r.paymentMethod]));
    }

    const data = deliveries.map((d) => ({
      id: d.id,
      deliveryDate: d.deliveryDate,
      vanName: d.vanAssignment?.van?.vanNumber ?? '—',
      ratePerUnit: d.totalUnits > 0 ? Number(d.totalAmount) / d.totalUnits : 0,
      totalUnits: d.totalUnits,
      totalAmount: Number(d.totalAmount),
      paymentMethod: paymentMap.get(d.id) ?? null,
      paymentStatus: d.paymentStatus,
      createdAt: d.createdAt,
    }));

    return { message: 'Store deliveries retrieved', data, meta: buildMeta(total, norm.page, norm.limit) };
  }
}
