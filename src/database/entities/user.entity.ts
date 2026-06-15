import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Role } from '../../common/enums/role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Index({ unique: true, where: '"email" IS NOT NULL' })
  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Index({ unique: true, where: '"phone" IS NOT NULL' })
  @Column({ type: 'varchar', length: 10, nullable: true })
  phone: string | null;

  @Column({ name: 'password_hash', type: 'varchar' })
  passwordHash: string;

  @Column({ type: 'enum', enum: Role })
  role: Role;

  @Column({ name: 'profile_picture_url', type: 'varchar', nullable: true })
  profilePictureUrl: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'fcm_token', type: 'varchar', nullable: true })
  fcmToken: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
