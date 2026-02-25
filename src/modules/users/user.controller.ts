import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly usersService: UsersService) {}

  @Get('dashboard')
  getDashboard(
    @Req() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.usersService.getUserDashboard(req.user, startDate, endDate);
  }

  @Get('groups')
  getUserGroups(@Req() req, @Query('status') status?: string) {
    return this.usersService.getUserGroups(req.user, status);
  }
}
