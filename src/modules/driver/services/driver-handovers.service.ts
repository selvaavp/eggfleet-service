import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Handover } from '../../../database/entities/handover.entity';
import { HandoverEggItem } from '../../../database/entities/handover-egg-item.entity';
import { VanAssignment } from '../../../database/entities/van-assignment.entity';
import { VanLoad } from '../../../database/entities/van-load.entity';
import { Payment } from '../../../database/entities/payment.entity';
import { User } from '../../../database/entities/user.entity';
import { DamagedEgg } from '../../../database/entities/damaged-egg.entity';
import { HandoverStatus } from '../../../common/enums/handover-status.enum';
import { VanAssignmentStatus } from '../../../common/enums/van-assignment-status.enum';
import { PaymentMethod } from '../../../common/enums/payment-method.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { Role } from '../../../common/enums/role.enum';
import { NotificationType } from '../../../common/enums/notification-type.enum';
import { DamageReason } from '../../../common/enums/damage-reason.enum';
import { ErrorCodes } from '../../../common/constants/error-codes.constant';
import { todayIST, timeIST } from '../../../common/utils/date.util';
import { buildMeta, normalizePagination } from '../../../common/utils/pagination.util';
import { CreateHandoverDto } from '../dto/create-handover.dto';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class DriverHandoversService {
  constructor(
    @InjectRepository(Handover) private readonly handoverRepo: Repository<Handover>,
    @InjectRepository(HandoverEggItem) private readonly eggItemRepo: Repository<HandoverEggItem>,
    @InjectRepository(VanAssignment) private readonly assignmentRepo: Repository<VanAssignment>,
    @InjectRepository(VanLoad) private readonly vanLoadRepo: Repository<VanLoad>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(driverId: string, dto: CreateHandoverDto) {
    const today = todayIST();
    const assignment = await this.assignmentRepo.findOne({
      where: { driverId, assignedDate: today, status: VanAssignmentStatus.ACTIVE },
    });
    if (!assignment) {
      throw new NotFoundException({ errorCode: ErrorCodes.NO_ACTIVE_ASSIGNMENT, message: 'No active assignment for today' });
    }

    const existing = await this.handoverRepo.findOne({
      where: { driverId, vanAssignmentId: assignment.id },
    });
    if (existing) {
      throw new ConflictException({
        errorCode: ErrorCodes.HANDOVER_ALREADY_SUBMITTED,
        message: 'A handover has already been submitted for today\'s assignment',
      });
    }

    const admin = await this.userRepo.findOne({ where: { id: dto.adminId, role: Role.ADMIN } });
    if (!admin) throw new NotFoundException({ errorCode: ErrorCodes.NOT_FOUND, message: 'Admin not found' });

    return this.dataSource.transaction(async (manager) => {
      const handover = manager.create(Handover, {
        driverId,
        adminId: dto.adminId,
        vanAssignmentId: assignment.id,
        handoverDate: dto.handoverDate,
        handoverTime: dto.handoverTime,
        cashAmount: dto.cashAmount,
        status: HandoverStatus.PENDING,
      });
      const saved = await manager.save(Handover, handover);

      for (const item of dto.eggItems) {
        const vl = await this.vanLoadRepo.findOne({
          where: { id: item.vanLoadId, vanAssignmentId: assignment.id },
        });
        if (!vl) continue;
        await manager.save(HandoverEggItem, {
          handoverId: saved.id,
          vanLoadId: item.vanLoadId,
          ratePerUnit: vl.ratePerUnit,
          goodUnits: item.goodUnits,
          damagedUnits: item.damagedUnits,
        });

        if (item.damagedUnits > 0) {
          await manager.save(DamagedEgg, {
            vanAssignmentId: assignment.id,
            driverId,
            inventoryId: vl.inventoryId,
            eggCount: item.damagedUnits,
            reason: DamageReason.TRANSIT,
            damageDate: dto.handoverDate,
            damageTime: dto.handoverTime,
            recordedBy: dto.adminId,
          });
        }
      }

      return {
        message: 'Handover submitted, pending admin approval',
        data: {
          handoverId: saved.id,
          cashAmount: dto.cashAmount,
          status: saved.status,
          handoverDate: saved.handoverDate,
          handoveredTo: admin.name,
        },
      };
    }).then(async (result) => {
      const driver = await this.userRepo.findOne({ where: { id: driverId } });
      const driverName = driver?.name ?? 'A driver';

      await this.notificationsService.create({
        userId: admin.id,
        type: NotificationType.HANDOVER_SUBMITTED,
        title: 'Handover Submitted',
        body: `${driverName} submitted a cash handover of ₹${dto.cashAmount}`,
        data: { handoverId: result.data.handoverId, driverId },
      });

      const totalDamaged = dto.eggItems.reduce((sum, item) => sum + (item.damagedUnits ?? 0), 0);
      if (totalDamaged > 0) {
        await this.notificationsService.notifyAdmins({
          type: NotificationType.DAMAGED_EGGS_REPORTED,
          title: 'Damaged Eggs Reported',
          body: `${driverName} reported ${totalDamaged} damaged eggs in today's handover`,
          data: { handoverId: result.data.handoverId, driverId, damagedUnits: String(totalDamaged) },
        });
      }

      return result;
    });
  }

  async list(driverId: string, date: string, page: number, limit: number) {
    const { page: p, limit: l } = normalizePagination({ page, limit });

    const qb = this.handoverRepo
      .createQueryBuilder('h')
      .leftJoinAndSelect('h.admin', 'admin')
      .leftJoin('h.vanAssignment', 'va')
      .leftJoin('va.van', 'van')
      .addSelect(['van.vanNumber'])
      .where('h.driverId = :driverId', { driverId });

    if (date) qb.andWhere('h.handoverDate = :date', { date });

    const [items, total] = await qb.orderBy('h.createdAt', 'DESC').skip((p - 1) * l).take(l).getManyAndCount();

    return {
      message: 'Handover history fetched',
      data: items.map((h) => ({
        id: h.id,
        handoverDate: h.handoverDate,
        cashAmount: Number(h.cashAmount),
        status: h.status,
        rejectionReason: h.rejectionReason,
        handoveredTo: h.admin?.name ?? '',
      })),
      meta: buildMeta(total, p, l),
    };
  }

  async getAdmins() {
    const admins = await this.userRepo.find({
      where: { role: Role.ADMIN, isActive: true },
      select: ['id', 'name'],
    });
    return { message: 'Admins fetched', data: admins.map((a) => ({ id: a.id, name: a.name })) };
  }

  async getSummary(driverId: string) {
    const today = todayIST();
    const assignment = await this.assignmentRepo.findOne({
      where: { driverId, assignedDate: today, status: VanAssignmentStatus.ACTIVE },
    });
    if (!assignment) {
      throw new NotFoundException({ errorCode: ErrorCodes.NO_ACTIVE_ASSIGNMENT, message: 'No active assignment for today' });
    }

    const [vanLoads, cashPayments] = await Promise.all([
      this.vanLoadRepo.find({ where: { vanAssignmentId: assignment.id } }),
      this.paymentRepo.find({
        where: { driverId, vanAssignmentId: assignment.id, paymentMethod: PaymentMethod.CASH },
      }),
    ]);

    const cashAmount = cashPayments
      .filter((p) => p.status !== PaymentStatus.REJECTED)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      message: 'Handover summary fetched',
      data: {
        vanAssignmentId: assignment.id,
        cashAmount,
        eggItems: vanLoads.map((vl) => ({
          vanLoadId: vl.id,
          ratePerUnit: Number(vl.ratePerUnit),
          loadedUnits: vl.loadedUnits,
          soldUnits: vl.soldUnits,
          goodUnits: vl.loadedUnits - vl.soldUnits - vl.damagedUnits,
          damagedUnits: vl.damagedUnits,
        })),
      },
    };
  }
}
