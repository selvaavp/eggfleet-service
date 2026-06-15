import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('vendors')
export class Vendor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'vendor_code', type: 'varchar' })
  vendorCode: string;

  @Column({ type: 'varchar' })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 10 })
  phone: string;

  @Index({ unique: true, where: '"email" IS NOT NULL' })
  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  /** AES-256 encrypted */
  @Column({ name: 'aadhar_number', type: 'varchar', nullable: true })
  aadharNumber: string | null;

  /** AES-256 encrypted */
  @Column({ name: 'bank_name', type: 'varchar', nullable: true })
  bankName: string | null;

  /** AES-256 encrypted */
  @Column({ name: 'bank_account_number', type: 'varchar', nullable: true })
  bankAccountNumber: string | null;

  /** AES-256 encrypted */
  @Column({ name: 'bank_ifsc', type: 'varchar', nullable: true })
  bankIfsc: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
