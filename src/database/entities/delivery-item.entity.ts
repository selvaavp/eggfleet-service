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
import { Delivery } from './delivery.entity';
import { VanLoad } from './van-load.entity';

@Unique('UQ_delivery_item_delivery_vanload', ['deliveryId', 'vanLoadId'])
@Entity('delivery_items')
export class DeliveryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'delivery_id', type: 'uuid' })
  deliveryId: string;

  @ManyToOne(() => Delivery, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'delivery_id' })
  delivery: Delivery;

  @Column({ name: 'van_load_id', type: 'uuid' })
  vanLoadId: string;

  @ManyToOne(() => VanLoad)
  @JoinColumn({ name: 'van_load_id' })
  vanLoad: VanLoad;

  @Column({ name: 'rate_per_unit', type: 'decimal', precision: 10, scale: 2 })
  ratePerUnit: number;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
