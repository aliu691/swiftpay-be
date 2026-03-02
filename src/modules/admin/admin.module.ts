import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Group } from '../groups/group.entity';
import { User } from '../users/user.entity';
import { Contribution } from '../groups/contribution.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Contribution, Group, User])],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
