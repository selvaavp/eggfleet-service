import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThan, Repository } from 'typeorm';
import { DamagedEgg } from '../../../database/entities/damaged-egg.entity';
import { Inventory } from '../../../database/entities/inventory.entity';
import { DamageReason } from '../../../common/enums/damage-reason.enum';
import { CreateDamagedEggDto } from '../dto/create-damaged-egg.dto';
import { normalizePagination, buildMeta } from '../../../common/utils/pagination.util';
import { todayIST, timeIST } from '../../../common/utils/date.util';

@Injectable()
export class AdminDamagedEggsService {
  constructor(
    @InjectRepository(DamagedEgg) private damagedEggRepo: Repository<DamagedEgg>,
    private dataSource: DataSource,
  ) {}

  async list(date?: string, reason?: DamageReason, page = 1, limit = 10) {
    const norm = normalizePagination({ page, limit });
    const qb = this.damagedEggRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.driver', 'driver')
      .leftJoinAndSelect('d.inventory', 'inventory')
      .leftJoinAndSelect('d.recordedByUser', 'recordedBy')
      .orderBy('d.damageDate', 'DESC')
      .addOrderBy('d.createdAt', 'DESC')
      .skip((norm.page - 1) * norm.limit)
      .take(norm.limit);

    if (date) qb.where('d.damage_date = :date', { date });
    if (reason) qb.andWhere('d.reason = :reason', { reason });

    const [items, total] = await qb.getManyAndCount();
    return {
      message: 'Damaged eggs retrieved',
      data: items.map((d) => ({
        id: d.id,
        vanAssignmentId: d.vanAssignmentId,
        driverId: d.driverId,
        driverName: d.driver?.name ?? null,
        inventoryId: d.inventoryId,
        eggCount: d.eggCount,
        reason: d.reason,
        damageDate: d.damageDate,
        damageTime: d.damageTime,
        recordedBy: d.recordedByUser?.name ?? null,
        createdAt: d.createdAt,
      })),
      meta: buildMeta(total, norm.page, norm.limit),
    };
  }

  async create(dto: CreateDamagedEggDto, adminId: string) {
    return this.dataSource.transaction(async (manager) => {
      if (dto.inventoryId) {
        const inventory = await manager.findOne(Inventory, { where: { id: dto.inventoryId } });
        if (!inventory) throw new NotFoundException('Inventory not found');
        if (inventory.availableUnits < dto.eggCount) {
          throw new BadRequestException(`Only ${inventory.availableUnits} units available`);
        }
        inventory.availableUnits -= dto.eggCount;
        inventory.damagedUnits += dto.eggCount;
        await manager.save(Inventory, inventory);
      } else if (dto.reason === DamageReason.STORAGE) {
        // No specific batch — deduct FIFO from oldest batches with available stock
        const batches = await manager.find(Inventory, {
          where: { availableUnits: MoreThan(0) },
          order: { purchaseDate: 'ASC', createdAt: 'ASC' },
        });
        const totalAvailable = batches.reduce((s, b) => s + b.availableUnits, 0);
        if (totalAvailable < dto.eggCount) {
          throw new BadRequestException(`Only ${totalAvailable} units available across all batches`);
        }
        let remaining = dto.eggCount;
        for (const batch of batches) {
          if (remaining <= 0) break;
          const deduct = Math.min(batch.availableUnits, remaining);
          batch.availableUnits -= deduct;
          batch.damagedUnits += deduct;
          await manager.save(Inventory, batch);
          remaining -= deduct;
        }
      }

      const entry = manager.create(DamagedEgg, {
        ...dto,
        recordedBy: adminId,
        damageDate: dto.damageDate ?? todayIST(),
        damageTime: dto.damageTime ?? timeIST(),
      });
      const saved = await manager.save(DamagedEgg, entry);
      return { message: 'Damaged egg entry recorded', data: saved };
    });
  }

  async getById(id: string) {
    const entry = await this.damagedEggRepo.findOne({
      where: { id },
      relations: ['driver', 'inventory', 'recordedByUser', 'vanAssignment'],
    });
    if (!entry) throw new NotFoundException('Damaged egg record not found');
    return { message: 'Damaged egg record retrieved', data: entry };
  }

  async update(id: string, dto: Partial<CreateDamagedEggDto>) {
    const entry = await this.damagedEggRepo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException('Damaged egg record not found');
    Object.assign(entry, dto);
    await this.damagedEggRepo.save(entry);
    return { message: 'Damaged egg record updated', data: entry };
  }

  async remove(id: string) {
    const entry = await this.damagedEggRepo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException('Damaged egg record not found');
    return this.dataSource.transaction(async (manager) => {
      if (entry.inventoryId) {
        const inventory = await manager.findOne(Inventory, { where: { id: entry.inventoryId } });
        if (inventory) {
          inventory.availableUnits += entry.eggCount;
          inventory.damagedUnits = Math.max(0, inventory.damagedUnits - entry.eggCount);
          await manager.save(Inventory, inventory);
        }
      }
      await manager.remove(DamagedEgg, entry);
      return { message: 'Damaged egg record deleted' };
    });
  }
}
