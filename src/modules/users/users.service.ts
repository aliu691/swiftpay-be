import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async createUser(name: string, email: string, passwordHash: string) {
    return this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });
  }
}
