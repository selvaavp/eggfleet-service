import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { VanAssignment } from './van-assignment.entity';
import { HandoverEggItem } from './handover-egg-item.entity';
import { HandoverStatus } from '../../common/enums/handover-status.enum';

@Entity('handovers')
export class Handover {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'driver_id' })
  driver: User;

  @Column({ name: 'admin_id', type: 'uuid' })
  adminId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'admin_id' })
  admin: User;

  @Index({ unique: true })
  @Column({ name: 'van_assignment_id', type: 'uuid' })
  vanAssignmentId: string;

  @ManyToOne(() => VanAssignment)
  @JoinColumn({ name: 'van_assignment_id' })
  vanAssignment: VanAssignment;

  @Column({ name: 'handover_date', type: 'date' })
  handoverDate: string;

  @Column({ name: 'handover_time', type: 'time' })
  handoverTime: string;

  @Column({ name: 'cash_amount', type: 'decimal', precision: 10, scale: 2 })
  cashAmount: number;

  @Column({ type: 'enum', enum: HandoverStatus, default: HandoverStatus.PENDING })
  status: HandoverStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approvedByUser: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => HandoverEggItem, (item) => item.handover)
  eggItems: HandoverEggItem[];
}
