import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Van } from './van.entity';
import { User } from './user.entity';
import { ExpenseCategory } from '../../common/enums/expense-category.enum';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ExpenseCategory })
  category: ExpenseCategory;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'expense_date', type: 'date' })
  expenseDate: string;

  @Column({ name: 'van_id', type: 'uuid', nullable: true })
  vanId: string | null;

  @ManyToOne(() => Van, { nullable: true })
  @JoinColumn({ name: 'van_id' })
  van: Van;

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
