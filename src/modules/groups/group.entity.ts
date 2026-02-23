import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { GroupInvite } from './group-invite.entity';
import { GroupMember } from './group-member.entity';

@Entity()
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'int' })
  targetAmount: number;

  @Column({ default: 0 })
  totalContributed: number;

  @Column({ nullable: true })
  deadline: Date;

  @ManyToOne(() => User, (user) => user.groupsCreated)
  createdBy: User;

  @OneToMany(() => GroupInvite, (invite) => invite.group)
  invites: GroupInvite[];

  @OneToMany(() => GroupMember, (member) => member.group)
  members: GroupMember[];

  @CreateDateColumn()
  createdAt: Date;
}
