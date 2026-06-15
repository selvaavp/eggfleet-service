import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { VanAssignment } from '../../../database/entities/van-assignment.entity';
import { VanLoad } from '../../../database/entities/van-load.entity';
import { Delivery } from '../../../database/entities/delivery.entity';
import { Inventory } from '../../../database/entities/inventory.entity';
import { CreateVanAssignmentDto } from '../dto/create-van-assignment.dto';
import { VanAssignmentStatus } from '../../../common/enums/van-assignment-status.enum';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../../common/enums/notification-type.enum';
import { normalizePagination, buildMeta } from '../../../common/utils/pagination.util';

@Injectable()
export class AdminAssignmentsService {
  constructor(
    @InjectRepository(VanAssignment) private assignmentRepo: Repository<VanAssignment>,
    @InjectRepository(VanLoad) private vanLoadRepo: Repository<VanLoad>,
    @InjectRepository(Delivery) private deliveryRepo: Repository<Delivery>,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  async list(date?: string, page = 1, limit = 10) {
    const norm = normalizePagination({ page, limit });
    const qb = this.assignmentRepo.createQueryBuilder('a')
      .leftJoinAndSelect('a.driver', 'driver')
      .leftJoinAndSelect('a.van', 'van')
      .leftJoinAndSelect('a.route', 'route')
      .orderBy('a.assignedDate', 'DESC')
      .skip((norm.page - 1) * norm.limit)
      .take(norm.limit);
    if (date) qb.where('a.assignedDate = :date', { date });
    const [items, total] = await qb.getManyAndCount();
    return { message: 'Assignments retrieved', data: items, meta: buildMeta(total, norm.page, norm.limit) };
  }

  async create(dto: CreateVanAssignmentDto) {
    const existing = await this.assignmentRepo.findOne({
      where: { driverId: dto.driverId, assignedDate: dto.assignedDate, status: VanAssignmentStatus.ACTIVE },
    });
    if (existing) throw new ConflictException('Driver already has an active assignment for this date');
    const assignment = this.assignmentRepo.create({
      driverId: dto.driverId,
      vanId: dto.vanId,
      routeId: dto.routeId,
      assignedDate: dto.assignedDate,
      createdBy: dto.createdBy,
      status: VanAssignmentStatus.ACTIVE,
    });
    await this.assignmentRepo.save(assignment);

    await this.notificationsService.create({
      userId: dto.driverId,
      type: NotificationType.VEHICLE_ASSIGNMENT,
      title: 'New Van Assignment',
      body: `You have been assigned a van for ${dto.assignedDate}. Please start your deliveries as scheduled.`,
      data: { assignmentId: assignment.id, assignedDate: dto.assignedDate },
    });

    return { message: 'Assignment created', data: assignment };
  }

  async getById(id: string) {
    const assignment = await this.assignmentRepo.findOne({
      where: { id },
      relations: ['driver', 'van', 'route'],
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    return { message: 'Assignment retrieved', data: assignment };
  }

  async updateStatus(id: string, status: VanAssignmentStatus) {
    const assignment = await this.assignmentRepo.findOne({ where: { id } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    assignment.status = status;
    await this.assignmentRepo.save(assignment);
    return { message: 'Assignment status updated', data: assignment };
  }

  async update(id: string, dto: { driverId?: string; vanId?: string; routeId?: string }) {
    const assignment = await this.assignmentRepo.findOne({
      where: { id },
      relations: ['driver', 'van', 'route'],
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (dto.driverId) assignment.driverId = dto.driverId;
    if (dto.vanId) assignment.vanId = dto.vanId;
    if (dto.routeId) assignment.routeId = dto.routeId;
    await this.assignmentRepo.save(assignment);
    return { message: 'Assignment updated', data: assignment };
  }

  async remove(id: string) {
    const assignment = await this.assignmentRepo.findOne({ where: { id } });
    if (!assignment) throw new NotFoundException('Assignment not found');

    const deliveryCount = await this.deliveryRepo.count({ where: { vanAssignmentId: id } });
    if (deliveryCount > 0) {
      throw new ConflictException('Cannot delete an assignment that has started deliveries');
    }

    const vanLoads = await this.vanLoadRepo.find({ where: { vanAssignmentId: id } });

    await this.dataSource.transaction(async (manager) => {
      // Restore loaded units back to each inventory batch
      for (const load of vanLoads) {
        await manager.increment(Inventory, { id: load.inventoryId }, 'availableUnits', load.loadedUnits);
      }
      await manager.delete(VanLoad, { vanAssignmentId: id });
      await manager.remove(VanAssignment, assignment);
    });

    return { message: 'Assignment deleted', data: null };
  }
}
