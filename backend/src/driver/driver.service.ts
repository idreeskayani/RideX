import { BadRequestException, Injectable, ConflictException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { DriverStatus } from "@prisma/client";
import { RideStatus } from "@prisma/client";
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class DriverService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) { }

  async register(userId: string, dto: CreateDriverDto) {
    // console.log('Received userId:', userId);
    const existing = await this.prisma.driver.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new BadRequestException('Driver profile already exists');
    }

    let driver;
    try {
      driver = await this.prisma.driver.create({
        data: { userId, ...dto },
      });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        const field = (e.meta?.target as string[])?.[0] ?? 'field';
        throw new ConflictException(`A driver with this ${field} already exists`);
      }
      throw e;
    }

    const admin = await this.prisma.user.findFirst({
  where: {
    role: 'ADMIN',
  },
});

if (admin) {
  await this.notificationService.createNotification(
    admin.id,
    'New Driver Registration',
    `${driver.userId} has applied as a driver.`,
  );
}

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

  async getEarnings(userId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: {
        userId,
      },
    });

    if (!driver) {
      throw new BadRequestException(
        'Driver profile not found',
      );
    }

    const completedRides = await this.prisma.ride.findMany({
      where: {
        driverId: driver.id,
        status: RideStatus.COMPLETED,
      },
    });

   const totalEarnings = completedRides.reduce(
  (sum, ride) => sum + (ride.fare ?? 0),
  0,
);

    const today = new Date();

    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1,
    );

    const todayRides = await this.prisma.ride.findMany({
      where: {
        driverId: driver.id,
        status: RideStatus.COMPLETED,
        updatedAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    const todayEarnings = todayRides.reduce(
  (sum, ride) => sum + (ride.fare ?? 0),
  0,
);

    return {
      totalEarnings,
      todayEarnings,
      completedRides: completedRides.length,
      todayCompletedRides: todayRides.length,
    };
  }

  async getEarningHistory(userId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: {
        userId,
      },
    });

    if (!driver) {
      throw new BadRequestException(
        'Driver profile not found',
      );
    }

    const rides = await this.prisma.ride.findMany({
      where: {
        driverId: driver.id,
        status: RideStatus.COMPLETED,
      },
      select: {
        id: true,
        pickup: true,
        destination: true,
        fare: true,
        updatedAt: true,
        rider: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return rides;
  }

 async updateLocation(
  userId: string,
  dto: UpdateLocationDto,
) {
  const driver = await this.prisma.driver.findUnique({
    where: {
      userId,
    },
  });

  if (!driver) {
    throw new BadRequestException(
      'Driver profile not found',
    );
  }

  if (!driver.isOnline) {
    throw new BadRequestException(
      'Driver is offline',
    );
  }

  return this.prisma.driver.update({
    where: {
      userId,
    },
    data: ({
      latitude: dto.latitude,
      longitude: dto.longitude,
    } as any),
  });
}

async getCurrentRide(userId: string) {
  const driver = await this.prisma.driver.findUnique({
    where: {
      userId,
    },
  });

  if (!driver) {
    throw new BadRequestException(
      'Driver profile not found',
    );
  }

  return this.prisma.ride.findFirst({
    where: {
      driverId: driver.id,
      status: {
        in: [
          RideStatus.ACCEPTED,
          RideStatus.STARTED,
        ],
      },
    },
    include: {
      rider: {
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          profileImage: true,
        },
      },
    },
  });
}
}
