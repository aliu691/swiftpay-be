import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class LedgerAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // PLATFORM_CASH, GROUP_POOL

  @Column()
  name: string;

  @Column()
  type: 'asset' | 'liability';

  @CreateDateColumn()
  createdAt: Date;
}
