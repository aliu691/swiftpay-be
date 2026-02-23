import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './group.entity';
import { GroupMember } from './group-member.entity';
import { User } from '../users/user.entity';
import * as crypto from 'crypto';
import { EmailService } from '../mail/mail.service';
import { groupInvitationTemplate } from '../mail/templates/group-invite.template';
import { ApiResponse } from 'src/utils/api-response';
import { GroupInvite, InviteStatus } from './group-invite.entity';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private groupRepo: Repository<Group>,

    @InjectRepository(GroupInvite)
    private inviteRepo: Repository<GroupInvite>,

    @InjectRepository(GroupMember)
    private memberRepo: Repository<GroupMember>,
    private emailService: EmailService,
  ) {}

  async createGroup(
    name: string,
    targetAmount: number,
    invitedEmails: string[],
    creator: User,
  ) {
    if (!invitedEmails || invitedEmails.length === 0) {
      throw new BadRequestException('At least one email must be invited');
    }

    const uniqueEmails = [...new Set(invitedEmails)];

    const group = this.groupRepo.create({
      name,
      targetAmount,
      createdBy: creator,
    });

    await this.groupRepo.save(group);

    // Add creator as member
    await this.memberRepo.save(
      this.memberRepo.create({
        user: creator,
        group,
      }),
    );

    for (const email of uniqueEmails) {
      const token = crypto.randomBytes(20).toString('hex');

      const invite = this.inviteRepo.create({
        email,
        token,
        group,
      });

      await this.inviteRepo.save(invite);

      const inviteLink = `${process.env.FRONTEND_URL}/join/${token}`;

      await this.emailService.sendEmail({
        to: email,
        subject: `You're invited to join ${group.name}`,
        html: groupInvitationTemplate({
          inviterName: creator.name,
          groupName: group.name,
          inviteLink,
        }),
      });
    }

    return ApiResponse.success('Group created successfully', {
      groupId: group.id,
      invitedCount: uniqueEmails.length,
    });
  }

  async joinGroup(token: string, user: User) {
    const invite = await this.inviteRepo.findOne({
      where: { token },
      relations: ['group'],
    });

    if (!invite) {
      throw new BadRequestException('Invalid invite');
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException('Invite already used or expired');
    }

    if (invite.email !== user.email) {
      throw new ForbiddenException('This invite was not sent to your email');
    }

    // Add membership
    await this.memberRepo.save(
      this.memberRepo.create({
        user,
        group: invite.group,
      }),
    );

    invite.status = InviteStatus.ACCEPTED;
    await this.inviteRepo.save(invite);

    return ApiResponse.success('Successfully joined group', {
      groupId: invite.group.id,
    });
  }

  async getGroupDetails(groupId: string, user: User) {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['createdBy', 'members', 'members.user', 'invites'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Ensure user is a member
    const isMember = group.members.some((member) => member.user.id === user.id);

    if (!isMember) {
      throw new ForbiddenException('You are not a member of this group');
    }

    return ApiResponse.success('Group details retrieved', {
      id: group.id,
      name: group.name,
      targetAmount: group.targetAmount,
      createdBy: {
        id: group.createdBy.id,
        name: group.createdBy.name,
        email: group.createdBy.email,
      },
      members: group.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
      })),
      invites: group.invites.map((invite) => ({
        email: invite.email,
        status: invite.status,
        createdAt: invite.createdAt,
      })),
    });
  }
}
