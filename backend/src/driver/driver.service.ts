import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import {DriverStatus} from "@prisma/client";
@Injectable()
export class DriverService {
  constructor(private prisma: PrismaService) { }

  async register(userId: string, dto: CreateDriverDto) {
    // console.log('Received userId:', userId);
    const existing = await this.prisma.driver.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new BadRequestException('Driver profile already exists');
    }

    const driver = await this.prisma.driver.create({
      data: { userId, ...dto },
    });

    return { message: 'Driver registered successfully', driver };
  }


  async getProfile(userId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: {
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!driver) {
      throw new BadRequestException('Driver profile not found');
    }

    return driver;
  }

  async goOnline(userId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: {
        userId,
      },
    });

    if (!driver) {
      throw new BadRequestException('Driver profile not found');
    }

    if (driver.status !== 'APPROVED') {
      throw new BadRequestException(
        'Driver is not approved yet',
      );
    }

    return this.prisma.driver.update({
      where: {
        userId,
      },
      data: {
        isOnline: true,
      },
    });
  }

  async goOffline(userId: string) {
    const driver = await this.prisma.driver.update({
      where: {
        userId,
      },
      data: {
        isOnline: false,
      },
    });

    return driver;
  }

  async updateProfile(
    userId: string,
    dto: UpdateDriverDto,
  ) {
    return this.prisma.driver.update({
      where: {
        userId,
      },
      data: dto,
    });
  }
}
