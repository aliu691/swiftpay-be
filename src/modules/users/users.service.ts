import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  findByEmail(email: string) {
    return this.userRepo.findOne({ where: { email } });
  }

  createUser(name: string, email: string, passwordHash: string) {
    const user = this.userRepo.create({
      name,
      email,
      passwordHash,
    });
    return this.userRepo.save(user);
  }

  setResetToken(email: string, token: string, expiry: Date) {
    return this.userRepo.update(
      { email },
      { resetToken: token, resetTokenExpiry: expiry },
    );
  }

  findByResetToken(token: string) {
    return this.userRepo.findOne({
      where: {
        resetToken: token,
      },
    });
  }

  updatePassword(userId: string, passwordHash: string) {
    return this.userRepo.update(
      { id: userId },
      {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    );
  }
}
