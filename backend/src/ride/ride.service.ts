import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRideDto } from './dto/create-ride.dto';
import { BadRequestException } from '@nestjs/common';
import { DriverStatus, RideStatus } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';
import { SocketGateway } from 'src/socket/socket.gateway';

@Injectable()
export class RideService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private socketGateway: SocketGateway,
  ) { }
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
        category: dto.category ?? 'MINI',
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

    const updatedRide = await this.prisma.ride.update({
      where: {
        id: rideId,
      },
      data: {
        driverId: driver.id,
        status: RideStatus.ACCEPTED,
      },
      include: {
        rider: true,
        driver: true,
      },
    });

    await this.notificationService.createNotification(
      updatedRide.riderId,
      'Ride Accepted',
      'Your ride has been accepted by the driver.',
    );
    this.socketGateway.sendRideStatus(
      updatedRide.riderId,
      'ride-accepted',
      {
        rideId: updatedRide.id,
        status: updatedRide.status,
      },
    );

    return updatedRide;
  }

  async arriveRide(
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
        'Ride must be accepted first',
      );
    }

    const updatedRide = await this.prisma.ride.update({
      where: {
        id: rideId,
      },
      data: {
        status: RideStatus.DRIVER_ARRIVED,
      },
    });

    await this.notificationService.createNotification(
      ride.riderId,
      'Driver Arrived',
      'Your driver has arrived at the pickup location.',
    );
    this.socketGateway.sendRideStatus(
      ride.riderId,
      'ride-arrived',
      {
        rideId: updatedRide.id,
        status: updatedRide.status,
      },
    );
    return {
      message: 'Driver has arrived',
      ride: updatedRide,
    };
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
    if (ride.status !== RideStatus.DRIVER_ARRIVED) {
      throw new BadRequestException(
        'Driver must arrive before starting the ride',
      );
    }

    const updatedRide = await this.prisma.ride.update({
      where: {
        id: rideId,
      },
      data: {
        status: RideStatus.STARTED,
      },
    });

    this.socketGateway.sendRideStatus(
      ride.riderId,
      'ride-started',
      {
        rideId: updatedRide.id,
        status: updatedRide.status,
      },
    );

    await this.notificationService.createNotification(
      updatedRide.riderId,
      'Ride Started',
      'Your ride has started.',
    );

    return updatedRide;
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
   const updatedRide = await this.prisma.ride.update({
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

this.socketGateway.sendRideStatus(
  updatedRide.riderId,
  'ride-completed',
  {
    rideId: updatedRide.id,
    status: updatedRide.status,
  },
);
    await this.notificationService.createNotification(
      updatedRide.riderId,
      'Ride Completed',
      'Your ride has been completed successfully.',
    );

    return updatedRide;
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

    const updatedRide = await this.prisma.ride.update({
      where: {
        id: rideId,
      },
      data: {
        status: RideStatus.CANCELLED_BY_RIDER,
      },
    });
this.socketGateway.sendRideStatus(
  updatedRide.riderId,
  'ride-cancelled',
  {
    rideId: updatedRide.id,
    status: updatedRide.status,
  },
);
    if (ride.driverId) {
      const driver = await this.prisma.driver.findUnique({
        where: {
          id: ride.driverId,
        },
      });

      if (driver) {
        await this.notificationService.createNotification(
          driver.userId,
          'Ride Cancelled',
          'The rider cancelled the ride.',
        );
      }
    }

    return updatedRide;
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

    const updatedRide = await this.prisma.ride.update({
      where: {
        id: rideId,
      },
      data: {
        status: RideStatus.CANCELLED_BY_DRIVER,
        driverId: null,
      },
    });
    this.socketGateway.sendRideStatus(
  updatedRide.riderId,
  'ride-cancelled',
  {
    rideId: updatedRide.id,
    status: updatedRide.status,
  },
);

    await this.notificationService.createNotification(
      ride.riderId,
      'Ride Cancelled',
      'The driver cancelled your ride.',
    );

    return updatedRide;
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

  async getNearbyDrivers(
    riderLat: number,
    riderLng: number,
    category: string,
  ) {
    const drivers = await this.prisma.driver.findMany({
      where: {
        status: DriverStatus.APPROVED,
        isOnline: true,
        vehicleType: category as any,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        vehicleType: true,
        vehicleModel: true,
        vehicleNumber: true,
        latitude: true,
        longitude: true,
        user: {
          select: {
            fullName: true,
            profileImage: true,
          },
        },
      },
    });
    return drivers
      .map((driver) => ({
        ...driver,
        distance: this.calculateDistance(
          riderLat,
          riderLng,
          driver.latitude!,
          driver.longitude!,
        ),
      }))
      .filter((driver) => driver.distance <= 5)
      .sort((a, b) => a.distance - b.distance);
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const R = 6371;

    const dLat =
      ((lat2 - lat1) * Math.PI) / 180;

    const dLon =
      ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c =
      2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a),
      );

    return R * c;
  }
}