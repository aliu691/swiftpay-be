import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Get,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GroupsService } from './groups.service';

@Controller('groups')
export class GroupsController {
  constructor(private groupsService: GroupsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createGroup(
    @Body()
    body: {
      name: string;
      targetAmount: number;
      invitedEmails: string[];
    },
    @Req() req,
  ) {
    return this.groupsService.createGroup(
      body.name,
      body.targetAmount,
      body.invitedEmails,
      req.user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('join/:token')
  joinGroup(@Param('token') token: string, @Req() req) {
    return this.groupsService.joinGroup(token, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getGroup(@Param('id') id: string, @Req() req) {
    return this.groupsService.getGroupDetails(id, req.user);
  }
}
