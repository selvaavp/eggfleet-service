import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { VanAssignment } from './van-assignment.entity';
import { User } from './user.entity';
import { Inventory } from './inventory.entity';
import { DamageReason } from '../../common/enums/damage-reason.enum';

@Entity('damaged_eggs')
export class DamagedEgg {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'van_assignment_id', type: 'uuid', nullable: true })
  vanAssignmentId: string | null;

  @ManyToOne(() => VanAssignment, { nullable: true })
  @JoinColumn({ name: 'van_assignment_id' })
  vanAssignment: VanAssignment;

  @Column({ name: 'driver_id', type: 'uuid', nullable: true })
  driverId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'driver_id' })
  driver: User;

  @Column({ name: 'inventory_id', type: 'uuid', nullable: true })
  inventoryId: string | null;

  @ManyToOne(() => Inventory, { nullable: true })
  @JoinColumn({ name: 'inventory_id' })
  inventory: Inventory;

  @Column({ name: 'egg_count', type: 'integer' })
  eggCount: number;

  @Column({ type: 'enum', enum: DamageReason })
  reason: DamageReason;

  @Column({ name: 'damage_date', type: 'date' })
  damageDate: string;

  @Column({ name: 'damage_time', type: 'time' })
  damageTime: string;

  @Column({ name: 'recorded_by', type: 'uuid' })
  recordedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recorded_by' })
  recordedByUser: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
