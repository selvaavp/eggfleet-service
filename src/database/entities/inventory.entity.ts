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

@Entity('inventory')
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId: string;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column({ name: 'purchase_date', type: 'date' })
  purchaseDate: string;

  @Column({ name: 'rate_per_unit', type: 'decimal', precision: 10, scale: 2 })
  ratePerUnit: number;

  @Column({ name: 'total_units', type: 'integer' })
  totalUnits: number;

  @Column({ name: 'good_units', type: 'integer' })
  goodUnits: number;

  @Column({ name: 'damaged_units', type: 'integer', default: 0 })
  damagedUnits: number;

  @Column({ name: 'available_units', type: 'integer' })
  availableUnits: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

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
