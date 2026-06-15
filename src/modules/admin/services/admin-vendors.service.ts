import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from '../../../database/entities/vendor.entity';
import { Inventory } from '../../../database/entities/inventory.entity';
import { VendorPayment } from '../../../database/entities/vendor-payment.entity';
import { VanLoad } from '../../../database/entities/van-load.entity';
import { CreateVendorDto, UpdateVendorDto } from '../dto/create-vendor.dto';
import { encrypt, decrypt } from '../../../common/utils/encryption.util';
import { normalizePagination, buildMeta } from '../../../common/utils/pagination.util';

@Injectable()
export class AdminVendorsService {
  constructor(
    @InjectRepository(Vendor) private vendorRepo: Repository<Vendor>,
    @InjectRepository(Inventory) private inventoryRepo: Repository<Inventory>,
    @InjectRepository(VendorPayment) private vendorPaymentRepo: Repository<VendorPayment>,
    @InjectRepository(VanLoad) private vanLoadRepo: Repository<VanLoad>,
  ) {}

  private encryptSensitive(data: Record<string, unknown>): Record<string, unknown> {
    const result = { ...data };
    const fields = ['aadharNumber', 'bankName', 'bankAccountNumber', 'bankIfsc'] as const;
    for (const field of fields) {
      if (result[field]) result[field] = encrypt(result[field] as string);
    }
    return result;
  }

  private decryptVendor(vendor: Vendor): Record<string, unknown> {
    const result: Record<string, unknown> = { ...vendor };
    const fields = ['aadharNumber', 'bankName', 'bankAccountNumber', 'bankIfsc'] as const;
    for (const field of fields) {
      if (result[field]) {
        try { result[field] = decrypt(result[field] as string); } catch { /* plain */ }
      }
    }
    return result;
  }

  async list(page = 1, limit = 10) {
    const norm = normalizePagination({ page, limit });
    const [items, total] = await this.vendorRepo.findAndCount({
      order: { name: 'ASC' },
      skip: (norm.page - 1) * norm.limit,
      take: norm.limit,
    });
    return { message: 'Vendors retrieved', data: items.map(v => this.decryptVendor(v)), meta: buildMeta(total, norm.page, norm.limit) };
  }

  private generateVendorCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `VND-${timestamp}-${random}`;
  }

  async create(dto: CreateVendorDto) {
    const raw = this.encryptSensitive({
      vendorCode: this.generateVendorCode(),
      name: dto.name,
      phone: dto.phone,
      address: dto.address ?? '',
      aadharNumber: dto.aadharNumber ?? null,
      bankName: dto.bankName ?? null,
      bankAccountNumber: dto.bankAccountNumber ?? null,
      bankIfsc: dto.bankIfsc ?? null,
    });
    const vendor = this.vendorRepo.create(raw as Partial<Vendor>);
    await this.vendorRepo.save(vendor);
    return { message: 'Vendor created', data: this.decryptVendor(vendor) };
  }

  async getById(id: string) {
    const vendor = await this.vendorRepo.findOne({ where: { id } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return { message: 'Vendor retrieved', data: this.decryptVendor(vendor) };
  }

  async update(id: string, dto: UpdateVendorDto) {
    const vendor = await this.vendorRepo.findOne({ where: { id } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    Object.assign(vendor, this.encryptSensitive(dto as Record<string, unknown>));
    await this.vendorRepo.save(vendor);
    return { message: 'Vendor updated', data: this.decryptVendor(vendor) };
  }

  async remove(id: string) {
    const vendor = await this.vendorRepo.findOne({ where: { id } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    await this.vendorRepo.remove(vendor);
    return { message: 'Vendor deleted', data: null };
  }

  async getVendorSummary(vendorId: string, startDate?: string, endDate?: string) {
    const vendor = await this.vendorRepo.findOne({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const invQb = this.inventoryRepo.createQueryBuilder('inv')
      .where('inv.vendorId = :vendorId', { vendorId });
    if (startDate) invQb.andWhere('inv.purchaseDate >= :startDate', { startDate });
    if (endDate) invQb.andWhere('inv.purchaseDate <= :endDate', { endDate });

    const invStats = await invQb
      .select('COALESCE(SUM(inv.totalUnits), 0)', 'totalEggsPurchased')
      .addSelect('COALESCE(SUM(inv.damagedUnits), 0)', 'damagedEggs')
      .addSelect('COALESCE(SUM(inv.totalAmount), 0)', 'saleEggValue')
      .getRawOne<{ totalEggsPurchased: string; damagedEggs: string; saleEggValue: string }>();

    const vpQb = this.vendorPaymentRepo.createQueryBuilder('vp')
      .where('vp.vendorId = :vendorId', { vendorId })
      .andWhere("vp.status != 'PENDING'");
    if (startDate) vpQb.andWhere('vp.paymentDate >= :startDate', { startDate });
    if (endDate) vpQb.andWhere('vp.paymentDate <= :endDate', { endDate });
    const vpStats = await vpQb
      .select('COALESCE(SUM(vp.amount), 0)', 'totalPaid')
      .getRawOne<{ totalPaid: string }>();

    const vlQb = this.vanLoadRepo.createQueryBuilder('vl')
      .innerJoin('vl.inventory', 'inv', 'inv.vendorId = :vendorId', { vendorId })
      .innerJoin('vl.vanAssignment', 'va')
      .select('COALESCE(SUM(CAST(vl.soldUnits AS DECIMAL) * CAST(vl.ratePerUnit AS DECIMAL)), 0)', 'soldRevenue');
    if (startDate) vlQb.andWhere('va.assignedDate >= :startDate', { startDate });
    if (endDate) vlQb.andWhere('va.assignedDate <= :endDate', { endDate });
    const vlStats = await vlQb.getRawOne<{ soldRevenue: string }>();

    const totalEggsPurchased = Number(invStats?.totalEggsPurchased) || 0;
    const damagedEggs = Number(invStats?.damagedEggs) || 0;
    const saleEggValue = Number(invStats?.saleEggValue) || 0;
    const totalPaid = Number(vpStats?.totalPaid) || 0;
    const soldRevenue = Number(vlStats?.soldRevenue) || 0;
    const pendingAmount = Math.max(0, saleEggValue - totalPaid);
    const netProfit = soldRevenue - saleEggValue;

    return {
      message: 'Vendor summary retrieved',
      data: { totalEggsPurchased, saleEggValue, netProfit, pendingAmount, damagedEggs, totalPaid },
    };
  }

  async getVendorPurchases(vendorId: string, page = 1, limit = 10, startDate?: string, endDate?: string) {
    const vendor = await this.vendorRepo.findOne({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const norm = normalizePagination({ page, limit });
    const qb = this.inventoryRepo.createQueryBuilder('inv')
      .leftJoinAndSelect('inv.vendor', 'vendor')
      .where('inv.vendorId = :vendorId', { vendorId })
      .orderBy('inv.purchaseDate', 'DESC')
      .addOrderBy('inv.createdAt', 'DESC')
      .skip((norm.page - 1) * norm.limit)
      .take(norm.limit);

    if (startDate) qb.andWhere('inv.purchaseDate >= :startDate', { startDate });
    if (endDate) qb.andWhere('inv.purchaseDate <= :endDate', { endDate });

    const [items, total] = await qb.getManyAndCount();
    return { message: 'Purchase history retrieved', data: items, meta: buildMeta(total, norm.page, norm.limit) };
  }

  async getVendorPaymentHistory(vendorId: string, page = 1, limit = 10, startDate?: string, endDate?: string) {
    const vendor = await this.vendorRepo.findOne({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const norm = normalizePagination({ page, limit });
    const qb = this.vendorPaymentRepo.createQueryBuilder('vp')
      .leftJoinAndSelect('vp.vendor', 'vendor')
      .where('vp.vendorId = :vendorId', { vendorId })
      .orderBy('vp.paymentDate', 'DESC')
      .addOrderBy('vp.createdAt', 'DESC')
      .skip((norm.page - 1) * norm.limit)
      .take(norm.limit);

    if (startDate) qb.andWhere('vp.paymentDate >= :startDate', { startDate });
    if (endDate) qb.andWhere('vp.paymentDate <= :endDate', { endDate });

    const [items, total] = await qb.getManyAndCount();
    return { message: 'Payment history retrieved', data: items, meta: buildMeta(total, norm.page, norm.limit) };
  }
}
