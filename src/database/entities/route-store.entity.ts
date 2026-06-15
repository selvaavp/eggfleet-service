import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Route } from './route.entity';
import { Store } from './store.entity';

@Unique('UQ_route_store', ['routeId', 'storeId'])
@Entity('route_stores')
export class RouteStore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'route_id', type: 'uuid' })
  routeId: string;

  @ManyToOne(() => Route, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'route_id' })
  route: Route;

  @Column({ name: 'store_id', type: 'uuid' })
  storeId: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ name: 'sort_order', type: 'integer' })
  sortOrder: number;
}
