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
import { Store } from './store.entity';
import { User } from './user.entity';
import { DeliveryPaymentStatus } from '../../common/enums/payment-status.enum';

@Entity('deliveries')
export class Delivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'van_assignment_id', type: 'uuid' })
  vanAssignmentId: string;

  @ManyToOne(() => VanAssignment)
  @JoinColumn({ name: 'van_assignment_id' })
  vanAssignment: VanAssignment;

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

  @Column({ name: 'delivery_date', type: 'date' })
  deliveryDate: string;

  @Column({ name: 'total_units', type: 'integer' })
  totalUnits: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: DeliveryPaymentStatus,
    default: DeliveryPaymentStatus.UNPAID,
  })
  paymentStatus: DeliveryPaymentStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
