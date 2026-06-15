import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { User } from '../../../database/entities/user.entity';
import { Delivery } from '../../../database/entities/delivery.entity';
import { VanAssignment } from '../../../database/entities/van-assignment.entity';
import { Payment } from '../../../database/entities/payment.entity';
import { Role } from '../../../common/enums/role.enum';
import { VanAssignmentStatus } from '../../../common/enums/van-assignment-status.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { CreateEmployeeDto, UpdateEmployeeDto } from '../dto/create-employee.dto';
import { normalizePagination, buildMeta } from '../../../common/utils/pagination.util';
import { todayIST } from '../../../common/utils/date.util';
import { validateUserIdentifiersForRole } from '../../../common/utils/user-role-identifiers.util';

@Injectable()
export class AdminEmployeesService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Delivery) private deliveryRepo: Repository<Delivery>,
    @InjectRepository(VanAssignment) private assignmentRepo: Repository<VanAssignment>,
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
  ) {}

  async list(page = 1, limit = 10) {
    const norm = normalizePagination({ page, limit });
    const [items, total] = await this.userRepo.findAndCount({
      where: { role: Role.DRIVER },
      select: ['id', 'name', 'phone', 'email', 'isActive', 'createdAt', 'profilePictureUrl'],
      order: { createdAt: 'DESC' },
      skip: (norm.page - 1) * norm.limit,
      take: norm.limit,
    });

    const today = todayIST();
    const driverIds = items.map((u) => u.id);
    const assignments = driverIds.length
      ? await this.assignmentRepo.find({
          where: { driverId: In(driverIds), assignedDate: today, status: VanAssignmentStatus.ACTIVE },
          relations: ['van'],
        })
      : [];
    const assignmentMap = new Map(assignments.map((a) => [a.driverId, a]));

    const data = items.map((user) => ({
      ...user,
      currentAssignment: assignmentMap.get(user.id) ?? null,
    }));
    return { message: 'Employees retrieved', data, meta: buildMeta(total, norm.page, norm.limit) };
  }

  async create(dto: CreateEmployeeDto) {
    const { email, phone } = validateUserIdentifiersForRole(Role.DRIVER, {
      email: dto.email,
      phone: dto.phone,
    });
    const existing = await this.userRepo.findOne({ where: { phone } });
    if (existing) throw new ConflictException('Phone number already registered');
    const rawPassword = dto.password ?? dto.phone;
    const passwordHash = await bcrypt.hash(rawPassword, 12);
    const user = this.userRepo.create({ name: dto.name, phone, email, passwordHash, role: Role.DRIVER });
    await this.userRepo.save(user);
    const { passwordHash: _, ...result } = user;
    return { message: 'Employee created', data: result };
  }

  async getById(id: string) {
    const user = await this.userRepo.findOne({ where: { id, role: Role.DRIVER } });
    if (!user) throw new NotFoundException('Employee not found');
    const { passwordHash, ...result } = user;

    const today = todayIST();
    const [deliveryStats, activeAssignment] = await Promise.all([
      this.deliveryRepo
        .createQueryBuilder('d')
        .select('COUNT(d.id)', 'totalDeliveries')
        .addSelect('SUM(d.total_units)', 'totalUnits')
        .addSelect('SUM(d.total_amount)', 'totalAmount')
        .where('d.driver_id = :id', { id })
        .getRawOne(),
      this.assignmentRepo.findOne({
        where: { driverId: id, assignedDate: today, status: VanAssignmentStatus.ACTIVE },
        relations: ['van', 'route'],
      }),
    ]);

    return {
      message: 'Employee retrieved',
      data: {
        ...result,
        metrics: {
          totalDeliveries: Number(deliveryStats?.totalDeliveries ?? 0),
          totalUnitsDelivered: Number(deliveryStats?.totalUnits ?? 0),
          totalAmountBilled: Number(deliveryStats?.totalAmount ?? 0),
        },
        todayAssignment: activeAssignment
          ? {
              assignmentId: activeAssignment.id,
              vanNumber: activeAssignment.van?.vanNumber ?? null,
              routeId: activeAssignment.routeId,
            }
          : null,
      },
    };
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const user = await this.userRepo.findOne({ where: { id, role: Role.DRIVER } });
    if (!user) throw new NotFoundException('Employee not found');
    if (dto.name !== undefined) user.name = dto.name;
    const nextPhone = dto.phone !== undefined ? dto.phone : user.phone;
    const nextEmail = dto.email !== undefined ? dto.email : user.email;
    const normalized = validateUserIdentifiersForRole(Role.DRIVER, { email: nextEmail, phone: nextPhone });
    if (dto.phone !== undefined && dto.phone !== user.phone) {
      const taken = await this.userRepo.findOne({ where: { phone: normalized.phone! } });
      if (taken && taken.id !== id) throw new ConflictException('Phone number already registered');
    }
    user.phone = normalized.phone!;
    user.email = normalized.email;
    await this.userRepo.save(user);
    const { passwordHash, ...result } = user;
    return { message: 'Employee updated', data: result };
  }

  async toggleStatus(id: string) {
    const user = await this.userRepo.findOne({ where: { id, role: Role.DRIVER } });
    if (!user) throw new NotFoundException('Employee not found');
    user.isActive = !user.isActive;
    await this.userRepo.save(user);
    return { message: `Employee ${user.isActive ? 'activated' : 'deactivated'}`, data: { isActive: user.isActive } };
  }

  async uploadAvatar(id: string, file: Express.Multer.File) {
    const user = await this.userRepo.findOne({ where: { id, role: Role.DRIVER } });
    if (!user) throw new NotFoundException('Employee not found');

    // Remove old avatar file if stored locally
    if (user.profilePictureUrl?.startsWith('/uploads/')) {
      const oldPath = path.join(process.cwd(), user.profilePictureUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    user.profilePictureUrl = `/uploads/avatars/${file.filename}`;
    await this.userRepo.save(user);
    return { message: 'Avatar uploaded', data: { profilePictureUrl: user.profilePictureUrl } };
  }

  async delete(id: string) {
    const user = await this.userRepo.findOne({ where: { id, role: Role.DRIVER } });
    if (!user) throw new NotFoundException('Employee not found');
    await this.userRepo.remove(user);
    return { message: 'Employee deleted' };
  }

  async getEmployeeSummary(id: string, startDate?: string, endDate?: string) {
    const user = await this.userRepo.findOne({ where: { id, role: Role.DRIVER } });
    if (!user) throw new NotFoundException('Employee not found');

    const deliveryQb = this.deliveryRepo
      .createQueryBuilder('d')
      .where('d.driverId = :id', { id });
    if (startDate) deliveryQb.andWhere('d.deliveryDate >= :startDate', { startDate });
    if (endDate) deliveryQb.andWhere('d.deliveryDate <= :endDate', { endDate });

    const deliveryStats = await deliveryQb
      .select('COUNT(d.id)', 'totalDeliveries')
      .addSelect('COALESCE(SUM(d.totalAmount), 0)', 'totalSalesAmount')
      .getRawOne();

    const paymentQb = this.paymentRepo
      .createQueryBuilder('p')
      .where('p.driverId = :id', { id })
      .andWhere('p.status = :status', { status: PaymentStatus.APPROVED });
    if (startDate) paymentQb.andWhere('p.paymentDate >= :startDate', { startDate });
    if (endDate) paymentQb.andWhere('p.paymentDate <= :endDate', { endDate });

    const paymentStats = await paymentQb
      .select('COALESCE(SUM(p.amount), 0)', 'totalCollected')
      .addSelect(`COALESCE(SUM(CASE WHEN p.payment_method = 'CASH' THEN p.amount ELSE 0 END), 0)`, 'cashCollected')
      .getRawOne();

    const totalSalesAmount = Number(deliveryStats?.totalSalesAmount ?? 0);
    const totalCollected = Number(paymentStats?.totalCollected ?? 0);
    const cashCollected = Number(paymentStats?.cashCollected ?? 0);

    return {
      message: 'Employee summary retrieved',
      data: {
        totalDeliveries: Number(deliveryStats?.totalDeliveries ?? 0),
        totalSalesAmount,
        totalCollected,
        cashOnHand: cashCollected,
        pendingAmount: Math.max(0, totalSalesAmount - totalCollected),
      },
    };
  }

  async getEmployeeDeliveries(id: string, page = 1, limit = 10, startDate?: string, endDate?: string) {
    const user = await this.userRepo.findOne({ where: { id, role: Role.DRIVER } });
    if (!user) throw new NotFoundException('Employee not found');

    const norm = normalizePagination({ page, limit });
    const qb = this.deliveryRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.store', 'store')
      .leftJoinAndSelect('d.vanAssignment', 'va')
      .leftJoinAndSelect('va.van', 'van')
      .where('d.driverId = :id', { id })
      .orderBy('d.deliveryDate', 'DESC')
      .addOrderBy('d.createdAt', 'DESC')
      .skip((norm.page - 1) * norm.limit)
      .take(norm.limit);

    if (startDate) qb.andWhere('d.deliveryDate >= :startDate', { startDate });
    if (endDate) qb.andWhere('d.deliveryDate <= :endDate', { endDate });

    const [deliveries, total] = await qb.getManyAndCount();

    // Fetch approved payment methods for these deliveries
    const deliveryIds = deliveries.map((d) => d.id);
    let paymentMap = new Map<string, string>();
    if (deliveryIds.length > 0) {
      const rows = await this.deliveryRepo.manager
        .createQueryBuilder()
        .select('pd.delivery_id', 'deliveryId')
        .addSelect('p.payment_method', 'paymentMethod')
        .from('payment_deliveries', 'pd')
        .innerJoin('payments', 'p', 'p.id = pd.payment_id AND p.status = :status', { status: PaymentStatus.APPROVED })
        .where('pd.delivery_id IN (:...ids)', { ids: deliveryIds })
        .getRawMany();
      paymentMap = new Map(rows.map((r) => [r.deliveryId, r.paymentMethod]));
    }

    const data = deliveries.map((d) => ({
      id: d.id,
      storeName: d.store?.name ?? '—',
      deliveryDate: d.deliveryDate,
      vanName: d.vanAssignment?.van?.vanNumber ?? '—',
      ratePerUnit: d.totalUnits > 0 ? Number(d.totalAmount) / d.totalUnits : 0,
      totalUnits: d.totalUnits,
      totalAmount: Number(d.totalAmount),
      paymentMethod: paymentMap.get(d.id) ?? null,
      paymentStatus: d.paymentStatus,
    }));

    return { message: 'Employee deliveries retrieved', data, meta: buildMeta(total, norm.page, norm.limit) };
  }
}
