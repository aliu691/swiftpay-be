import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { LedgerEntry } from './ledger-entry.entity';
import { LedgerAccount } from './ledger-account.entity';

@Entity()
export class LedgerLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => LedgerEntry, (entry) => entry.lines, {
    onDelete: 'CASCADE',
  })
  entry: LedgerEntry;

  @ManyToOne(() => LedgerAccount)
  account: LedgerAccount;

  @Column({ type: 'int', default: 0 })
  debit: number;

  @Column({ type: 'int', default: 0 })
  credit: number;
}
