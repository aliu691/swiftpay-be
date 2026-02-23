import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group, GroupStatus } from './group.entity';
import { GroupMember } from './group-member.entity';
import { User } from '../users/user.entity';
import * as crypto from 'crypto';
import { EmailService } from '../mail/mail.service';
import { groupInvitationTemplate } from '../mail/templates/group-invite.template';
import { ApiResponse } from 'src/utils/api-response';
import { GroupInvite, InviteStatus } from './group-invite.entity';
import {
  Contribution,
  PaymentMethod,
  PaymentStatus,
} from './contribution.entity';
import axios from 'axios';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private groupRepo: Repository<Group>,

    @InjectRepository(GroupInvite)
    private inviteRepo: Repository<GroupInvite>,

    @InjectRepository(Contribution)
    private contributionRepo: Repository<Contribution>,

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

  async getGroupContributions(groupId: string, user: User) {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['members', 'members.user'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const isMember = group.members.some((member) => member.user.id === user.id);

    if (!isMember) {
      throw new ForbiddenException('You are not a member of this group');
    }

    const contributions = await this.contributionRepo.find({
      where: { group: { id: groupId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return ApiResponse.success('Contributions retrieved', {
      totalContributed: group.totalContributed,
      contributions: contributions.map((c) => ({
        id: c.id,
        amount: c.amount,
        status: c.status,
        paymentMethod: c.paymentMethod,
        user: {
          id: c.user.id,
          name: c.user.name,
          email: c.user.email,
        },
        createdAt: c.createdAt,
      })),
    });
  }

  async initiateContribution(groupId: string, amount: number, user: User) {
    if (amount <= 0) {
      throw new BadRequestException('Invalid amount');
    }

    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['members', 'members.user'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const isMember = group.members.some((member) => member.user.id === user.id);

    if (!isMember) {
      throw new ForbiddenException('You are not a member');
    }

    const reference = `swiftpay_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const contribution = this.contributionRepo.create({
      amount,
      paymentMethod: PaymentMethod.CARD,
      status: PaymentStatus.INITIATED,
      paymentReference: reference,
      user,
      group,
    });

    await this.contributionRepo.save(contribution);

    // Call Paystack
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: user.email,
        amount: amount * 100, // convert to kobo
        reference,
        callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return ApiResponse.success('Payment initialized', {
      authorizationUrl: response.data.data.authorization_url,
      reference,
    });
  }

  async payoutGroup(groupId: string, user: User) {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['createdBy'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (group.createdBy.id !== user.id) {
      throw new ForbiddenException('Only creator can payout');
    }

    if (group.status !== GroupStatus.COMPLETED) {
      throw new BadRequestException('Group not ready for payout');
    }

    group.status = GroupStatus.DISBURSED;
    group.disbursedAt = new Date();

    await this.groupRepo.save(group);

    await this.emailService.sendEmail({
      to: group.createdBy.email,
      subject: `Payout processed for ${group.name}`,
      html: `
        <h2>💰 Payout Successful</h2>
        <p>Amount: ₦${group.totalContributed}</p>
        <p>Status: Disbursed</p>
      `,
    });

    return ApiResponse.success('Payout simulated successfully', {
      amount: group.totalContributed,
      status: group.status,
    });
  }

  async groupSummary(groupId: string) {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['members'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return ApiResponse.success('Group summary retrieved', {
      status: group.status,
      totalContributed: group.totalContributed,
      targetAmount: group.targetAmount,
      remaining: group.targetAmount - group.totalContributed,
      membersCount: group.members.length,
      completedAt: group.completedAt,
      disbursedAt: group.disbursedAt,
    });
  }
}
