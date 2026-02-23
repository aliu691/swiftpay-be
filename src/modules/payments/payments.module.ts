import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Group } from '../groups/group.entity';
import { Contribution } from '../groups/contribution.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Contribution, Group])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
