// src/modules/ledger/ledger.controller.ts

import { Controller, Get, UseGuards } from '@nestjs/common';
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
  getEntries() {
    return this.ledgerService.getAllEntries();
  }
}
