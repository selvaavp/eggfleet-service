import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../../../database/entities/payment.entity';
import { PaymentDelivery } from '../../../database/entities/payment-delivery.entity';
import { Delivery } from '../../../database/entities/delivery.entity';
import { VendorPayment } from '../../../database/entities/vendor-payment.entity';
import { CreateVendorPaymentDto } from '../dto/create-vendor-payment.dto';
import { DeliveryPaymentStatus, PaymentStatus } from '../../../common/enums/payment-status.enum';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../../common/enums/notification-type.enum';
import { normalizePagination, buildMeta } from '../../../common/utils/pagination.util';

@Injectable()
export class AdminPaymentsService {
  constructor(
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(PaymentDelivery) private paymentDeliveryRepo: Repository<PaymentDelivery>,
    @InjectRepository(Delivery) private deliveryRepo: Repository<Delivery>,
    @InjectRepository(VendorPayment) private vendorPaymentRepo: Repository<VendorPayment>,
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

  private async recalculateDeliveryPaymentStatuses(deliveryIds: string[]) {
    const uniqueDeliveryIds = [...new Set(deliveryIds)];
    for (const deliveryId of uniqueDeliveryIds) {
      const delivery = await this.deliveryRepo.findOne({ where: { id: deliveryId } });
      if (!delivery) continue;

      const paidAmount = await this.calculateDeliveryPaidAmount(delivery);
      const totalAmount = Number(delivery.totalAmount);
      const paymentStatus =
        paidAmount <= 0.009
          ? DeliveryPaymentStatus.UNPAID
          : paidAmount + 0.009 >= totalAmount
            ? DeliveryPaymentStatus.PAID
            : DeliveryPaymentStatus.PARTIAL;

      await this.deliveryRepo.update(delivery.id, { paymentStatus });
    }
  }

  async listDriverPayments(date?: string, page = 1, limit = 10) {
    const norm = normalizePagination({ page, limit });
    const qb = this.paymentRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.driver', 'driver')
      .leftJoinAndSelect('p.store', 'store')
      .leftJoinAndSelect('p.vanAssignment', 'va')
      .leftJoinAndSelect('va.van', 'van')
      .leftJoinAndSelect('va.route', 'route')
      .orderBy('p.createdAt', 'DESC')
      .skip((norm.page - 1) * norm.limit)
      .take(norm.limit);
    if (date) qb.where('DATE(p.paymentDate) = :date', { date });
    const [items, total] = await qb.getManyAndCount();
    return { message: 'Payments retrieved', data: items, meta: buildMeta(total, norm.page, norm.limit) };
  }

  async listVendorPayments(vendorId?: string, page = 1, limit = 10) {
    const norm = normalizePagination({ page, limit });
    const qb = this.vendorPaymentRepo.createQueryBuilder('vp')
      .leftJoinAndSelect('vp.vendor', 'vendor')
      .orderBy('vp.createdAt', 'DESC')
      .skip((norm.page - 1) * norm.limit)
      .take(norm.limit);
    if (vendorId) qb.where('vp.vendorId = :vendorId', { vendorId });
    const [items, total] = await qb.getManyAndCount();
    return { message: 'Vendor payments retrieved', data: items, meta: buildMeta(total, norm.page, norm.limit) };
  }

  async createVendorPayment(dto: CreateVendorPaymentDto, adminId: string) {
    const payment = this.vendorPaymentRepo.create({ ...dto, createdBy: adminId });
    await this.vendorPaymentRepo.save(payment);
    return { message: 'Vendor payment recorded', data: payment };
  }

  async updateDriverPaymentStatus(id: string, status: PaymentStatus, adminId: string, note?: string) {
    if (![PaymentStatus.APPROVED, PaymentStatus.REJECTED].includes(status)) {
      throw new BadRequestException('Status must be APPROVED or REJECTED');
    }
    const payment = await this.paymentRepo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');

    payment.status = status;
    payment.adminNote = note ?? null;
    payment.approvedBy = adminId;
    await this.paymentRepo.save(payment);

    const links = await this.paymentDeliveryRepo.find({ where: { paymentId: payment.id } });
    await this.recalculateDeliveryPaymentStatuses(links.map((link) => link.deliveryId));

    const isApproved = status === PaymentStatus.APPROVED;
    await this.notificationsService.create({
      userId: payment.driverId,
      type: NotificationType.PAYMENT_CONFIRMATION,
      title: isApproved ? 'Payment Approved' : 'Payment Rejected',
      body: isApproved
        ? `Your payment of ₹${Number(payment.amount).toFixed(2)} has been approved.`
        : `Your payment of ₹${Number(payment.amount).toFixed(2)} was rejected.${note ? ` Reason: ${note}` : ''}`,
      data: { paymentId: payment.id, status, amount: String(payment.amount) },
    });

    return { message: `Payment ${status.toLowerCase()}`, data: payment };
  }
}
