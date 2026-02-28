import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { Group, GroupStatus } from '../groups/group.entity';
import * as crypto from 'crypto';
import { Contribution, PaymentStatus } from '../groups/contribution.entity';
import { groupCompletedTemplate } from '../mail/templates/group-complete.template';
import { EmailService } from '../mail/mail.service';
import { LedgerService } from '../ledger/ledger.service';
import axios from 'axios';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Contribution)
    private contributionRepo: Repository<Contribution>,

    private dataSource: DataSource,
    private emailService: EmailService,
    private ledgerService: LedgerService,
  ) {}

  async handleWebhook(signature: string, rawBody: Buffer) {
    console.log('================ WEBHOOK START ================');

    const secret = process.env.PAYSTACK_SECRET_KEY!;

    const hash = crypto
      .createHmac('sha512', secret)
      .update(rawBody)
      .digest('hex');

    if (hash !== signature) {
      throw new BadRequestException('Invalid signature');
    }

    const event = JSON.parse(rawBody.toString());
    const eventId = event.id;
    const reference = event?.data?.reference;

    if (!reference) {
      console.log('================ WEBHOOK END ================');
      return;
    }

    const contribution = await this.contributionRepo.findOne({
      where: { paymentReference: reference },
      relations: ['group', 'group.createdBy'],
    });

    if (!contribution || contribution.processedAt) {
      console.log('================ WEBHOOK END ================');
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      if (event.event === 'charge.success') {
        contribution.status = PaymentStatus.SUCCESS;

        // ✅ Per-group ledger account
        await this.ledgerService.createDoubleEntry(
          reference,
          'Group contribution',
          'PLATFORM_CASH',
          `GROUP_POOL_${contribution.group.id}`,
          contribution.amount,
        );

        // ✅ Compute actual balance from ledger
        const balance = await this.ledgerService.getGroupBalance(
          contribution.group.id,
        );

        if (
          balance >= contribution.group.targetAmount &&
          contribution.group.status !== GroupStatus.COMPLETED
        ) {
          contribution.group.status = GroupStatus.COMPLETED;
          contribution.group.completedAt = new Date();

          await manager.save(contribution.group);

          if (contribution.group.createdBy?.email) {
            await this.emailService.sendEmail({
              to: contribution.group.createdBy.email,
              subject: `Group ${contribution.group.name} completed 🎉`,
              html: groupCompletedTemplate({
                groupName: contribution.group.name,
                amount: balance,
              }),
            });
          }
        }
      }

      if (event.event === 'charge.failed') {
        contribution.status = PaymentStatus.FAILED;
      }

      contribution.processedAt = new Date();
      contribution.webhookEventId = eventId;
      contribution.webhookPayload = event;

      await manager.save(contribution);
    });

    console.log('================ WEBHOOK END ================');
  }

  async verifyPayment(reference: string) {
    const contribution = await this.contributionRepo.findOne({
      where: { paymentReference: reference },
      relations: ['group'],
    });

    if (!contribution) {
      throw new NotFoundException('Payment not found');
    }

    // If already success, return immediately
    if (contribution.status === PaymentStatus.SUCCESS) {
      return {
        groupId: contribution.group.id,
        status: 'success',
      };
    }

    // 🔥 Verify directly with Paystack
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    const paystackData = response.data.data;

    if (paystackData.status === 'success') {
      contribution.status = PaymentStatus.SUCCESS;
      await this.contributionRepo.save(contribution);

      return {
        groupId: contribution.group.id,
        status: 'success',
      };
    }

    return {
      groupId: contribution.group.id,
      status: 'failed',
    };
  }
}
