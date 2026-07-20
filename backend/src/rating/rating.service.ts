import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { RideStatus } from '@prisma/client';

@Injectable()
export class RatingService {
  constructor(private prisma: PrismaService) {}

  async createRating(
    riderId: string,
    rideId: string,
    dto: CreateRatingDto,
  ) {
    const ride = await this.prisma.ride.findUnique({
      where: {
        id: rideId,
      },
      include: {
        driver: true,
      },
    });

    if (!ride) {
      throw new BadRequestException(
        'Ride not found',
      );
    }

    if (ride.riderId !== riderId) {
      throw new BadRequestException(
        'This is not your ride',
      );
    }

    if (ride.status !== RideStatus.COMPLETED) {
      throw new BadRequestException(
        'Ride is not completed yet',
      );
    }

    const alreadyRated =
      await this.prisma.rating.findUnique({
        where: {
          rideId,
        },
      });

    if (alreadyRated) {
      throw new BadRequestException(
        'Ride already rated',
      );
    }

    const rating =
      await this.prisma.rating.create({
        data: {
          rideId,
          riderId,
          driverId: ride.driverId!,
          stars: dto.stars,
          review: dto.review,
        },
      });

    return {
      message: 'Rating submitted successfully',
      rating,
    };
  }

  async getDriverRatings(userId: string) {
    const driver =
      await this.prisma.driver.findUnique({
        where: {
          userId,
        },
      });

    if (!driver) {
      throw new BadRequestException(
        'Driver profile not found',
      );
    }

    const ratings =
      await this.prisma.rating.findMany({
        where: {
          driverId: driver.id,
        },
        include: {
          rider: {
            select: {
              fullName: true,
            },
          },
        },
      });

    const average =
      ratings.length === 0
        ? 0
        : ratings.reduce(
            (sum, item) => sum + item.stars,
            0,
          ) / ratings.length;

    return {
      averageRating: Number(
        average.toFixed(1),
      ),
      totalRatings: ratings.length,
      ratings,
    };
  }
}