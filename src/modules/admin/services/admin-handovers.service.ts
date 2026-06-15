import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Handover } from '../../../database/entities/handover.entity';
import { HandoverEggItem } from '../../../database/entities/handover-egg-item.entity';
import { VanAssignment } from '../../../database/entities/van-assignment.entity';
import { VanLoad } from '../../../database/entities/van-load.entity';
import { HandoverStatus } from '../../../common/enums/handover-status.enum';
import { VanAssignmentStatus } from '../../../common/enums/van-assignment-status.enum';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../../common/enums/notification-type.enum';
import { normalizePagination, buildMeta } from '../../../common/utils/pagination.util';

@Injectable()
export class AdminHandoversService {
  constructor(
    @InjectRepository(Handover) private handoverRepo: Repository<Handover>,
    @InjectRepository(HandoverEggItem) private eggItemRepo: Repository<HandoverEggItem>,
    @InjectRepository(VanAssignment) private vanAssignmentRepo: Repository<VanAssignment>,
    @InjectRepository(VanLoad) private vanLoadRepo: Repository<VanLoad>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  async list(date?: string, page = 1, limit = 10) {
    const norm = normalizePagination({ page, limit });
    const qb = this.handoverRepo.createQueryBuilder('h')
      .leftJoinAndSelect('h.driver', 'driver')
      .leftJoinAndSelect('h.admin', 'admin')
      .leftJoinAndSelect('h.vanAssignment', 'va')
      .leftJoinAndSelect('va.van', 'van')
      .leftJoinAndSelect('va.route', 'route')
      .leftJoinAndSelect('h.eggItems', 'eggItems')
      .orderBy('h.createdAt', 'DESC')
      .skip((norm.page - 1) * norm.limit)
      .take(norm.limit);
    if (date) qb.where('h.handoverDate = :date', { date });
    const [items, total] = await qb.getManyAndCount();
    return { message: 'Handovers retrieved', data: items, meta: buildMeta(total, norm.page, norm.limit) };
  }

  async getById(id: string) {
    const handover = await this.handoverRepo.findOne({
      where: { id },
      relations: ['driver', 'admin', 'eggItems', 'vanAssignment', 'vanAssignment.van', 'vanAssignment.route'],
      order: { eggItems: { ratePerUnit: 'ASC' } },
    });
    if (!handover) throw new NotFoundException('Handover not found');
    return { message: 'Handover retrieved', data: handover };
  }

  async updateStatus(id: string, status: HandoverStatus, adminId: string, rejectionReason?: string) {
    const handover = await this.handoverRepo.findOne({ where: { id } });
    if (!handover) throw new NotFoundException('Handover not found');

    handover.status = status;
    handover.approvedBy = adminId;
    if (rejectionReason) handover.rejectionReason = rejectionReason;

    if (status === HandoverStatus.APPROVED) {
      const eggItems = await this.eggItemRepo.find({ where: { handoverId: id } });
      await this.dataSource.transaction(async (manager) => {
        await manager.save(Handover, handover);
        await manager.update(VanAssignment, { id: handover.vanAssignmentId }, { status: VanAssignmentStatus.COMPLETED });
        for (const item of eggItems) {
          await manager.update(VanLoad, { id: item.vanLoadId }, {
            damagedUnits: item.damagedUnits,
            returnedUnits: item.goodUnits,
          });
        }
      });
      await this.notificationsService.create({
        userId: handover.driverId,
        type: NotificationType.HANDOVER_APPROVAL,
        title: 'Handover Approved',
        body: `Your handover of ₹${Number(handover.cashAmount).toFixed(2)} has been approved.`,
        data: { handoverId: handover.id, status },
      });
    } else {
      await this.handoverRepo.save(handover);
      if (status === HandoverStatus.REJECTED) {
        await this.notificationsService.create({
          userId: handover.driverId,
          type: NotificationType.HANDOVER_APPROVAL,
          title: 'Handover Rejected',
          body: `Your handover was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
          data: { handoverId: handover.id, status, rejectionReason: rejectionReason ?? '' },
        });
      }
    }

    return { message: `Handover ${status.toLowerCase()}`, data: handover };
  }
}
