import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DriverStatus, RideStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) { }

  // ===========================
  // Get All Pending Drivers
  // ===========================
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
            phoneNumber: true,
            profileImage: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // ===========================
  // Approve Driver
  // ===========================
  async approveDriver(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: {
        id: driverId,
      },
    });

    if (!driver) {
      throw new NotFoundException(
        'Driver not found',
      );
    }

    if (driver.status === DriverStatus.APPROVED) {
      throw new BadRequestException(
        'Driver is already approved',
      );
    }

    await this.prisma.user.update({
      where: {
        id: driver.userId,
      },
      data: {
        role: 'DRIVER',
      },
    });

    return this.prisma.driver.update({
      where: {
        id: driverId,
      },
      data: {
        status: DriverStatus.APPROVED,
      },
      include: {
        user: true,
      },
    });
  }

  // ===========================
  // Reject Driver
  // ===========================
  async rejectDriver(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: {
        id: driverId,
      },
    });

    if (!driver) {
      throw new NotFoundException(
        'Driver not found',
      );
    }

    if (driver.status === DriverStatus.REJECTED) {
      throw new BadRequestException(
        'Driver already rejected',
      );
    }

    await this.prisma.user.update({
      where: {
        id: driver.userId,
      },
      data: {
        role: 'RIDER',
      },
    });

    return this.prisma.driver.update({
      where: {
        id: driverId,
      },
      data: {
        status: DriverStatus.REJECTED,
      },
      include: {
        user: true,
      },
    });
  }

  // ===========================
  // Dashboard
  // ===========================
  async dashboard() {
    const totalUsers = await this.prisma.user.count();

    const totalDrivers = await this.prisma.driver.count();

    const approvedDrivers =
      await this.prisma.driver.count({
        where: {
          status: DriverStatus.APPROVED,
        },
      });

    const pendingDrivers =
      await this.prisma.driver.count({
        where: {
          status: DriverStatus.PENDING,
        },
      });

    const rejectedDrivers =
      await this.prisma.driver.count({
        where: {
          status: DriverStatus.REJECTED,
        },
      });

    const onlineDrivers =
      await this.prisma.driver.count({
        where: {
          status: DriverStatus.APPROVED,
          isOnline: true,
        },
      });

    const offlineDrivers =
      await this.prisma.driver.count({
        where: {
          status: DriverStatus.APPROVED,
          isOnline: false,
        },
      });

    const totalRides =
      await this.prisma.ride.count();

    const pendingRides =
      await this.prisma.ride.count({
        where: {
          status: RideStatus.PENDING,
        },
      });

    const acceptedRides =
      await this.prisma.ride.count({
        where: {
          status: RideStatus.ACCEPTED,
        },
      });

    const startedRides =
      await this.prisma.ride.count({
        where: {
          status: RideStatus.STARTED,
        },
      });

    const completedRides =
      await this.prisma.ride.count({
        where: {
          status: RideStatus.COMPLETED,
        },
      });

    const cancelledRides = await this.prisma.ride.count({
      where: {
        status: {
          in: [
            RideStatus.CANCELLED_BY_RIDER,
            RideStatus.CANCELLED_BY_DRIVER,
          ],
        },
      },
    });

    const revenue =
      await this.prisma.ride.aggregate({
        where: {
          status: RideStatus.COMPLETED,
        },
        _sum: {
          fare: true,
        },
      });

    const averageFare =
      await this.prisma.ride.aggregate({
        where: {
          status: RideStatus.COMPLETED,
        },
        _avg: {
          fare: true,
        },
      });

    return {
      users: {
        totalUsers,
      },

      drivers: {
        totalDrivers,
        approvedDrivers,
        pendingDrivers,
        rejectedDrivers,
        onlineDrivers,
        offlineDrivers,
      },

      rides: {
        totalRides,
        pendingRides,
        acceptedRides,
        startedRides,
        completedRides,
        cancelledRides,
      },

      earnings: {
        totalRevenue:
          revenue._sum.fare ?? 0,
        averageFare:
          averageFare._avg.fare ?? 0,
      },
    };
  }

  async getAllDrivers() {
  return this.prisma.driver.findMany({
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phoneNumber: true,
          role: true,
          isBlocked: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}
async getAllUsers() {
  return this.prisma.user.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
      role: true,
      isVerified: true,
      isBlocked: true,
      createdAt: true,

      driver: {
        select: {
          id: true,
          status: true,
          isOnline: true,
        },
      },
    },

    orderBy: {
      createdAt: 'desc',
    },
  });
}

async blockUser(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new NotFoundException(
      'User not found',
    );
  }

  if (user.isBlocked) {
    throw new BadRequestException(
      'User already blocked',
    );
  }

  return this.prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      isBlocked: true,
    },
  });
}

async unblockUser(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new NotFoundException(
      'User not found',
    );
  }

  if (!user.isBlocked) {
    throw new BadRequestException(
      'User is already active',
    );
  }

  return this.prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      isBlocked: false,
    },
  });
}

async deleteUser(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new NotFoundException(
      'User not found',
    );
  }

  await this.prisma.user.delete({
    where: {
      id: userId,
    },
  });

  return {
    message: 'User deleted successfully',
  };
}
async getAllRides() {
  return this.prisma.ride.findMany({
    include: {
      rider: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      driver: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      },
      rating: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}
async getRideById(id: string) {
  const ride = await this.prisma.ride.findUnique({
    where: { id },
    include: {
      rider: true,
      driver: {
        include: {
          user: true,
        },
      },
      rating: true,
    },
  });

  if (!ride) {
    throw new NotFoundException('Ride not found');
  }

  return ride;
}

async cancelRide(id: string) {
  const ride = await this.prisma.ride.findUnique({
    where: { id },
  });

  if (!ride) {
    throw new NotFoundException('Ride not found');
  }

  if (
    ride.status === RideStatus.COMPLETED ||
    ride.status === RideStatus.CANCELLED_BY_DRIVER ||
    ride.status === RideStatus.CANCELLED_BY_RIDER
  ) {
    throw new BadRequestException(
      'Ride cannot be cancelled',
    );
  }

  return this.prisma.ride.update({
    where: { id },
    data: {
      status: RideStatus.CANCELLED_BY_DRIVER,
    },
  });
}

async getRidesByStatus(status: RideStatus) {
  return this.prisma.ride.findMany({
    where: { status },
    include: {
      rider: true,
      driver: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

}