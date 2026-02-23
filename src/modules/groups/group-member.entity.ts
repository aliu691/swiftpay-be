import { Entity, PrimaryGeneratedColumn, ManyToOne, Unique } from 'typeorm';
import { User } from '../users/user.entity';
import { Group } from './group.entity';

@Entity()
@Unique(['user', 'group'])
export class GroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.memberships, {
    onDelete: 'CASCADE',
  })
  user: User;

  @ManyToOne(() => Group, (group) => group.members, {
    onDelete: 'CASCADE',
  })
  group: Group;
}
