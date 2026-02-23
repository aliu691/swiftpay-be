import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { Group, GroupStatus } from '../groups/group.entity';
import * as crypto from 'crypto';
import { Contribution, PaymentStatus } from '../groups/contribution.entity';
import { groupCompletedTemplate } from '../mail/templates/group-complete.template';
import { EmailService } from '../mail/mail.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Contribution)
    private contributionRepo: Repository<Contribution>,

    @InjectRepository(Group)
    private groupRepo: Repository<Group>,

    private dataSource: DataSource,
    private emailService: EmailService,
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
      relations: ['group', 'group.createdBy'], // ✅ FIXED
    });

    if (!contribution) {
      console.log('================ WEBHOOK END ================');
      return;
    }

    // 🛡️ Strong idempotency:
    if (contribution.processedAt) {
      console.log('Already processed (idempotent)');
      console.log('================ WEBHOOK END ================');
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      if (event.event === 'charge.success') {
        contribution.status = PaymentStatus.SUCCESS;

        // Prevent double increment (extra protection)
        if (!contribution.group) return;

        contribution.group.totalContributed += contribution.amount;

        // Check completion
        if (
          contribution.group.totalContributed >=
            contribution.group.targetAmount &&
          contribution.group.status !== GroupStatus.COMPLETED
        ) {
          contribution.group.status = GroupStatus.COMPLETED;
          contribution.group.completedAt = new Date();

          await manager.save(contribution.group);

          // Send email AFTER save
          if (contribution.group.createdBy?.email) {
            await this.emailService.sendEmail({
              to: contribution.group.createdBy.email,
              subject: `Group ${contribution.group.name} completed 🎉`,
              html: groupCompletedTemplate({
                groupName: contribution.group.name,
                amount: contribution.group.totalContributed,
              }),
            });
          }
        }

        await manager.save(contribution.group);
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
}
