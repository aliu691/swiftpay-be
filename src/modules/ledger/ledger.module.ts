// src/modules/ledger/ledger.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerService } from './ledger.service';
import { LedgerController } from './ledger.controller';
import { LedgerAccount } from './ledger-account.entity';
import { LedgerEntry } from './ledger-entry.entity';
import { LedgerLine } from './ledger-line.entity';
import { Contribution } from '../groups/contribution.entity';
import { Group } from '../groups/group.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LedgerAccount,
      LedgerEntry,
      LedgerLine,
      Group,
      Contribution,
    ]),
  ],
  providers: [LedgerService],
  controllers: [LedgerController],
  exports: [LedgerService],
})
export class LedgerModule {}
