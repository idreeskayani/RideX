import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRideDto } from './dto/create-ride.dto';
import { BadRequestException } from '@nestjs/common';
import { DriverStatus, RideStatus } from '@prisma/client';

@Injectable()
export class RideService {
  constructor(private prisma: PrismaService) {}

  async requestRide(
    userId: string,
    dto: CreateRideDto,
  ) {
    const ride = await this.prisma.ride.create({
      data: {
        riderId: userId,
        pickup: dto.pickup,
        destination: dto.destination,
        fare: dto.fare,
      },
    });

    return {
      message: 'Ride requested successfully',
      ride,
    };
  }
async getAvailableRides(userId: string) {
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

  if (!driver.isOnline) {
  throw new BadRequestException(
    'You are offline. Go online first.'
  );
}

  const rides = await this.prisma.ride.findMany({
    where: {
      status: 'PENDING',
      driverId: null,
    },
    include: {
      rider: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return rides;
}

async acceptRide(rideId: string, userId: string) {
  const driver = await this.prisma.driver.findUnique({
    where: { userId },
  });

  if (!driver) {
    throw new BadRequestException('Driver profile not found');
  }

  if (driver.status !== DriverStatus.APPROVED) {
    throw new BadRequestException('Driver is not approved');
  }

  const ride = await this.prisma.ride.findUnique({
    where: { id: rideId },
  });

  if (!ride) {
    throw new BadRequestException('Ride not found');
  }

  if (ride.status !== RideStatus.PENDING) {
    throw new BadRequestException('Ride already accepted');
  }

  return this.prisma.ride.update({
    where: {
      id: rideId,
    },
    data: {
      driverId: driver.id,
      status: RideStatus.ACCEPTED,
    },
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
    },
  });
}

async startRide(rideId: string, userId: string) {
  const driver = await this.prisma.driver.findUnique({
    where: {
      userId,
    },
  });

  if (!driver) {
    throw new BadRequestException('Driver profile not found');
  }

  const ride = await this.prisma.ride.findUnique({
    where: {
      id: rideId,
    },
  });

  if (!ride) {
    throw new BadRequestException('Ride not found');
  }

  if (ride.driverId !== driver.id) {
    throw new BadRequestException(
      'This ride is not assigned to you',
    );
  }

  if (ride.status !== RideStatus.ACCEPTED) {
    throw new BadRequestException(
      'Ride is not accepted yet',
    );
  }

  return this.prisma.ride.update({
    where: {
      id: rideId,
    },
    data: {
      status: RideStatus.STARTED,
    },
  });
}

async completeRide(
  rideId: string,
  userId: string,
) {
  // Find driver profile
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

  // Find ride
  const ride = await this.prisma.ride.findUnique({
    where: {
      id: rideId,
    },
  });

  if (!ride) {
    throw new BadRequestException(
      'Ride not found',
    );
  }

  // Ensure this ride belongs to the driver
  if (ride.driverId !== driver.id) {
    throw new BadRequestException(
      'This ride is not assigned to you',
    );
  }

  // Ride must be started first
  if (ride.status !== RideStatus.STARTED) {
    throw new BadRequestException(
      'Ride has not started yet',
    );
  }

  // Complete ride
  return this.prisma.ride.update({
    where: {
      id: rideId,
    },
    data: {
      status: RideStatus.COMPLETED,
    },
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
    },
  });
}

async cancelRideByRider(
  rideId: string,
  userId: string,
) {
  const ride = await this.prisma.ride.findUnique({
    where: {
      id: rideId,
    },
  });

  if (!ride) {
    throw new BadRequestException('Ride not found');
  }

  if (ride.riderId !== userId) {
    throw new BadRequestException(
      'You are not the rider of this ride',
    );
  }

  if (ride.status !== RideStatus.PENDING) {
    throw new BadRequestException(
      'Ride cannot be cancelled after a driver accepts it',
    );
  }

  return this.prisma.ride.update({
    where: {
      id: rideId,
    },
    data: {
      status: RideStatus.CANCELLED_BY_RIDER,
    },
  });
}

async cancelRideByDriver(
  rideId: string,
  userId: string,
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

  const ride = await this.prisma.ride.findUnique({
    where: {
      id: rideId,
    },
  });

  if (!ride) {
    throw new BadRequestException(
      'Ride not found',
    );
  }

  if (ride.driverId !== driver.id) {
    throw new BadRequestException(
      'This ride is not assigned to you',
    );
  }

  if (ride.status !== RideStatus.ACCEPTED) {
    throw new BadRequestException(
      'Only accepted rides can be cancelled',
    );
  }

  return this.prisma.ride.update({
    where: {
      id: rideId,
    },
    data: {
      status: RideStatus.CANCELLED_BY_DRIVER,
      driverId: null,
    },
  });
}

async getMyRides(userId: string) {
  return this.prisma.ride.findMany({
    where: {
      riderId: userId,
    },
    include: {
      driver: {
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

async getMyTrips(userId: string) {
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

  return this.prisma.ride.findMany({
    where: {
      driverId: driver.id,
    },
    include: {
      rider: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}
}