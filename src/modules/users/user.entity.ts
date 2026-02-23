import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { GroupMember } from '../groups/group-member.entity';
import { Group } from '../groups/group.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ nullable: true })
  resetToken?: string;

  @OneToMany(() => GroupMember, (membership) => membership.user)
  memberships: GroupMember[];

  @OneToMany(() => Group, (group) => group.createdBy)
  groupsCreated: Group[];

  @Column({ type: 'timestamp', nullable: true })
  resetTokenExpiry?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
