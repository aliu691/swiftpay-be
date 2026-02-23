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

  @UseGuards(JwtAuthGuard)
  @Get(':id/contributions')
  getContributions(@Param('id') id: string, @Req() req) {
    return this.groupsService.getGroupContributions(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/contribute')
  contribute(
    @Param('id') id: string,
    @Body() body: { amount: number },
    @Req() req,
  ) {
    return this.groupsService.initiateContribution(id, body.amount, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/payout')
  payout(@Param('id') id: string, @Req() req) {
    return this.groupsService.payoutGroup(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/summary')
  summary(@Param('id') id: string) {
    return this.groupsService.groupSummary(id);
  }
}
