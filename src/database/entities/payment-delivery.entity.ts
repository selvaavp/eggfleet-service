import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Payment } from './payment.entity';
import { Delivery } from './delivery.entity';

@Unique('UQ_payment_delivery', ['paymentId', 'deliveryId'])
@Entity('payment_deliveries')
export class PaymentDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payment_id', type: 'uuid' })
  paymentId: string;

  @ManyToOne(() => Payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @Column({ name: 'delivery_id', type: 'uuid' })
  deliveryId: string;

  @ManyToOne(() => Delivery)
  @JoinColumn({ name: 'delivery_id' })
  delivery: Delivery;
}
