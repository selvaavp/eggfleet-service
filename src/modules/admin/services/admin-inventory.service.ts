import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Inventory } from '../../../database/entities/inventory.entity';
import { VanLoad } from '../../../database/entities/van-load.entity';
import { VanAssignment } from '../../../database/entities/van-assignment.entity';
import { CreateInventoryDto } from '../dto/create-inventory.dto';
import { CreateVanLoadDto } from '../dto/create-van-load.dto';
import { normalizePagination, buildMeta } from '../../../common/utils/pagination.util';

@Injectable()
export class AdminInventoryService {
  constructor(
    @InjectRepository(Inventory) private inventoryRepo: Repository<Inventory>,
    @InjectRepository(VanLoad) private vanLoadRepo: Repository<VanLoad>,
    @InjectRepository(VanAssignment) private assignmentRepo: Repository<VanAssignment>,
    private dataSource: DataSource,
  ) {}

  async listInventory(page = 1, limit = 10) {
    const norm = normalizePagination({ page, limit });
    const [items, total] = await this.inventoryRepo.findAndCount({
      relations: ['vendor'],
      order: { createdAt: 'DESC' },
      skip: (norm.page - 1) * norm.limit,
      take: norm.limit,
    });
    return { message: 'Inventory retrieved', data: items, meta: buildMeta(total, norm.page, norm.limit) };
  }

  async createInventory(dto: CreateInventoryDto) {
    const totalAmount = dto.totalUnits * dto.ratePerUnit;
    const inventory = this.inventoryRepo.create({
      vendorId: dto.vendorId,
      purchaseDate: dto.purchaseDate,
      totalUnits: dto.totalUnits,
      goodUnits: dto.goodUnits,
      damagedUnits: dto.totalUnits - dto.goodUnits,
      availableUnits: dto.goodUnits,
      ratePerUnit: dto.ratePerUnit,
      totalAmount,
      createdBy: dto.createdBy,
    });
    await this.inventoryRepo.save(inventory);
    return { message: 'Inventory created', data: inventory };
  }

  async createVanLoad(dto: CreateVanLoadDto) {
    return this.dataSource.transaction(async manager => {
      const assignment = await manager.findOne(VanAssignment, { where: { id: dto.vanAssignmentId } });
      if (!assignment) throw new NotFoundException('Assignment not found');
      const inventory = await manager.findOne(Inventory, { where: { id: dto.inventoryId } });
      if (!inventory) throw new NotFoundException('Inventory not found');
      if (inventory.availableUnits < dto.loadedUnits) {
        throw new BadRequestException(`Only ${inventory.availableUnits} units available`);
      }
      inventory.availableUnits -= dto.loadedUnits;
      await manager.save(inventory);
      const load = manager.create(VanLoad, {
        vanAssignmentId: dto.vanAssignmentId,
        inventoryId: dto.inventoryId,
        loadedUnits: dto.loadedUnits,
        ratePerUnit: dto.ratePerUnit,
        soldUnits: 0,
        damagedUnits: 0,
        returnedUnits: 0,
      });
      await manager.save(load);
      return { message: 'Van loaded', data: load };
    });
  }

  async listVanLoads(vanAssignmentId: string) {
    const loads = await this.vanLoadRepo.find({
      where: { vanAssignmentId },
      relations: ['inventory', 'inventory.vendor'],
    });
    return { message: 'Van loads retrieved', data: loads };
  }
}
