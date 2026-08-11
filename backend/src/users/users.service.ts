import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async switchRole(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { driver: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === 'RIDER') {
      if (!user.driver || user.driver.status !== 'APPROVED') {
        throw new BadRequestException('Driver profile not approved');
      }
      await this.prisma.user.update({ where: { id: userId }, data: { role: 'DRIVER' } });
      return { role: 'DRIVER' };
    } else if (user.role === 'DRIVER') {
      await this.prisma.user.update({ where: { id: userId }, data: { role: 'RIDER' } });
      return { role: 'RIDER' };
    }
    throw new BadRequestException('Cannot switch role');
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        profileImage: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
