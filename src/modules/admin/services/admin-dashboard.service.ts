import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Delivery } from '../../../database/entities/delivery.entity';
import { Payment } from '../../../database/entities/payment.entity';
import { VanAssignment } from '../../../database/entities/van-assignment.entity';
import { Handover } from '../../../database/entities/handover.entity';
import { Inventory } from '../../../database/entities/inventory.entity';
import { User } from '../../../database/entities/user.entity';
import { VanLoad } from '../../../database/entities/van-load.entity';
import { DamagedEgg } from '../../../database/entities/damaged-egg.entity';
import { Expense } from '../../../database/entities/expense.entity';
import { VendorPayment } from '../../../database/entities/vendor-payment.entity';
import { VanAssignmentStatus } from '../../../common/enums/van-assignment-status.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { Role } from '../../../common/enums/role.enum';
import { HandoverStatus } from '../../../common/enums/handover-status.enum';
import { DamageReason } from '../../../common/enums/damage-reason.enum';
import { todayIST } from '../../../common/utils/date.util';

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectRepository(Delivery) private deliveryRepo: Repository<Delivery>,
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(VanAssignment) private assignmentRepo: Repository<VanAssignment>,
    @InjectRepository(Handover) private handoverRepo: Repository<Handover>,
    @InjectRepository(Inventory) private inventoryRepo: Repository<Inventory>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(VanLoad) private vanLoadRepo: Repository<VanLoad>,
    @InjectRepository(DamagedEgg) private damagedEggRepo: Repository<DamagedEgg>,
    @InjectRepository(Expense) private expenseRepo: Repository<Expense>,
    @InjectRepository(VendorPayment) private vendorPaymentRepo: Repository<VendorPayment>,
  ) {}

  async getDashboard(month?: string) {
    const today = todayIST();

    // Resolve date range from optional month param (format: YYYY-MM)
    let startDate: string;
    let endDate: string;
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, mon] = month.split('-').map(Number);
      const lastDay = new Date(year, mon, 0).getDate();
      startDate = `${year}-${String(mon).padStart(2, '0')}-01`;
      endDate = `${year}-${String(mon).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    } else {
      startDate = today;
      endDate = today;
    }

    const [
      totalDeliveries,
      totalPayments,
      activeAssignments,
      pendingHandovers,
      totalEmployees,
      inventoryStock,
      pendingPayments,
      todayAssignments,
      damageLoadSum,
      damageTransitSum,
      totalExpensesSum,
      totalVendorPaymentsSum,
    ] = await Promise.all([
      this.deliveryRepo.count({ where: { deliveryDate: Between(startDate, endDate) } }),
      this.paymentRepo
        .createQueryBuilder('p')
        .select('SUM(p.amount)', 'total')
        .where("DATE(p.paymentDate) BETWEEN :startDate AND :endDate", { startDate, endDate })
        .andWhere("p.status != 'REJECTED'")
        .getRawOne(),
      this.assignmentRepo.count({ where: { assignedDate: Between(startDate, endDate), status: VanAssignmentStatus.ACTIVE } }),
      this.handoverRepo.count({ where: { handoverDate: Between(startDate, endDate), status: HandoverStatus.PENDING } }),
      this.userRepo.count({ where: { role: Role.DRIVER, isActive: true } }),
      this.inventoryRepo
        .createQueryBuilder('i')
        .select('SUM(i.available_units)', 'total')
        .addSelect('SUM(i.good_units)', 'goodTotal')
        .getRawOne(),
      this.paymentRepo.count({ where: { status: PaymentStatus.PENDING } }),
      this.assignmentRepo
        .createQueryBuilder('a')
        .leftJoinAndSelect('a.driver', 'driver')
        .leftJoinAndSelect('a.van', 'van')
        .leftJoinAndSelect('a.route', 'route')
        .where('a.assignedDate BETWEEN :startDate AND :endDate', { startDate, endDate })
        .orderBy('a.createdAt', 'DESC')
        .getMany(),
      this.damagedEggRepo
        .createQueryBuilder('d')
        .select('COALESCE(SUM(d.eggCount), 0)', 's')
        .where('d.damageDate BETWEEN :startDate AND :endDate', { startDate, endDate })
        .andWhere('d.reason IN (:...lr)', {
          lr: [DamageReason.LOADING, DamageReason.STORAGE],
        })
        .getRawOne(),
      this.damagedEggRepo
        .createQueryBuilder('d')
        .select('COALESCE(SUM(d.eggCount), 0)', 's')
        .where('d.damageDate BETWEEN :startDate AND :endDate', { startDate, endDate })
        .andWhere('d.reason = :tr', { tr: DamageReason.TRANSIT })
        .getRawOne(),
      this.expenseRepo
        .createQueryBuilder('e')
        .select('COALESCE(SUM(e.amount), 0)', 'total')
        .where('e.expense_date BETWEEN :startDate AND :endDate', { startDate, endDate })
        .getRawOne(),
      this.vendorPaymentRepo
        .createQueryBuilder('vp')
        .select('COALESCE(SUM(vp.amount), 0)', 'total')
        .where('vp.payment_date BETWEEN :startDate AND :endDate', { startDate, endDate })
        .getRawOne(),
    ]);

    const assignmentIds = todayAssignments.map((a) => a.id);
    const loadByAssignment: Record<string, { loaded: number; sold: number }> = {};
    if (assignmentIds.length > 0) {
      const rows = await this.vanLoadRepo
        .createQueryBuilder('vl')
        .select('vl.vanAssignmentId', 'assignmentId')
        .addSelect('COALESCE(SUM(vl.loadedUnits), 0)', 'loaded')
        .addSelect('COALESCE(SUM(vl.soldUnits), 0)', 'sold')
        .where('vl.vanAssignmentId IN (:...ids)', { ids: assignmentIds })
        .groupBy('vl.vanAssignmentId')
        .getRawMany();
      for (const row of rows) {
        loadByAssignment[String(row.assignmentId)] = {
          loaded: Number(row.loaded),
          sold: Number(row.sold),
        };
      }
    }

    const damagedEggsLoad = Number(damageLoadSum?.s ?? 0);
    const damagedEggsDelivery = Number(damageTransitSum?.s ?? 0);
    const totalCollected = Number(totalPayments?.total ?? 0);
    const totalExpenses = Number(totalExpensesSum?.total ?? 0);
    const totalVendorPayments = Number(totalVendorPaymentsSum?.total ?? 0);

    return {
      message: 'Dashboard loaded',
      data: {
        today,
        totalDeliveries,
        totalCollected,
        activeAssignments,
        pendingHandovers,
        totalEmployees,
        totalStock: Number(inventoryStock?.goodTotal ?? 0),
        availableStock: Number(inventoryStock?.total ?? 0),
        availableUnits: Number(inventoryStock?.total ?? 0),
        pendingPayments,
        damagedEggsToday: damagedEggsLoad + damagedEggsDelivery,
        damagedEggsLoad,
        damagedEggsDelivery,
        totalExpenses,
        totalVendorPayments,
        netProfit: totalCollected - totalVendorPayments - totalExpenses,
        vanStatus: todayAssignments.map((a) => {
          const L = loadByAssignment[a.id] ?? { loaded: 0, sold: 0 };
          const cap = a.van?.loadCapacity ?? 0;
          const balanceStock = Math.max(0, L.loaded - L.sold);
          return {
            assignmentId: a.id,
            driverName: a.driver?.name ?? '',
            vanNumber: a.van?.vanNumber ?? '',
            status: a.status,
            routeName: a.route?.name ?? '',
            loadedUnits: L.loaded,
            soldUnits: L.sold,
            balanceStock,
            loadCapacity: cap,
          };
        }),
      },
    };
  }
}
