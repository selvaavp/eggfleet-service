import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VanAssignment } from '../../../database/entities/van-assignment.entity';
import { VanLoad } from '../../../database/entities/van-load.entity';
import { Payment } from '../../../database/entities/payment.entity';
import { Delivery } from '../../../database/entities/delivery.entity';
import { VanAssignmentStatus } from '../../../common/enums/van-assignment-status.enum';
import { PaymentMethod } from '../../../common/enums/payment-method.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { todayIST } from '../../../common/utils/date.util';

@Injectable()
export class DriverDashboardService {
  constructor(
    @InjectRepository(VanAssignment)
    private readonly assignmentRepo: Repository<VanAssignment>,
    @InjectRepository(VanLoad)
    private readonly vanLoadRepo: Repository<VanLoad>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Delivery)
    private readonly deliveryRepo: Repository<Delivery>,
  ) {}

  async getDashboard(driverId: string) {
    const today = todayIST();

    const assignment = await this.assignmentRepo.findOne({
      where: { driverId, assignedDate: today, status: VanAssignmentStatus.ACTIVE },
      relations: ['van', 'route'],
    });

    if (!assignment) {
      return { message: 'No active assignment for today', data: null };
    }

    const vanLoads = await this.vanLoadRepo.find({
      where: { vanAssignmentId: assignment.id },
    });

    // Cash in hand = APPROVED or PENDING cash payments for today's assignment
    const cashPayments = await this.paymentRepo
      .createQueryBuilder('p')
      .where('p.driver_id = :driverId', { driverId })
      .andWhere('p.van_assignment_id = :assignmentId', { assignmentId: assignment.id })
      .andWhere('p.payment_method = :method', { method: PaymentMethod.CASH })
      .andWhere('p.status != :rejected', { rejected: PaymentStatus.REJECTED })
      .getMany();

    const cashInHand = cashPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    const loadSummary = vanLoads.map((vl) => ({
      vanLoadId: vl.id,
      ratePerUnit: Number(vl.ratePerUnit),
      loadedUnits: vl.loadedUnits,
      soldUnits: vl.soldUnits,
    }));

    const totalLoadedUnits = vanLoads.reduce((s, vl) => s + vl.loadedUnits, 0);
    const totalSoldUnits = vanLoads.reduce((s, vl) => s + vl.soldUnits, 0);

    const deliveries = await this.deliveryRepo.find({
      where: { vanAssignmentId: assignment.id },
      relations: ['store'],
      order: { createdAt: 'ASC' },
    });

    const deliverySummary = deliveries.map((d) => ({
      deliveryId: d.id,
      storeName: d.store?.name ?? '',
      units: d.totalUnits,
      amount: Number(d.totalAmount),
      paymentStatus: d.paymentStatus,
    }));

    return {
      message: 'Dashboard loaded',
      data: {
        van: { id: assignment.van.id, number: assignment.van.vanNumber, name: assignment.van.name },
        route: { id: assignment.route.id, name: assignment.route.name },
        loadSummary,
        totalLoadedUnits,
        totalSoldUnits,
        cashInHand,
        deliverySummary,
        handoverStatus: null,
      },
    };
  }
}
