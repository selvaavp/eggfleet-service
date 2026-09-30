import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Delivery } from '../../../database/entities/delivery.entity';
import { DeliveryItem } from '../../../database/entities/delivery-item.entity';
import { Payment } from '../../../database/entities/payment.entity';
import { VanAssignment } from '../../../database/entities/van-assignment.entity';
import { VanLoad } from '../../../database/entities/van-load.entity';
import { DamagedEgg } from '../../../database/entities/damaged-egg.entity';
import { Handover } from '../../../database/entities/handover.entity';
import { Store } from '../../../database/entities/store.entity';
import { User } from '../../../database/entities/user.entity';
import { Van } from '../../../database/entities/van.entity';
import { PaymentMethod } from '../../../common/enums/payment-method.enum';
import { todayIST } from '../../../common/utils/date.util';

export interface RateBreakdown {
  ratePerUnit: number;
  eggCount: number;
  totalAmount: number;
  storesCount: number;
  storeNames: string[];
}

export interface DriverStoreDeliveryItem {
  storeId: string;
  storeName: string;
  ownerName: string;
  phone: string;
  unitsDelivered: number;
  rateText: string;
  totalAmount: number;
  cashCollected: number;
  upiCollected: number;
  totalCollected: number;
  pendingAmount: number;
  paymentStatus: string;
}

export interface DriverDailyReport {
  assignmentId: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  vanId: string;
  vanNumber: string;
  vanCapacity: number;
  routeName: string;
  status: string;
  loadedUnits: number;
  soldUnits: number;
  damagedUnits: number;
  balanceUnits: number;
  rateBreakdown: RateBreakdown[];
  storesDeliveredCount: number;
  storesList: DriverStoreDeliveryItem[];
  totalSaleAmount: number;
  cashCollected: number;
  upiCollected: number;
  totalCollected: number;
  pendingAmount: number;
}

export interface StoreDeliveryReport {
  deliveryId: string;
  storeId: string;
  storeName: string;
  ownerName: string;
  phone: string;
  driverName: string;
  vanNumber: string;
  unitsDelivered: number;
  ratePerUnitText: string;
  totalAmount: number;
  cashCollected: number;
  upiCollected: number;
  totalCollected: number;
  pendingDue: number;
  paymentStatus: string;
  createdAt: Date;
}

export interface DailySummaryResponse {
  date: string;
  overall: {
    totalEggsLoaded: number;
    totalEggsSold: number;
    totalEggsDamaged: number;
    totalBalanceEggs: number;
    totalStoresDelivered: number;
    totalDeliveriesCount: number;
    totalSaleAmount: number;
    totalCashCollected: number;
    totalUpiCollected: number;
    totalCollectedAmount: number;
    totalPendingAmount: number;
    activeDriversCount: number;
    activeVansCount: number;
  };
  rateDistribution: RateBreakdown[];
  driverSummaries: DriverDailyReport[];
  storeDeliveries: StoreDeliveryReport[];
}

@Injectable()
export class AdminReportsService {
  constructor(
    @InjectRepository(Delivery) private deliveryRepo: Repository<Delivery>,
    @InjectRepository(DeliveryItem) private deliveryItemRepo: Repository<DeliveryItem>,
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(VanAssignment) private assignmentRepo: Repository<VanAssignment>,
    @InjectRepository(VanLoad) private vanLoadRepo: Repository<VanLoad>,
    @InjectRepository(DamagedEgg) private damagedEggRepo: Repository<DamagedEgg>,
    @InjectRepository(Handover) private handoverRepo: Repository<Handover>,
    @InjectRepository(Store) private storeRepo: Repository<Store>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Van) private vanRepo: Repository<Van>,
  ) {}

  async getDailySummary(selectedDate?: string): Promise<{ message: string; data: DailySummaryResponse }> {
    const targetDate = selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate) ? selectedDate : todayIST();

    // 1. Fetch all assignments on this date
    const assignments = await this.assignmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.driver', 'driver')
      .leftJoinAndSelect('a.van', 'van')
      .leftJoinAndSelect('a.route', 'route')
      .where('a.assignedDate = :targetDate', { targetDate })
      .orderBy('a.createdAt', 'ASC')
      .getMany();

    const assignmentIds = assignments.map((a) => a.id);

    // 2. Fetch van loads for these assignments
    let vanLoads: VanLoad[] = [];
    if (assignmentIds.length > 0) {
      vanLoads = await this.vanLoadRepo
        .createQueryBuilder('vl')
        .leftJoinAndSelect('vl.inventory', 'inventory')
        .where('vl.vanAssignmentId IN (:...assignmentIds)', { assignmentIds })
        .getMany();
    }

    // 3. Fetch all deliveries for this date
    const deliveries = await this.deliveryRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.store', 'store')
      .leftJoinAndSelect('d.driver', 'driver')
      .leftJoinAndSelect('d.vanAssignment', 'vanAssignment')
      .leftJoinAndSelect('vanAssignment.van', 'van')
      .where('d.deliveryDate = :targetDate', { targetDate })
      .orderBy('d.createdAt', 'DESC')
      .getMany();

    const deliveryIds = deliveries.map((d) => d.id);

    // 4. Fetch delivery items for price & rate breakdown
    let deliveryItems: DeliveryItem[] = [];
    if (deliveryIds.length > 0) {
      deliveryItems = await this.deliveryItemRepo
        .createQueryBuilder('di')
        .leftJoinAndSelect('di.delivery', 'delivery')
        .leftJoinAndSelect('delivery.store', 'store')
        .where('di.deliveryId IN (:...deliveryIds)', { deliveryIds })
        .getMany();
    }

    // 5. Fetch damaged eggs for this date
    const damagedEggs = await this.damagedEggRepo
      .createQueryBuilder('de')
      .leftJoinAndSelect('de.driver', 'driver')
      .leftJoinAndSelect('de.vanAssignment', 'vanAssignment')
      .where('de.damageDate = :targetDate', { targetDate })
      .getMany();

    // 6. Fetch payments recorded on this date
    const payments = await this.paymentRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.driver', 'driver')
      .leftJoinAndSelect('p.store', 'store')
      .leftJoinAndSelect('p.vanAssignment', 'vanAssignment')
      .where('p.paymentDate = :targetDate', { targetDate })
      .andWhere("p.status != 'REJECTED'")
      .getMany();

    // 7. Calculate Global Rate Distribution with Store Names
    const rateMap = new Map<number, { count: number; amount: number; storeNames: Set<string> }>();
    for (const item of deliveryItems) {
      const rate = Number(item.ratePerUnit);
      const qty = Number(item.quantity);
      const amt = Number(item.totalAmount);
      const storeName = item.delivery?.store?.name;
      const current = rateMap.get(rate) || { count: 0, amount: 0, storeNames: new Set<string>() };
      if (storeName) current.storeNames.add(storeName);
      rateMap.set(rate, {
        count: current.count + qty,
        amount: current.amount + amt,
        storeNames: current.storeNames,
      });
    }

    const rateDistribution: RateBreakdown[] = Array.from(rateMap.entries())
      .map(([ratePerUnit, val]) => ({
        ratePerUnit,
        eggCount: val.count,
        totalAmount: Number(val.amount.toFixed(2)),
        storesCount: val.storeNames.size,
        storeNames: Array.from(val.storeNames),
      }))
      .sort((a, b) => b.ratePerUnit - a.ratePerUnit);

    // If no delivery items were found, fallback to vanLoads loaded rates
    if (rateDistribution.length === 0) {
      const vlRateMap = new Map<number, { count: number; amount: number }>();
      for (const vl of vanLoads) {
        const rate = Number(vl.ratePerUnit);
        const qty = Number(vl.soldUnits);
        const current = vlRateMap.get(rate) || { count: 0, amount: 0 };
        vlRateMap.set(rate, {
          count: current.count + qty,
          amount: current.amount + qty * rate,
        });
      }
      for (const [ratePerUnit, val] of vlRateMap.entries()) {
        if (val.count > 0) {
          rateDistribution.push({
            ratePerUnit,
            eggCount: val.count,
            totalAmount: Number(val.amount.toFixed(2)),
            storesCount: 0,
            storeNames: [],
          });
        }
      }
    }

    // 8. Map Delivery Items by deliveryId
    const itemsByDeliveryId = new Map<string, DeliveryItem[]>();
    for (const item of deliveryItems) {
      const list = itemsByDeliveryId.get(item.deliveryId) || [];
      list.push(item);
      itemsByDeliveryId.set(item.deliveryId, list);
    }

    // 9. Build Store Deliveries detailed list with exact Cash, UPI, and Pending
    const storeDeliveries: StoreDeliveryReport[] = deliveries.map((d) => {
      const items = itemsByDeliveryId.get(d.id) || [];
      const rateTexts = items.map((i) => `${i.quantity} @ ₹${Number(i.ratePerUnit).toFixed(2)}`);

      // Store-specific payments on this date
      const storePayments = payments.filter((p) => p.storeId === d.storeId);
      const cashCollected = storePayments
        .filter((p) => p.paymentMethod === PaymentMethod.CASH)
        .reduce((acc, p) => acc + Number(p.amount || 0), 0);
      const upiCollected = storePayments
        .filter((p) => p.paymentMethod === PaymentMethod.UPI)
        .reduce((acc, p) => acc + Number(p.amount || 0), 0);
      const totalCollected = cashCollected + upiCollected;
      const totalAmount = Number(d.totalAmount ?? 0);
      const pendingDue = Math.max(0, totalAmount - totalCollected);

      return {
        deliveryId: d.id,
        storeId: d.storeId,
        storeName: d.store?.name ?? '—',
        ownerName: d.store?.ownerContactName ?? '—',
        phone: d.store?.phone ?? '—',
        driverName: d.driver?.name ?? '—',
        vanNumber: d.vanAssignment?.van?.vanNumber ?? '—',
        unitsDelivered: Number(d.totalUnits ?? 0),
        ratePerUnitText: rateTexts.length > 0 ? rateTexts.join(', ') : '—',
        totalAmount,
        cashCollected: Number(cashCollected.toFixed(2)),
        upiCollected: Number(upiCollected.toFixed(2)),
        totalCollected: Number(totalCollected.toFixed(2)),
        pendingDue: Number(pendingDue.toFixed(2)),
        paymentStatus: d.paymentStatus,
        createdAt: d.createdAt,
      };
    });

    // 10. Build Driver Summaries
    const driverSummaries: DriverDailyReport[] = assignments.map((assignment) => {
      const driverId = assignment.driverId;
      const assignmentId = assignment.id;

      // Van loads for this assignment
      const assignedLoads = vanLoads.filter((vl) => vl.vanAssignmentId === assignmentId);
      const loadedUnits = assignedLoads.reduce((acc, vl) => acc + Number(vl.loadedUnits || 0), 0);

      // Deliveries for this driver & assignment
      const driverDeliveries = deliveries.filter(
        (d) => d.vanAssignmentId === assignmentId || (d.driverId === driverId && d.deliveryDate === targetDate),
      );
      const soldUnits = driverDeliveries.reduce((acc, d) => acc + Number(d.totalUnits || 0), 0);
      const totalSaleAmount = driverDeliveries.reduce((acc, d) => acc + Number(d.totalAmount || 0), 0);

      // Damaged eggs for this driver & assignment
      const driverDamages = damagedEggs.filter(
        (de) => de.vanAssignmentId === assignmentId || de.driverId === driverId,
      );
      const damagedUnits = driverDamages.reduce((acc, de) => acc + Number(de.eggCount || 0), 0);

      const balanceUnits = Math.max(0, loadedUnits - soldUnits - damagedUnits);

      // Driver rate breakdown
      const driverDeliveryIds = driverDeliveries.map((d) => d.id);
      const driverItems = deliveryItems.filter((di) => driverDeliveryIds.includes(di.deliveryId));
      const driverRateMap = new Map<number, { count: number; amount: number; storeNames: Set<string> }>();
      for (const item of driverItems) {
        const rate = Number(item.ratePerUnit);
        const qty = Number(item.quantity);
        const amt = Number(item.totalAmount);
        const sName = item.delivery?.store?.name;
        const current = driverRateMap.get(rate) || { count: 0, amount: 0, storeNames: new Set<string>() };
        if (sName) current.storeNames.add(sName);
        driverRateMap.set(rate, {
          count: current.count + qty,
          amount: current.amount + amt,
          storeNames: current.storeNames,
        });
      }
      const driverRateBreakdown: RateBreakdown[] = Array.from(driverRateMap.entries()).map(
        ([ratePerUnit, val]) => ({
          ratePerUnit,
          eggCount: val.count,
          totalAmount: Number(val.amount.toFixed(2)),
          storesCount: val.storeNames.size,
          storeNames: Array.from(val.storeNames),
        }),
      );

      // Payments collected by this driver
      const driverPayments = payments.filter(
        (p) => p.vanAssignmentId === assignmentId || p.driverId === driverId,
      );
      const cashCollected = driverPayments
        .filter((p) => p.paymentMethod === PaymentMethod.CASH)
        .reduce((acc, p) => acc + Number(p.amount || 0), 0);
      const upiCollected = driverPayments
        .filter((p) => p.paymentMethod === PaymentMethod.UPI)
        .reduce((acc, p) => acc + Number(p.amount || 0), 0);
      const totalCollected = cashCollected + upiCollected;
      const pendingAmount = Math.max(0, totalSaleAmount - totalCollected);

      // Stores delivered by this driver with individual store collection & rate
      const storeMap = new Map<string, typeof driverDeliveries[0]>();
      for (const d of driverDeliveries) {
        if (!storeMap.has(d.storeId)) {
          storeMap.set(d.storeId, d);
        }
      }
      const storesList: DriverStoreDeliveryItem[] = Array.from(storeMap.values()).map((d) => {
        const dItems = itemsByDeliveryId.get(d.id) || [];
        const rateText = dItems.map((i) => `${i.quantity} @ ₹${Number(i.ratePerUnit).toFixed(2)}`).join(', ');

        const stPayments = driverPayments.filter((p) => p.storeId === d.storeId);
        const stCash = stPayments
          .filter((p) => p.paymentMethod === PaymentMethod.CASH)
          .reduce((acc, p) => acc + Number(p.amount || 0), 0);
        const stUpi = stPayments
          .filter((p) => p.paymentMethod === PaymentMethod.UPI)
          .reduce((acc, p) => acc + Number(p.amount || 0), 0);
        const stTotalCollected = stCash + stUpi;
        const stSaleAmount = Number(d.totalAmount ?? 0);
        const stPending = Math.max(0, stSaleAmount - stTotalCollected);

        return {
          storeId: d.storeId,
          storeName: d.store?.name ?? '—',
          ownerName: d.store?.ownerContactName ?? '—',
          phone: d.store?.phone ?? '—',
          unitsDelivered: Number(d.totalUnits ?? 0),
          rateText: rateText || '—',
          totalAmount: Number(stSaleAmount.toFixed(2)),
          cashCollected: Number(stCash.toFixed(2)),
          upiCollected: Number(stUpi.toFixed(2)),
          totalCollected: Number(stTotalCollected.toFixed(2)),
          pendingAmount: Number(stPending.toFixed(2)),
          paymentStatus: d.paymentStatus,
        };
      });

      return {
        assignmentId,
        driverId,
        driverName: assignment.driver?.name ?? '—',
        driverPhone: assignment.driver?.phone ?? '—',
        vanId: assignment.vanId,
        vanNumber: assignment.van?.vanNumber ?? '—',
        vanCapacity: assignment.van?.loadCapacity ?? 0,
        routeName: assignment.route?.name ?? '—',
        status: assignment.status,
        loadedUnits,
        soldUnits,
        damagedUnits,
        balanceUnits,
        rateBreakdown: driverRateBreakdown,
        storesDeliveredCount: storesList.length,
        storesList,
        totalSaleAmount: Number(totalSaleAmount.toFixed(2)),
        cashCollected: Number(cashCollected.toFixed(2)),
        upiCollected: Number(upiCollected.toFixed(2)),
        totalCollected: Number(totalCollected.toFixed(2)),
        pendingAmount: Number(pendingAmount.toFixed(2)),
      };
    });

    // 11. Calculate Overall Summary Metrics
    const totalEggsLoaded = driverSummaries.reduce((acc, d) => acc + d.loadedUnits, 0);
    const totalEggsSold = deliveries.reduce((acc, d) => acc + Number(d.totalUnits || 0), 0);
    const totalEggsDamaged = damagedEggs.reduce((acc, de) => acc + Number(de.eggCount || 0), 0);
    const totalBalanceEggs = Math.max(0, totalEggsLoaded - totalEggsSold - totalEggsDamaged);

    const uniqueStoreIds = new Set(deliveries.map((d) => d.storeId));
    const totalStoresDelivered = uniqueStoreIds.size;
    const totalDeliveriesCount = deliveries.length;

    const totalSaleAmount = deliveries.reduce((acc, d) => acc + Number(d.totalAmount || 0), 0);
    const totalCashCollected = payments
      .filter((p) => p.paymentMethod === PaymentMethod.CASH)
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const totalUpiCollected = payments
      .filter((p) => p.paymentMethod === PaymentMethod.UPI)
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const totalCollectedAmount = totalCashCollected + totalUpiCollected;
    const totalPendingAmount = Math.max(0, totalSaleAmount - totalCollectedAmount);

    const activeDriversCount = new Set(assignments.map((a) => a.driverId)).size;
    const activeVansCount = new Set(assignments.map((a) => a.vanId)).size;

    return {
      message: 'Daily report loaded',
      data: {
        date: targetDate,
        overall: {
          totalEggsLoaded,
          totalEggsSold,
          totalEggsDamaged,
          totalBalanceEggs,
          totalStoresDelivered,
          totalDeliveriesCount,
          totalSaleAmount: Number(totalSaleAmount.toFixed(2)),
          totalCashCollected: Number(totalCashCollected.toFixed(2)),
          totalUpiCollected: Number(totalUpiCollected.toFixed(2)),
          totalCollectedAmount: Number(totalCollectedAmount.toFixed(2)),
          totalPendingAmount: Number(totalPendingAmount.toFixed(2)),
          activeDriversCount,
          activeVansCount,
        },
        rateDistribution,
        driverSummaries,
        storeDeliveries,
      },
    };
  }
}
