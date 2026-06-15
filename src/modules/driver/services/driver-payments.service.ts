import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Payment } from '../../../database/entities/payment.entity';
import { PaymentDelivery } from '../../../database/entities/payment-delivery.entity';
import { Delivery } from '../../../database/entities/delivery.entity';
import { VanAssignment } from '../../../database/entities/van-assignment.entity';
import { Store } from '../../../database/entities/store.entity';
import { User } from '../../../database/entities/user.entity';
import { DeliveryPaymentStatus, PaymentStatus } from '../../../common/enums/payment-status.enum';
import { PaymentMethod } from '../../../common/enums/payment-method.enum';
import { VanAssignmentStatus } from '../../../common/enums/van-assignment-status.enum';
import { NotificationType } from '../../../common/enums/notification-type.enum';
import { ErrorCodes } from '../../../common/constants/error-codes.constant';
import { buildMeta, normalizePagination } from '../../../common/utils/pagination.util';
import { todayIST, timeIST } from '../../../common/utils/date.util';
import { toPublicUrl, validateImageMimetype } from '../../../common/utils/upload.util';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { NotificationsService } from '../../notifications/notifications.service';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';

@Injectable()
export class DriverPaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(PaymentDelivery) private readonly paymentDeliveryRepo: Repository<PaymentDelivery>,
    @InjectRepository(Delivery) private readonly deliveryRepo: Repository<Delivery>,
    @InjectRepository(VanAssignment) private readonly assignmentRepo: Repository<VanAssignment>,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async calculateDeliveryPaidAmount(manager: EntityManager, delivery: Delivery) {
    const links = await manager.find(PaymentDelivery, {
      where: { deliveryId: delivery.id },
      relations: ['payment'],
    });

    let paidAmount = 0;
    for (const link of links) {
      const payment = link.payment;
      if (!payment || payment.status === PaymentStatus.REJECTED) continue;

      const paymentLinks = await manager.find(PaymentDelivery, {
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

  private async recalculateDeliveryPaymentStatuses(manager: EntityManager, deliveryIds: string[]) {
    const uniqueDeliveryIds = [...new Set(deliveryIds)];
    for (const deliveryId of uniqueDeliveryIds) {
      const delivery = await manager.findOne(Delivery, { where: { id: deliveryId } });
      if (!delivery) continue;

      const paidAmount = await this.calculateDeliveryPaidAmount(manager, delivery);
      const totalAmount = Number(delivery.totalAmount);
      const paymentStatus =
        paidAmount <= 0.009
          ? DeliveryPaymentStatus.UNPAID
          : paidAmount + 0.009 >= totalAmount
            ? DeliveryPaymentStatus.PAID
            : DeliveryPaymentStatus.PARTIAL;

      await manager.update(Delivery, delivery.id, { paymentStatus });
    }
  }

  async getSummary(driverId: string, date: string) {
    const filterDate = date ?? todayIST();
    const methods = Object.values(PaymentMethod);

    const breakdown = await Promise.all(
      methods.map(async (method) => {
        const payments = await this.paymentRepo.find({
          where: { driverId, paymentDate: filterDate, paymentMethod: method },
        });
        const amount = payments.filter((p) => p.status !== PaymentStatus.REJECTED)
          .reduce((s, p) => s + Number(p.amount), 0);
        // handedOver = amount of APPROVED handovers (simplified: approved payments)
        const handedOver = payments.filter((p) => p.status === PaymentStatus.APPROVED)
          .reduce((s, p) => s + Number(p.amount), 0);

        return { method, amount, transactionCount: payments.length, handedOver };
      }),
    );

    const totalReceived = breakdown.reduce((s, b) => s + b.amount, 0);

    return { message: 'Payment summary fetched', data: { totalReceived, breakdown } };
  }

  async list(driverId: string, date: string, method: string, page: number, limit: number) {
    const { page: p, limit: l } = normalizePagination({ page, limit });
    const filterDate = date ?? todayIST();

    const qb = this.paymentRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.store', 'store')
      .where('p.driverId = :driverId', { driverId })
      .andWhere('p.paymentDate = :date', { date: filterDate });

    if (method && method !== 'ALL') {
      qb.andWhere('p.paymentMethod = :method', { method });
    }

    const [items, total] = await qb
      .orderBy('p.createdAt', 'DESC')
      .skip((p - 1) * l)
      .take(l)
      .getManyAndCount();

    const totalAmount = items.filter((i) => i.status !== PaymentStatus.REJECTED)
      .reduce((s, i) => s + Number(i.amount), 0);

    return {
      message: 'Payment history fetched',
      data: {
        filterSummary: {
          method: method ?? 'ALL',
          totalAmount,
          transactionCount: total,
          lastUpdatedAt: items[0]?.createdAt ?? null,
        },
        payments: items.map((p) => ({
          id: p.id,
          storeName: p.store?.name ?? '',
          time: p.createdAt,
          amount: Number(p.amount),
          status: p.status,
          rejectionReason: p.adminNote,
        })),
      },
      meta: buildMeta(total, p, l),
    };
  }

  async create(driverId: string, dto: CreatePaymentDto, file?: Express.Multer.File) {
    if (file) validateImageMimetype(file);

    const today = todayIST();
    const assignment = await this.assignmentRepo.findOne({
      where: { driverId, assignedDate: today, status: VanAssignmentStatus.ACTIVE },
    });
    if (!assignment) {
      throw new NotFoundException({ errorCode: ErrorCodes.NO_ACTIVE_ASSIGNMENT, message: 'No active assignment for today' });
    }

    // Validate deliveries
    const deliveries = await Promise.all(
      dto.deliveryIds.map((id) => this.deliveryRepo.findOne({ where: { id, driverId } })),
    );

    if (deliveries.some((d) => !d)) {
      throw new NotFoundException({
        errorCode: ErrorCodes.NOT_FOUND,
        message: 'One or more selected deliveries were not found',
      });
    }

    const validDeliveries = deliveries as Delivery[];
    const storeIds = new Set(validDeliveries.map((d) => d.storeId));
    if (storeIds.size > 1) {
      throw new UnprocessableEntityException({
        errorCode: ErrorCodes.VALIDATION_ERROR,
        message: 'Selected deliveries must belong to the same store',
      });
    }

    const alreadyPaid = validDeliveries.filter((d) => d.paymentStatus === DeliveryPaymentStatus.PAID);
    if (alreadyPaid.length > 0) {
      throw new UnprocessableEntityException({
        errorCode: ErrorCodes.DELIVERY_ALREADY_PAID,
        message: 'One or more selected deliveries are already fully paid',
      });
    }

    // Save proof file
    let proofUrl: string | null = null;
    if (file) {
      const uploadDir = path.join(process.env.UPLOAD_DIR ?? './uploads', 'payments');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const ext = path.extname(file.originalname);
      const filename = `${uuid()}${ext}`;
      const filepath = path.join(uploadDir, filename);
      fs.writeFileSync(filepath, file.buffer);
      proofUrl = `/uploads/payments/${filename}`;
    }

    let createdStoreId: string;
    return this.dataSource.transaction(async (manager) => {
      let totalBalanceDue = 0;
      for (const delivery of validDeliveries) {
        const paidAmount = await this.calculateDeliveryPaidAmount(manager, delivery);
        totalBalanceDue += Math.max(0, Number(delivery.totalAmount) - paidAmount);
      }
      if (dto.amount > totalBalanceDue + 0.01) {
        throw new UnprocessableEntityException({
          errorCode: ErrorCodes.VALIDATION_ERROR,
          message: 'Payment amount exceeds selected delivery balance',
        });
      }

      const storeId = validDeliveries[0].storeId;
      createdStoreId = storeId;
      const payment = manager.create(Payment, {
        storeId,
        driverId,
        vanAssignmentId: assignment.id,
        amount: dto.amount,
        paymentMethod: dto.method,
        proofUrl,
        status: PaymentStatus.PENDING,
        paymentDate: dto.paymentDate ?? today,
        paymentTime: timeIST(),
      });
      const saved = await manager.save(Payment, payment);

      for (const deliveryId of dto.deliveryIds) {
        await manager.save(PaymentDelivery, { paymentId: saved.id, deliveryId });
      }

      await this.recalculateDeliveryPaymentStatuses(manager, dto.deliveryIds);

      return {
        message: 'Payment submitted and pending admin approval',
        data: { paymentId: saved.id, amount: dto.amount, method: dto.method, status: saved.status, proofUrl },
      };
    }).then(async (result) => {
      const [driver, store] = await Promise.all([
        this.userRepo.findOne({ where: { id: driverId } }),
        this.storeRepo.findOne({ where: { id: createdStoreId } }),
      ]);
      await this.notificationsService.notifyAdmins({
        type: NotificationType.PAYMENT_SUBMITTED,
        title: 'Payment Submitted',
        body: `${driver?.name ?? 'A driver'} submitted a payment of ₹${dto.amount} for ${store?.name ?? 'a store'}`,
        data: { paymentId: result.data.paymentId, driverId, storeId: createdStoreId, amount: String(dto.amount) },
      });
      return result;
    });
  }
}
