import { Module } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { Group } from './group.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupMember } from './group-member.entity';
import { MailModule } from '../mail/mail.module';
import { GroupInvite } from './group-invite.entity';

@Module({
  imports: [
    MailModule,
    TypeOrmModule.forFeature([Group, GroupMember, GroupInvite]),
  ],
  providers: [GroupsService],
  controllers: [GroupsController],
})
export class GroupsModule {}
