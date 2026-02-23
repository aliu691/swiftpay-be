import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Group } from './group.entity';

export enum PaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
}

export enum PaymentStatus {
  INITIATED = 'initiated',
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity()
export class Contribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.INITIATED,
  })
  status: PaymentStatus;

  @Column({ unique: true })
  paymentReference: string;

  @Column({ nullable: true })
  failureReason?: string;

  @Column({ nullable: true })
  processedAt?: Date;

  @Column({ nullable: true })
  webhookEventId?: string;

  @Column({ type: 'json', nullable: true })
  webhookPayload?: any;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  group: Group;

  @CreateDateColumn()
  createdAt: Date;
}
