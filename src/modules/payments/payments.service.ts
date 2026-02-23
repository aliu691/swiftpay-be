import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { Group } from '../groups/group.entity';
import * as crypto from 'crypto';
import { Contribution, PaymentStatus } from '../groups/contribution.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Contribution)
    private contributionRepo: Repository<Contribution>,

    @InjectRepository(Group)
    private groupRepo: Repository<Group>,

    private dataSource: DataSource,
  ) {}

  async handleWebhook(signature: string, rawBody: Buffer) {
    console.log('================ WEBHOOK RECEIVED ================');

    const secret = process.env.PAYSTACK_SECRET_KEY!;
    console.log('Using Secret:', secret ? 'Loaded' : 'Missing');

    const hash = crypto
      .createHmac('sha512', secret)
      .update(rawBody)
      .digest('hex');

    console.log('Computed Hash:', hash);

    if (hash !== signature) {
      console.log('❌ Signature mismatch');
      throw new BadRequestException('Invalid signature');
    }

    console.log('✅ Signature verified');

    const event = JSON.parse(rawBody.toString());
    console.log('Event Type:', event.event);
    console.log('Reference:', event?.data?.reference);

    if (event.event !== 'charge.success') {
      console.log('Ignoring event:', event.event);
      return;
    }

    const reference = event.data.reference;

    const contribution = await this.contributionRepo.findOne({
      where: { paymentReference: reference },
      relations: ['group'],
    });

    if (!contribution) {
      console.log('❌ Contribution not found for reference:', reference);
      return;
    }

    console.log('Contribution found:', contribution.id);

    if (contribution.status === PaymentStatus.SUCCESS) {
      console.log('⚠️ Already processed (idempotent)');
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      contribution.status = PaymentStatus.SUCCESS;
      await manager.save(contribution);

      contribution.group.totalContributed += contribution.amount;
      await manager.save(contribution.group);
    });

    console.log('🎉 Payment processed successfully');
  }
}
