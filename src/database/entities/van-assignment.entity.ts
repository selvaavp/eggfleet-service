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
import { Van } from './van.entity';
import { Route } from './route.entity';
import { User } from './user.entity';
import { VanAssignmentStatus } from '../../common/enums/van-assignment-status.enum';

// Only ACTIVE assignments must be unique per van/driver per day — cancelled/completed
// rows may repeat. Mirrors the partial indexes in the DB so `synchronize` leaves them alone.
@Index('UQ_van_assignment_driver_date_active', ['driverId', 'assignedDate'], {
  unique: true,
  where: `"status" = 'ACTIVE'`,
})
@Index('UQ_van_assignment_van_date_active', ['vanId', 'assignedDate'], {
  unique: true,
  where: `"status" = 'ACTIVE'`,
})
@Entity('van_assignments')
export class VanAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'van_id', type: 'uuid' })
  vanId: string;

  @ManyToOne(() => Van)
  @JoinColumn({ name: 'van_id' })
  van: Van;

  @Column({ name: 'route_id', type: 'uuid' })
  routeId: string;

  @ManyToOne(() => Route)
  @JoinColumn({ name: 'route_id' })
  route: Route;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'driver_id' })
  driver: User;

  @Column({ name: 'assigned_date', type: 'date' })
  assignedDate: string;

  @Column({ type: 'enum', enum: VanAssignmentStatus, default: VanAssignmentStatus.ACTIVE })
  status: VanAssignmentStatus;

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
