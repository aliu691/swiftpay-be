import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiResponse } from 'src/utils/api-response';
import { buildDateRange } from 'src/utils/date-range.util';
import { Repository, Between } from 'typeorm';
import {
  Contribution,
  FailureReason,
  PaymentStatus,
} from '../groups/contribution.entity';

@Injectable()
export class AdminService {
  private simulatedFailureRate = 0;
  private forcedFailureReason: FailureReason | null = null;

  constructor(
    @InjectRepository(Contribution)
    private contributionRepo: Repository<Contribution>,
  ) {}

  /* ===========================
     PAYMENT EXPLORER
  =========================== */

  async getPayments(
    page: number,
    limit: number,
    startDate?: string,
    endDate?: string,
    status?: PaymentStatus,
  ) {
    const skip = (page - 1) * limit;

    const query = this.contributionRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.user', 'user')
      .leftJoinAndSelect('c.group', 'group')
      .orderBy('c.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const { start, end } = buildDateRange(startDate, endDate);

    if (start) {
      query.andWhere('c.createdAt >= :start', { start });
    }

    if (end) {
      query.andWhere('c.createdAt <= :end', { end });
    }

    if (status) {
      query.andWhere('c.status = :status', { status });
    }

    const [payments, total] = await query.getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return ApiResponse.success('Payments retrieved', {
      meta: {
        totalRecords: total,
        totalPages,
        currentPage: page,
        pageSize: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      filters: {
        startDate: startDate ?? null,
        endDate: endDate ?? null,
        status: status ?? null,
      },
      data: payments.map((p) => ({
        id: p.id,
        reference: p.paymentReference,
        userEmail: p.user.email,
        groupId: p.group.id,
        amount: p.amount,
        status: p.status,
        failureReason: p.failureReason,
        createdAt: p.createdAt,
      })),
    });
  }

  /* ===========================
     PAYMENT HEALTH
  =========================== */

  async getPaymentHealth(startDate?: string, endDate?: string) {
    const where: any = {};

    const { start, end } = buildDateRange(startDate, endDate);

    if (start && end) {
      where.createdAt = Between(start, end);
    } else if (start) {
      where.createdAt = Between(start, new Date());
    } else if (end) {
      where.createdAt = Between(new Date('1970-01-01'), end);
    }

    const payments = await this.contributionRepo.find({ where });

    const totalAttempts = payments.length;

    const successful = payments.filter(
      (p) => p.status === PaymentStatus.SUCCESS,
    ).length;

    const failed = payments.filter(
      (p) => p.status === PaymentStatus.FAILED,
    ).length;

    const successRate =
      totalAttempts > 0 ? Math.round((successful / totalAttempts) * 100) : 0;

    return ApiResponse.success('Payment health metrics retrieved', {
      filters: {
        startDate: startDate ?? null,
        endDate: endDate ?? null,
      },
      totalAttempts,
      successful,
      failed,
      successRate,
    });
  }

  /* ===========================
     PAYMENT TRENDS
  =========================== */

  async getPaymentTrends(days: number) {
    const results = [];

    for (let i = days - 1; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      const payments = await this.contributionRepo.find({
        where: {
          createdAt: Between(start, end),
        },
      });

      const total = payments.length;

      const successful = payments.filter(
        (p) => p.status === PaymentStatus.SUCCESS,
      ).length;

      const successRate =
        total > 0 ? Math.round((successful / total) * 100) : 0;

      results.push({
        date: start.toISOString().split('T')[0],
        total,
        successRate,
      });
    }

    // 🔥 Reverse so today comes first
    const reversed = results.reverse();

    const today = reversed[0];
    const yesterday = reversed[1];

    let incident = false;
    let dropPercentage = 0;

    // Only compare if we have at least 2 days
    if (
      today &&
      yesterday &&
      yesterday.total > 0 // prevent comparing against empty day
    ) {
      dropPercentage = yesterday.successRate - today.successRate;

      if (dropPercentage >= 15) {
        incident = true;
      }
    }

    return ApiResponse.success('Payment trends retrieved', {
      incident,
      dropPercentage,
      comparison: {
        today: today?.successRate ?? null,
        yesterday: yesterday?.successRate ?? null,
      },
      data: reversed,
    });
  }

  /* =====================================================
     FORCED FAILURE (DEMO CONTROL)
  ===================================================== */

  forceNextFailure(reason: FailureReason) {
    this.forcedFailureReason = reason;

    return ApiResponse.success(`Next payment will fail with ${reason}`, {
      reason,
    });
  }

  getForcedFailureReason() {
    return this.forcedFailureReason;
  }

  clearForcedFailure() {
    this.forcedFailureReason = null;
  }

  /* =====================================================
     SIMULATION (RANDOM FAILURE MODE)
  ===================================================== */

  setSimulationFailureRate(rate: number) {
    this.simulatedFailureRate = rate;

    return ApiResponse.success(`Simulation failure rate set to ${rate}%`, {
      failureRate: rate,
    });
  }

  getSimulationFailureRate() {
    return this.simulatedFailureRate;
  }

  /* =====================================================
     FAILURE BREAKDOWN
  ===================================================== */

  async getFailureBreakdown(
    startDate?: string,
    endDate?: string,
    failureReason?: string,
    includeTransactions?: boolean,
  ) {
    const { start, end } = buildDateRange(startDate, endDate);

    const baseQuery = this.contributionRepo
      .createQueryBuilder('c')
      .where('c.status = :status', { status: PaymentStatus.FAILED });

    if (start) {
      baseQuery.andWhere('c.createdAt >= :start', { start });
    }

    if (end) {
      baseQuery.andWhere('c.createdAt <= :end', { end });
    }

    if (failureReason) {
      baseQuery.andWhere('c.failureReason = :failureReason', {
        failureReason,
      });
    }

    // =========================
    // ALWAYS GET TOTAL FAILED
    // =========================

    const totalFailed = await baseQuery.getCount();

    // =========================
    // AGGREGATE MODE
    // =========================

    if (!includeTransactions) {
      const summary = await baseQuery
        .select('c.failureReason', 'reason')
        .addSelect('COUNT(*)', 'count')
        .groupBy('c.failureReason')
        .getRawMany();

      return ApiResponse.success('Failure breakdown retrieved', {
        filters: {
          startDate: startDate ?? null,
          endDate: endDate ?? null,
          failureReason: failureReason ?? null,
        },
        totalFailed,
        summary: summary.map((r) => ({
          reason: r.reason,
          count: Number(r.count),
        })),
      });
    }

    // =========================
    // DRILL-DOWN MODE
    // =========================

    const transactions = await baseQuery
      .leftJoinAndSelect('c.user', 'user')
      .leftJoinAndSelect('c.group', 'group')
      .orderBy('c.createdAt', 'DESC')
      .getMany();

    return ApiResponse.success('Failure transactions retrieved', {
      filters: {
        startDate: startDate ?? null,
        endDate: endDate ?? null,
        failureReason: failureReason ?? null,
      },
      totalFailed,
      transactions: transactions.map((t) => ({
        id: t.id,
        reference: t.paymentReference,
        userEmail: t.user.email,
        groupId: t.group.id,
        amount: t.amount,
        failureReason: t.failureReason,
        createdAt: t.createdAt,
      })),
    });
  }
}
