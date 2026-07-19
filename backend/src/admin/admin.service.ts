import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DriverStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getPendingDrivers() {
    return this.prisma.driver.findMany({
      where: {
        status: DriverStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  async approveDriver(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: {
        id: driverId,
      },
    });

    if (!driver) {
      throw new BadRequestException('Driver not found');
    }

    if (driver.status === DriverStatus.APPROVED) {
      throw new BadRequestException('Driver already approved');
    }

    return this.prisma.driver.update({
      where: {
        id: driverId,
      },
      data: {
        status: DriverStatus.APPROVED,
      },
    });
  }
}