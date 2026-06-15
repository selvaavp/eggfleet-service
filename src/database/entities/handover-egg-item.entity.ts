import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Handover } from './handover.entity';
import { VanLoad } from './van-load.entity';

@Unique('UQ_handover_egg_item_handover_vanload', ['handoverId', 'vanLoadId'])
@Entity('handover_egg_items')
export class HandoverEggItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'handover_id', type: 'uuid' })
  handoverId: string;

  @ManyToOne(() => Handover, (h) => h.eggItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'handover_id' })
  handover: Handover;

  @Column({ name: 'van_load_id', type: 'uuid' })
  vanLoadId: string;

  @ManyToOne(() => VanLoad)
  @JoinColumn({ name: 'van_load_id' })
  vanLoad: VanLoad;

  @Column({ name: 'rate_per_unit', type: 'decimal', precision: 10, scale: 2 })
  ratePerUnit: number;

  @Column({ name: 'good_units', type: 'integer', default: 0 })
  goodUnits: number;

  @Column({ name: 'damaged_units', type: 'integer', default: 0 })
  damagedUnits: number;
}
