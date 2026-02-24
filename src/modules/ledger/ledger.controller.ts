// src/modules/ledger/ledger.controller.ts

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@Controller('admin/ledger')
@UseGuards(JwtAuthGuard, AdminGuard)
export class LedgerController {
  constructor(private ledgerService: LedgerService) {}

  @Get('summary')
  getSummary() {
    return this.ledgerService.getLedgerSummary();
  }

  @Get('entries')
  getEntries(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('reference') reference?: string,
    @Query('accountCode') accountCode?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ledgerService.getAllEntries(
      Number(page),
      Number(limit),
      reference,
      accountCode,
      startDate,
      endDate,
    );
  }

  @Get('reconcile')
  reconcile(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ledgerService.reconcile(startDate, endDate);
  }

  @Get('dashboard')
  dashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ledgerService.getAdminDashboard(startDate, endDate);
  }
}
