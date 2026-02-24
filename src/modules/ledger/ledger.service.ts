// src/modules/ledger/ledger.service.ts

import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiResponse } from 'src/utils/api-response';
import { Repository } from 'typeorm';
import { LedgerAccount } from './ledger-account.entity';
import { LedgerEntry } from './ledger-entry.entity';
import { LedgerLine } from './ledger-line.entity';

@Injectable()
export class LedgerService implements OnModuleInit {
  constructor(
    @InjectRepository(LedgerAccount)
    private accountRepo: Repository<LedgerAccount>,

    @InjectRepository(LedgerEntry)
    private entryRepo: Repository<LedgerEntry>,

    @InjectRepository(LedgerLine)
    private lineRepo: Repository<LedgerLine>,
  ) {}

  // 🔥 Auto-seed accounts
  async onModuleInit() {
    await this.seedAccounts();
  }

  async seedAccounts() {
    const existing = await this.accountRepo.findOne({
      where: { code: 'PLATFORM_CASH' },
    });

    if (existing) return;

    await this.accountRepo.save({
      code: 'PLATFORM_CASH',
      name: 'Platform Cash Account',
      type: 'asset',
    });
  }

  // 🔥 Create balanced entry
  async createDoubleEntry(
    reference: string,
    description: string,
    debitAccountCode: string,
    creditAccountCode: string,
    amount: number,
  ) {
    const debitAccount = await this.accountRepo.findOne({
      where: { code: debitAccountCode },
    });

    const creditAccount = await this.accountRepo.findOne({
      where: { code: creditAccountCode },
    });

    if (!debitAccount || !creditAccount) {
      throw new Error('Ledger account not found');
    }

    const entry = this.entryRepo.create({
      reference,
      description,
      lines: [
        {
          account: debitAccount,
          debit: amount,
          credit: 0,
        },
        {
          account: creditAccount,
          debit: 0,
          credit: amount,
        },
      ],
    });

    return this.entryRepo.save(entry);
  }

  // 🔥 Admin Ledger Summary
  async getLedgerSummary() {
    const accounts = await this.accountRepo.find();
    const lines = await this.lineRepo.find({
      relations: ['account'],
    });

    const balances: Record<string, number> = {};

    // Initialize all accounts to 0
    for (const account of accounts) {
      balances[account.code] = 0;
    }

    // Apply transactions
    for (const line of lines) {
      balances[line.account.code] += line.debit - line.credit;
    }

    const entriesCount = await this.entryRepo.count();

    return ApiResponse.success('Ledger summary retrieved', {
      balances,
      totalTransactions: entriesCount,
    });
  }

  async getAllEntries() {
    const entries = await this.entryRepo.find({
      relations: ['lines', 'lines.account'],
      order: { createdAt: 'DESC' },
    });

    return ApiResponse.success('Ledger entries retrieved', entries);
  }

  async getGroupBalance(groupId: string): Promise<number> {
    const code = `GROUP_POOL_${groupId}`;

    const lines = await this.lineRepo
      .createQueryBuilder('line')
      .leftJoinAndSelect('line.account', 'account')
      .where('account.code = :code', { code })
      .getMany();

    let balance = 0;

    for (const line of lines) {
      balance += line.debit - line.credit;
    }

    return Math.abs(balance); // 🔥 FIX
  }

  async createGroupPoolAccount(groupId: string) {
    const code = `GROUP_POOL_${groupId}`;

    const existing = await this.accountRepo.findOne({
      where: { code },
    });

    if (existing) return;

    await this.accountRepo.save({
      code,
      name: `Group Pool ${groupId}`,
      type: 'liability',
    });
  }
}
