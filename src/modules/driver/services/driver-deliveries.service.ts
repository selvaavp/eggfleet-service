import { Injectable, NotFoundException, UnprocessableEntityException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Delivery } from '../../../database/entities/delivery.entity';
import { DeliveryItem } from '../../../database/entities/delivery-item.entity';
import { VanAssignment } from '../../../database/entities/van-assignment.entity';
import { VanLoad } from '../../../database/entities/van-load.entity';
import { Store } from '../../../database/entities/store.entity';
import { Payment } from '../../../database/entities/payment.entity';
import { PaymentDelivery } from '../../../database/entities/payment-delivery.entity';
import { User } from '../../../database/entities/user.entity';
import { DeliveryPaymentStatus, PaymentStatus } from '../../../common/enums/payment-status.enum';
import { VanAssignmentStatus } from '../../../common/enums/van-assignment-status.enum';
import { NotificationType } from '../../../common/enums/notification-type.enum';
import { ErrorCodes } from '../../../common/constants/error-codes.constant';
import { buildMeta, normalizePagination } from '../../../common/utils/pagination.util';
import { todayIST } from '../../../common/utils/date.util';
import { CreateDeliveryDto } from '../dto/create-delivery.dto';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class DriverDeliveriesService {
  constructor(
    @InjectRepository(Delivery) private readonly deliveryRepo: Repository<Delivery>,
    @InjectRepository(DeliveryItem) private readonly deliveryItemRepo: Repository<DeliveryItem>,
    @InjectRepository(VanAssignment) private readonly assignmentRepo: Repository<VanAssignment>,
    @InjectRepository(VanLoad) private readonly vanLoadRepo: Repository<VanLoad>,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(PaymentDelivery) private readonly paymentDeliveryRepo: Repository<PaymentDelivery>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async calculateDeliveryPaidAmount(delivery: Delivery) {
    const links = await this.paymentDeliveryRepo.find({
      where: { deliveryId: delivery.id },
      relations: ['payment'],
    });

    let paidAmount = 0;
    for (const link of links) {
      const payment = link.payment;
      if (!payment || payment.status === PaymentStatus.REJECTED) continue;

      const paymentLinks = await this.paymentDeliveryRepo.find({
        where: { paymentId: payment.id },
        relations: ['delivery'],
      });
      const linkedTotal = paymentLinks.reduce(
        (sum, item) => sum + Number(item.delivery?.totalAmount ?? 0),
        0,
      );
      const ratio = linkedTotal > 0
        ? Number(delivery.totalAmount) / linkedTotal
        : 1 / Math.max(paymentLinks.length, 1);
      paidAmount += Number(payment.amount) * ratio;
    }

    return paidAmount;
  }

  async list(driverId: string, date: string, page: number, limit: number) {
    const filterDate = date ?? todayIST();

    const [items, total] = await this.deliveryRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.store', 'store')
      .where('d.driverId = :driverId', { driverId })
      .andWhere('d.deliveryDate = :date', { date: filterDate })
      .orderBy('d.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const data = await Promise.all(
      items.map(async (d) => {
        const links = await this.paymentDeliveryRepo.find({
          where: { deliveryId: d.id },
          relations: ['payment'],
        });
        const validPayments = links
          .map((l) => l.payment)
          .filter((p) => p && p.status !== PaymentStatus.REJECTED);
        const methods = [...new Set(validPayments.map((p) => p.paymentMethod))];
        const paid = await this.calculateDeliveryPaidAmount(d);

        return {
          id: d.id,
          storeId: d.storeId,
          storeName: d.store?.name ?? '',
          unitsDelivered: d.totalUnits,
          cashCollected: Number(paid.toFixed(2)),
          paymentMethods: methods,
          paymentStatus: d.paymentStatus,
          balanceDue: Math.max(0, Number((Number(d.totalAmount) - paid).toFixed(2))),
          deliveryDate: d.deliveryDate,
        };
      }),
    );

    return { message: 'Deliveries fetched', data, meta: buildMeta(total, page, limit) };
  }

  async summary(driverId: string, date: string) {
    const filterDate = date ?? todayIST();
    const result = await this.deliveryRepo
      .createQueryBuilder('d')
      .select('SUM(d.total_units)', 'totalUnitsDelivered')
      .addSelect('SUM(d.total_amount)', 'totalAmountBilled')
      .where('d.driver_id = :driverId', { driverId })
      .andWhere('d.delivery_date = :date', { date: filterDate })
      .getRawOne();

    // Cash collected = sum of all non-rejected payments that day
    const cashResult = await this.paymentRepo
      .createQueryBuilder('p')
      .select('SUM(p.amount)', 'total')
      .where('p.driver_id = :driverId', { driverId })
      .andWhere('p.payment_date = :date', { date: filterDate })
      .andWhere("p.status != 'REJECTED'")
      .getRawOne();

    return {
      message: 'Summary fetched',
      data: {
        totalUnitsDelivered: Number(result?.totalUnitsDelivered ?? 0),
        totalCashCollected: Number(cashResult?.total ?? 0),
      },
    };
  }

  async create(driverId: string, dto: CreateDeliveryDto) {
    const today = todayIST();
    const assignment = await this.assignmentRepo.findOne({
      where: { driverId, assignedDate: today, status: VanAssignmentStatus.ACTIVE },
    });
    if (!assignment) {
      throw new NotFoundException({ errorCode: ErrorCodes.NO_ACTIVE_ASSIGNMENT, message: 'No active assignment for today' });
    }

    const store = await this.storeRepo.findOne({ where: { id: dto.storeId } });
    if (!store) throw new NotFoundException({ errorCode: ErrorCodes.NOT_FOUND, message: 'Store not found' });

    // Validate + sum items
    let totalUnits = 0;
    let totalAmount = 0;
    const vanLoads: VanLoad[] = [];

    for (const item of dto.items) {
      const vl = await this.vanLoadRepo.findOne({
        where: { id: item.vanLoadId, vanAssignmentId: assignment.id },
      });
      if (!vl) {
        throw new NotFoundException({ errorCode: ErrorCodes.NOT_FOUND, message: `Van load ${item.vanLoadId} not found` });
      }
      const available = vl.loadedUnits - vl.soldUnits;
      if (item.quantity > available) {
        throw new UnprocessableEntityException({
          errorCode: ErrorCodes.LOAD_EXCEEDS_AVAILABLE,
          message: `Requested quantity (${item.quantity}) exceeds available units (${available}) for rate ₹${vl.ratePerUnit}`,
        });
      }
      const effectiveRate = item.unitPrice != null ? item.unitPrice : Number(vl.ratePerUnit);
      totalUnits += item.quantity;
      totalAmount += item.quantity * effectiveRate;
      vanLoads.push(vl);
    }

    // Transactional insert
    return this.dataSource.transaction(async (manager) => {
      const delivery = manager.create(Delivery, {
        vanAssignmentId: assignment.id,
        storeId: dto.storeId,
        driverId,
        deliveryDate: today,
        totalUnits,
        totalAmount,
        paymentStatus: DeliveryPaymentStatus.UNPAID,
      });
      const saved = await manager.save(Delivery, delivery);

      for (const item of dto.items) {
        const vl = vanLoads.find((v) => v.id === item.vanLoadId);
        const effectiveRate = item.unitPrice != null ? item.unitPrice : Number(vl.ratePerUnit);
        await manager.save(DeliveryItem, {
          deliveryId: saved.id,
          vanLoadId: item.vanLoadId,
          ratePerUnit: effectiveRate,
          quantity: item.quantity,
          totalAmount: item.quantity * effectiveRate,
        });
        await manager.increment(VanLoad, { id: item.vanLoadId }, 'soldUnits', item.quantity);
      }

      return {
        message: 'Delivery created',
        data: {
          id: saved.id,
          storeId: saved.storeId,
          storeName: store.name,
          totalUnits: saved.totalUnits,
          totalAmount: Number(saved.totalAmount),
          paymentStatus: saved.paymentStatus,
          deliveryDate: saved.deliveryDate,
        },
      };
    }).then(async (result) => {
      const driver = await this.userRepo.findOne({ where: { id: driverId } });
      await this.notificationsService.notifyAdmins({
        type: NotificationType.DELIVERY_RECORDED,
        title: 'New Delivery Recorded',
        body: `${driver?.name ?? 'A driver'} delivered ${totalUnits} units to ${store.name}`,
        data: { deliveryId: result.data.id, storeId: dto.storeId, driverId },
      });
      return result;
    });
  }

  async getById(id: string, driverId: string) {
    const delivery = await this.deliveryRepo.findOne({
      where: { id, driverId },
      relations: ['store'],
    });
    if (!delivery) throw new NotFoundException({ errorCode: ErrorCodes.NOT_FOUND, message: 'Delivery not found' });

    const items = await this.deliveryItemRepo.find({ where: { deliveryId: id } });
    const paid = await this.calculateDeliveryPaidAmount(delivery);

    return {
      message: 'OK',
      data: {
        id: delivery.id,
        storeId: delivery.storeId,
        storeName: delivery.store?.name,
        deliveryDate: delivery.deliveryDate,
        paymentStatus: delivery.paymentStatus,
        totalAmount: Number(delivery.totalAmount),
        paidAmount: Number(paid.toFixed(2)),
        balanceDue: Math.max(0, Number((Number(delivery.totalAmount) - paid).toFixed(2))),
        items: items.map((i) => ({
          ratePerUnit: Number(i.ratePerUnit),
          quantity: i.quantity,
          amount: Number(i.totalAmount),
        })),
      },
    };
  }

  async getUnpaidByStore(storeId: string, driverId: string) {
    const store = await this.storeRepo.findOne({ where: { id: storeId } });
    if (!store) throw new NotFoundException({ errorCode: ErrorCodes.NOT_FOUND, message: 'Store not found' });

    const unpaid = await this.deliveryRepo
      .createQueryBuilder('d')
      .where('d.store_id = :storeId', { storeId })
      .andWhere('d.driver_id = :driverId', { driverId })
      .andWhere("d.payment_status IN ('UNPAID','PARTIAL')")
      .orderBy('d.delivery_date', 'ASC')
      .getMany();

    const unpaidRows = [];
    for (const d of unpaid) {
      const paidAmount = await this.calculateDeliveryPaidAmount(d);
      const balanceDue = Math.max(0, Number(d.totalAmount) - paidAmount);
      if (balanceDue <= 0.009) continue;
      unpaidRows.push({
        deliveryId: d.id,
        deliveryDate: d.deliveryDate,
        unitsDelivered: d.totalUnits,
        amount: Number(balanceDue.toFixed(2)),
        paidAmount: Number(paidAmount.toFixed(2)),
        paymentStatus: d.paymentStatus,
        isSelected: true,
      });
    }

    const totalBillPayable = unpaidRows.reduce((s, d) => s + d.amount, 0);

    return {
      message: 'Unpaid deliveries fetched',
      data: {
        storeName: store.name,
        unpaidDeliveries: unpaidRows,
        totalBillPayable: Number(totalBillPayable.toFixed(2)),
      },
    };
  }

  async getStoresForDriver(driverId: string) {
    const today = todayIST();
    const assignment = await this.assignmentRepo.findOne({
      where: { driverId, assignedDate: today, status: VanAssignmentStatus.ACTIVE },
    });
    if (!assignment) return { message: 'No active assignment', data: [] };

    // Query by stores.route_id — populated when stores are created/edited in admin panel.
    // Fall back to route_stores join if direct column yields nothing.
    let storeList = await this.storeRepo
      .createQueryBuilder('s')
      .where('s.route_id = :routeId', { routeId: assignment.routeId })
      .andWhere('s.is_active = true')
      .orderBy('s.created_at', 'ASC')
      .getMany();

    if (storeList.length === 0) {
      storeList = await this.storeRepo
        .createQueryBuilder('s')
        .innerJoin('route_stores', 'rs', 'rs.store_id = s.id')
        .where('rs.route_id = :routeId', { routeId: assignment.routeId })
        .andWhere('s.is_active = true')
        .orderBy('rs.sort_order', 'ASC')
        .getMany();
    }

    return {
      message: 'Stores fetched',
      data: storeList.map((s) => ({ id: s.id, name: s.name })),
    };
  }

  async getVanLoads(driverId: string) {
    const today = todayIST();
    const assignment = await this.assignmentRepo.findOne({
      where: { driverId, assignedDate: today, status: VanAssignmentStatus.ACTIVE },
    });
    if (!assignment) {
      throw new NotFoundException({ errorCode: ErrorCodes.NO_ACTIVE_ASSIGNMENT, message: 'No active assignment for today' });
    }

    const vanLoads = await this.vanLoadRepo.find({
      where: { vanAssignmentId: assignment.id },
    });

    return {
      message: 'Van loads fetched',
      data: {
        vanAssignmentId: assignment.id,
        loads: vanLoads.map((vl) => ({
          id: vl.id,
          inventoryId: vl.inventoryId,
          ratePerUnit: Number(vl.ratePerUnit),
          loadedUnits: vl.loadedUnits,
          soldUnits: vl.soldUnits,
          availableUnits: vl.loadedUnits - vl.soldUnits,
        })),
      },
    };
  }
}
