import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { VanAssignment } from './van-assignment.entity';
import { Inventory } from './inventory.entity';

@Unique('UQ_van_load_assignment_inventory', ['vanAssignmentId', 'inventoryId'])
@Entity('van_loads')
export class VanLoad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'van_assignment_id', type: 'uuid' })
  vanAssignmentId: string;

  @ManyToOne(() => VanAssignment)
  @JoinColumn({ name: 'van_assignment_id' })
  vanAssignment: VanAssignment;

  @Column({ name: 'inventory_id', type: 'uuid' })
  inventoryId: string;

  @ManyToOne(() => Inventory)
  @JoinColumn({ name: 'inventory_id' })
  inventory: Inventory;

  @Column({ name: 'rate_per_unit', type: 'decimal', precision: 10, scale: 2 })
  ratePerUnit: number;

  @Column({ name: 'loaded_units', type: 'integer' })
  loadedUnits: number;

  @Column({ name: 'sold_units', type: 'integer', default: 0 })
  soldUnits: number;

  @Column({ name: 'damaged_units', type: 'integer', default: 0 })
  damagedUnits: number;

  @Column({ name: 'returned_units', type: 'integer', default: 0 })
  returnedUnits: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
