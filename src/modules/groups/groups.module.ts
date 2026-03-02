import { Module } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { Group } from './group.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupMember } from './group-member.entity';
import { MailModule } from '../mail/mail.module';
import { GroupInvite } from './group-invite.entity';
import { Contribution } from './contribution.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    MailModule,
    LedgerModule,
    AdminModule,
    TypeOrmModule.forFeature([Group, GroupMember, GroupInvite, Contribution]),
  ],
  providers: [GroupsService],
  controllers: [GroupsController],
})
export class GroupsModule {}
