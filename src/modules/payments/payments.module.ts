import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Group } from '../groups/group.entity';
import { Contribution } from '../groups/contribution.entity';
import { MailModule } from '../mail/mail.module';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contribution, Group]),
    MailModule,
    LedgerModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
