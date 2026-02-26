import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ApiResponse } from 'src/utils/api-response';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getProfile(@Req() req: any) {
    const user = req.user;

    return ApiResponse.success('User profile retrieved', {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.email === process.env.ADMIN_EMAIL ? 'admin' : 'user',
    });
  }

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
