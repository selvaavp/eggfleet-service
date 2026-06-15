import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Route } from './route.entity';

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ name: 'owner_contact_name', type: 'varchar' })
  ownerContactName: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 10 })
  phone: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ name: 'route_id', type: 'uuid', nullable: true })
  routeId: string | null;

  @ManyToOne(() => Route, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'route_id' })
  route: Route;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
