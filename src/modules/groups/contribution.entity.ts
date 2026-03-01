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

export enum FailureReason {
  FAILED_AUTHORIZATION = 'FAILED_AUTHORIZATION',
  WEBHOOK_TIMEOUT = 'WEBHOOK_TIMEOUT',
  SIGNATURE_INVALID = 'SIGNATURE_INVALID',
  BANK_DECLINED = 'BANK_DECLINED',
  PSP_TIMEOUT = 'PSP_TIMEOUT',
  OVERFUNDING_BLOCKED = 'OVERFUNDING_BLOCKED',
  PAYSTACK_FAILED = 'PAYSTACK_FAILED',
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

  @Column({
    type: 'enum',
    enum: FailureReason,
    nullable: true,
  })
  failureReason?: FailureReason;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  failedAt?: Date;

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
