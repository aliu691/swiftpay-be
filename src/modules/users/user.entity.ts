import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

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

  @Column({ type: 'timestamp', nullable: true })
  resetTokenExpiry?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
