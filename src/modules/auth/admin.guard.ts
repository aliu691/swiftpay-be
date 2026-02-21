import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const adminEmail = this.config.get<string>('ADMIN_EMAIL');

    if (!user || user.email !== adminEmail) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
