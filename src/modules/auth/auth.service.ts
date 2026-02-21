import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ApiResponse } from 'src/utils/api-response';
import * as crypto from 'crypto';
import { addMinutes } from 'date-fns';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(name: string, email: string, password: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new BadRequestException('Email already exists');
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await this.usersService.createUser(name, email, hash);

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    return ApiResponse.success('Registration successful', {
      accessToken: token,
    });
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    return ApiResponse.success('Login successful', {
      accessToken: token,
    });
  }

  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return ApiResponse.success('If email exists, reset link sent');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = addMinutes(new Date(), 15);

    await this.usersService.setResetToken(email, token, expiry);

    await this.mailService.sendResetEmail(email, token);

    return ApiResponse.success('Reset link sent');
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findByResetToken(token);

    if (!user) {
      throw new BadRequestException('Invalid or expired token');
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await this.usersService.updatePassword(user.id, hash);

    return ApiResponse.success('Password reset successful');
  }
}
