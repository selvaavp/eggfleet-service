import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from '../../../database/entities/expense.entity';
import { Payment } from '../../../database/entities/payment.entity';
import { VendorPayment } from '../../../database/entities/vendor-payment.entity';
import { ExpenseCategory } from '../../../common/enums/expense-category.enum';
import { CreateExpenseDto } from '../dto/create-expense.dto';
import { normalizePagination, buildMeta } from '../../../common/utils/pagination.util';

@Injectable()
export class AdminExpensesService {
  constructor(
    @InjectRepository(Expense) private expenseRepo: Repository<Expense>,
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(VendorPayment) private vendorPaymentRepo: Repository<VendorPayment>,
  ) {}

  async list(startDate?: string, endDate?: string, category?: ExpenseCategory, page = 1, limit = 10) {
    const norm = normalizePagination({ page, limit });
    const qb = this.expenseRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.van', 'van')
      .leftJoinAndSelect('e.createdByUser', 'createdByUser')
      .orderBy('e.expenseDate', 'DESC')
      .addOrderBy('e.createdAt', 'DESC')
      .skip((norm.page - 1) * norm.limit)
      .take(norm.limit);

    if (startDate && endDate) {
      qb.where('e.expense_date BETWEEN :startDate AND :endDate', { startDate, endDate });
    } else if (startDate) {
      qb.where('e.expense_date >= :startDate', { startDate });
    } else if (endDate) {
      qb.where('e.expense_date <= :endDate', { endDate });
    }

    if (category) qb.andWhere('e.category = :category', { category });

    const [items, total] = await qb.getManyAndCount();
    return {
      message: 'Expenses retrieved',
      data: items.map((e) => ({
        id: e.id,
        category: e.category,
        title: e.title,
        amount: Number(e.amount),
        expenseDate: e.expenseDate,
        vanId: e.vanId,
        van: e.van ? { id: e.van.id, name: e.van.name, vanNumber: e.van.vanNumber } : null,
        notes: e.notes,
        createdBy: e.createdBy,
        createdByName: e.createdByUser?.name ?? null,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      })),
      meta: buildMeta(total, norm.page, norm.limit),
    };
  }

  async create(dto: CreateExpenseDto, adminId: string) {
    if (dto.category === ExpenseCategory.VEHICLE && !dto.vanId) {
      throw new BadRequestException('Select a vehicle for vehicle expenses');
    }
    const entry = this.expenseRepo.create({
      ...dto,
      vanId: dto.category === ExpenseCategory.VEHICLE ? dto.vanId : null,
      createdBy: adminId,
    });
    const saved = await this.expenseRepo.save(entry);
    return { message: 'Expense recorded', data: saved };
  }

  async getById(id: string) {
    const entry = await this.expenseRepo.findOne({ where: { id }, relations: ['van', 'createdByUser'] });
    if (!entry) throw new NotFoundException('Expense not found');
    return { message: 'Expense retrieved', data: entry };
  }

  async update(id: string, dto: Partial<CreateExpenseDto>) {
    const entry = await this.expenseRepo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException('Expense not found');

    const category = dto.category ?? entry.category;
    if (category === ExpenseCategory.VEHICLE && !(dto.vanId ?? entry.vanId)) {
      throw new BadRequestException('Select a vehicle for vehicle expenses');
    }

    Object.assign(entry, dto);
    if (category === ExpenseCategory.COMPANY) entry.vanId = null;
    await this.expenseRepo.save(entry);
    return { message: 'Expense updated', data: entry };
  }

  async remove(id: string) {
    const entry = await this.expenseRepo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException('Expense not found');
    await this.expenseRepo.remove(entry);
    return { message: 'Expense deleted' };
  }

  async getSummary(startDate?: string, endDate?: string) {
    const expenseQb = this.expenseRepo
      .createQueryBuilder('e')
      .select('e.category', 'category')
      .addSelect('COALESCE(SUM(e.amount), 0)', 'total')
      .groupBy('e.category');

    const collectedQb = this.paymentRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .where("p.status != 'REJECTED'");

    const vendorPaymentsQb = this.vendorPaymentRepo
      .createQueryBuilder('vp')
      .select('COALESCE(SUM(vp.amount), 0)', 'total');

    if (startDate && endDate) {
      expenseQb.where('e.expense_date BETWEEN :startDate AND :endDate', { startDate, endDate });
      collectedQb.andWhere('DATE(p.paymentDate) BETWEEN :startDate AND :endDate', { startDate, endDate });
      vendorPaymentsQb.where('vp.payment_date BETWEEN :startDate AND :endDate', { startDate, endDate });
    } else if (startDate) {
      expenseQb.where('e.expense_date >= :startDate', { startDate });
      collectedQb.andWhere('DATE(p.paymentDate) >= :startDate', { startDate });
      vendorPaymentsQb.where('vp.payment_date >= :startDate', { startDate });
    } else if (endDate) {
      expenseQb.where('e.expense_date <= :endDate', { endDate });
      collectedQb.andWhere('DATE(p.paymentDate) <= :endDate', { endDate });
      vendorPaymentsQb.where('vp.payment_date <= :endDate', { endDate });
    }

    const [rows, collectedSum, vendorPaymentsSum] = await Promise.all([
      expenseQb.getRawMany(),
      collectedQb.getRawOne(),
      vendorPaymentsQb.getRawOne(),
    ]);

    const byCategory = { COMPANY: 0, VEHICLE: 0, OTHER: 0 };
    let totalExpenses = 0;
    for (const row of rows) {
      const amount = Number(row.total);
      byCategory[row.category as ExpenseCategory] = amount;
      totalExpenses += amount;
    }

    const totalCollected = Number(collectedSum?.total ?? 0);
    const totalVendorPayments = Number(vendorPaymentsSum?.total ?? 0);
    const netProfit = totalCollected - totalVendorPayments - totalExpenses;

    return {
      message: 'Expense summary retrieved',
      data: { totalExpenses, byCategory, totalCollected, totalVendorPayments, netProfit },
    };
  }
}
