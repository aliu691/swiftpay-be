import { Controller, Get, Query, Post, Body, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FailureReason, PaymentStatus } from '../groups/contribution.entity';
import { AdminService } from './admin.service';
import { ForceFailureDto } from './failureReason.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /* ===========================
       PAYMENT EXPLORER
    =========================== */

  @Get('payments')
  async getPayments(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: PaymentStatus,
  ) {
    return this.adminService.getPayments(
      Number(page),
      Number(limit),
      startDate,
      endDate,
      status,
    );
  }

  /* ===========================
       PAYMENT HEALTH
    =========================== */

  @Get('payments/health')
  async getPaymentHealth(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getPaymentHealth(startDate, endDate);
  }

  /* ===========================
       PAYMENT TRENDS
    =========================== */

  @Get('payments/trends')
  async getPaymentTrends(@Query('days') days = 7) {
    return this.adminService.getPaymentTrends(Number(days));
  }

  /* ===========================
       SIMULATE PSP DEGRADATION
    =========================== */

  @Post('simulate/psp-degradation')
  async simulatePspDegradation(@Body('failureRate') failureRate: number) {
    return this.adminService.setSimulationFailureRate(failureRate);
  }

  /* ===========================
       FAILURE BREAKDOWN
    =========================== */

  @Get('payments/failures')
  async getFailureBreakdown(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('failureReason') failureReason?: string,
    @Query('includeTransactions') includeTransactions?: string,
  ) {
    return this.adminService.getFailureBreakdown(
      startDate,
      endDate,
      failureReason,
      includeTransactions === 'true',
    );
  }

  @Post('simulate/force-failure')
  async forceFailure(@Body() dto: ForceFailureDto) {
    return this.adminService.forceNextFailure(dto.reason);
  }
}
