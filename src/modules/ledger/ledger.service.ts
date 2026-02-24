// src/modules/ledger/ledger.service.ts

import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiResponse } from 'src/utils/api-response';
import { Repository } from 'typeorm';
import { Contribution, PaymentStatus } from '../groups/contribution.entity';
import { Group, GroupStatus } from '../groups/group.entity';
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

    @InjectRepository(Group)
    private groupRepo: Repository<Group>,

    @InjectRepository(Contribution)
    private contributionRepo: Repository<Contribution>,
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

  async getAllEntries(
    page = 1,
    limit = 20,
    reference?: string,
    accountCode?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;

    const query = this.entryRepo
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.lines', 'line')
      .leftJoinAndSelect('line.account', 'account')
      .orderBy('entry.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (reference) {
      query.andWhere('entry.reference ILIKE :reference', {
        reference: `%${reference}%`,
      });
    }

    if (accountCode) {
      query.andWhere('account.code = :accountCode', {
        accountCode,
      });
    }

    if (startDate) {
      query.andWhere('entry.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      query.andWhere('entry.createdAt <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    const [entries, total] = await query.getManyAndCount();

    return ApiResponse.success('Ledger entries retrieved', {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      entries,
    });
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

  async reconcile(startDate?: string, endDate?: string) {
    const query = this.lineRepo
      .createQueryBuilder('line')
      .leftJoinAndSelect('line.account', 'account')
      .leftJoin('line.entry', 'entry');

    if (startDate) {
      query.andWhere('entry.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      query.andWhere('entry.createdAt <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    const lines = await query.getMany();

    const balances: Record<string, number> = {};

    for (const line of lines) {
      const code = line.account.code;

      if (!balances[code]) balances[code] = 0;

      balances[code] += line.debit - line.credit;
    }

    const platformCash = balances['PLATFORM_CASH'] || 0;

    const totalGroupLiabilities = Object.entries(balances)
      .filter(([code]) => code.startsWith('GROUP_POOL_'))
      .reduce((sum, [, value]) => sum + Math.abs(value), 0);

    return ApiResponse.success('Reconciliation result', {
      platformCash,
      totalGroupLiabilities,
      balanced: platformCash === totalGroupLiabilities,
    });
  }

  async getAdminDashboard(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    // =========================
    // Contributions (INFLOW)
    // =========================

    const contributionQuery = this.contributionRepo
      .createQueryBuilder('c')
      .where('c.status = :status', { status: PaymentStatus.SUCCESS });

    if (start) {
      contributionQuery.andWhere('c.createdAt >= :start', { start });
    }

    if (end) {
      contributionQuery.andWhere('c.createdAt <= :end', { end });
    }

    const contributions = await contributionQuery.getMany();

    const totalContributions = contributions.reduce(
      (sum, c) => sum + c.amount,
      0,
    );

    const successfulPayments = contributions.length;
    const totalAttempts = await this.contributionRepo.count();

    const successRate =
      totalAttempts === 0
        ? 0
        : Math.round((successfulPayments / totalAttempts) * 100);

    // =========================
    // Payouts (OUTFLOW)
    // =========================

    const payoutQuery = this.entryRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.lines', 'line')
      .leftJoinAndSelect('line.account', 'account') // ✅ ADD THIS
      .where('e.description = :desc', { desc: 'Group payout' });

    if (start) {
      payoutQuery.andWhere('e.createdAt >= :start', { start });
    }

    if (end) {
      payoutQuery.andWhere('e.createdAt <= :end', { end });
    }

    const payoutEntries = await payoutQuery.getMany();

    const totalPayoutAmount = payoutEntries.reduce((sum, entry) => {
      const payoutLine = entry.lines.find(
        (l) => l.account && l.account.code === 'PLATFORM_CASH',
      );
      return sum + (payoutLine?.credit || 0);
    }, 0);

    const paidOutGroups = payoutEntries.length;

    // =========================
    // Group States
    // =========================

    const activeGroups = await this.groupRepo.count({
      where: { status: GroupStatus.ACTIVE },
    });

    const completedGroups = await this.groupRepo.count({
      where: { status: GroupStatus.COMPLETED },
    });

    const disbursedGroups = await this.groupRepo.count({
      where: { status: GroupStatus.DISBURSED },
    });

    return ApiResponse.success('Admin dashboard metrics', {
      totalContributions,
      totalPayoutAmount,
      paidOutGroups,
      activeGroups,
      completedGroups,
      disbursedGroups,
      successRate: `${successRate}%`,
    });
  }
}
