import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { RideStatus } from '@prisma/client';

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
  ) {
    this.stripe = new Stripe(
      process.env.STRIPE_SECRET_KEY!,
      {
        apiVersion: '2026-06-24.dahlia',
      },
    );
  }

  async createPaymentIntent(
    riderId: string,
    rideId: string,
  ) {
    const ride =
      await this.prisma.ride.findUnique({
        where: {
          id: rideId,
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
        'Ride must be completed',
      );
    }

    const paymentIntent =
      await this.stripe.paymentIntents.create({
        amount: Math.round(
          (ride.fare ?? 0) * 100,
        ),
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
      });

    await this.prisma.ride.update({
      where: {
        id: rideId,
      },
      data: {
        paymentIntentId:
          paymentIntent.id,
      },
    });

    return {
      clientSecret:
        paymentIntent.client_secret,
    };
  }
}