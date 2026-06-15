import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Store } from './store.entity';
import { User } from './user.entity';
import { VanAssignment } from './van-assignment.entity';
import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'store_id', type: 'uuid' })
  storeId: string;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'driver_id' })
  driver: User;

  @Column({ name: 'van_assignment_id', type: 'uuid' })
  vanAssignmentId: string;

  @ManyToOne(() => VanAssignment)
  @JoinColumn({ name: 'van_assignment_id' })
  vanAssignment: VanAssignment;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'payment_method', type: 'enum', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Column({ name: 'proof_url', type: 'varchar', nullable: true })
  proofUrl: string | null;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ name: 'admin_note', type: 'text', nullable: true })
  adminNote: string | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approvedByUser: User;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate: string;

  @Column({ name: 'payment_time', type: 'time' })
  paymentTime: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
