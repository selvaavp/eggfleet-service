import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Vendor } from './vendor.entity';
import { User } from './user.entity';
import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { VendorPaymentStatus } from '../../common/enums/vendor-payment-status.enum';

@Entity('vendor_payments')
export class VendorPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId: string;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'payment_method', type: 'enum', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate: string;

  @Column({ type: 'enum', enum: VendorPaymentStatus, default: VendorPaymentStatus.PAID })
  status: VendorPaymentStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
