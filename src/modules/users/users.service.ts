import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiResponse } from 'src/utils/api-response';
import { Repository, MoreThan } from 'typeorm';
import { Contribution, PaymentStatus } from '../groups/contribution.entity';
import { GroupMember } from '../groups/group-member.entity';
import { Group, GroupStatus } from '../groups/group.entity';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(Contribution)
    private contributionRepo: Repository<Contribution>,

    @InjectRepository(GroupMember)
    private memberRepo: Repository<GroupMember>,

    @InjectRepository(Group)
    private groupRepo: Repository<Group>,
  ) {}

  async findByEmail(email: string) {
    return this.userRepo.findOne({ where: { email } });
  }

  async findById(id: string) {
    return this.userRepo.findOne({ where: { id } });
  }

  async createUser(name: string, email: string, passwordHash: string) {
    const user = this.userRepo.create({
      name,
      email,
      passwordHash,
    });

    return this.userRepo.save(user);
  }

  async setResetToken(email: string, token: string, expiry: Date) {
    return this.userRepo.update(
      { email },
      { resetToken: token, resetTokenExpiry: expiry },
    );
  }

  async findByResetToken(token: string) {
    return this.userRepo.findOne({
      where: {
        resetToken: token,
        resetTokenExpiry: MoreThan(new Date()),
      },
    });
  }

  async updatePassword(userId: string, passwordHash: string) {
    return this.userRepo.update(
      { id: userId },
      {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    );
  }

  async getUserDashboard(user: User, startDate?: string, endDate?: string) {
    const query = this.contributionRepo
      .createQueryBuilder('c')
      .where('c.userId = :userId', { userId: user.id });

    if (startDate) {
      query.andWhere('c.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      query.andWhere('c.createdAt <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    const contributions = await query.getMany();

    const successful = contributions.filter(
      (c) => c.status === PaymentStatus.SUCCESS,
    );

    const failed = contributions.filter(
      (c) => c.status === PaymentStatus.FAILED,
    );

    const totalDonated = successful.reduce((sum, c) => sum + c.amount, 0);

    // Groups joined
    const memberships = await this.memberRepo.find({
      where: { user: { id: user.id } },
      relations: ['group', 'group.createdBy'],
    });

    const groups = memberships.map((m) => m.group);

    const activeGroups = groups.filter(
      (g) => g.status === GroupStatus.ACTIVE,
    ).length;

    const completedGroups = groups.filter(
      (g) => g.status === GroupStatus.COMPLETED,
    ).length;

    const disbursedGroups = groups.filter(
      (g) => g.status === GroupStatus.DISBURSED,
    ).length;

    const groupsCreated = groups.filter(
      (g) => g.createdBy?.id === user.id,
    ).length;

    return ApiResponse.success('User dashboard retrieved', {
      totalDonated,
      successfulContributions: successful.length,
      failedContributions: failed.length,
      totalGroupsJoined: groups.length,
      activeGroups,
      completedGroups,
      disbursedGroups,
      groupsCreated,
    });
  }

  async getUserGroups(user: User, status?: string) {
    const memberships = await this.memberRepo.find({
      where: { user: { id: user.id } },
      relations: ['group', 'group.createdBy'],
    });

    let groups = memberships.map((m) => m.group);

    if (status) {
      groups = groups.filter((g) => g.status === status.toLocaleLowerCase());
    }

    return ApiResponse.success('User groups retrieved', {
      total: groups.length,
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        targetAmount: g.targetAmount,
        status: g.status,
        createdBy: {
          id: g.createdBy?.id,
          name: g.createdBy?.name,
        },
        completedAt: g.completedAt,
        disbursedAt: g.disbursedAt,
      })),
    });
  }
}
