import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
  ) {}
  async createChat(rideId: string) {
      const ride = await this.prisma.ride.findUnique({
    where: {
      id: rideId,
    },
    include: {
      chat: true,
    },
  });

  if (!ride) {
    throw new BadRequestException(
      'Ride not found',
    );
  }

  if (ride.chat) {
    return ride.chat;
  }

  return this.prisma.chat.create({
    data: {
      rideId,
    },
  });
}
async sendMessage(
  chatId: string,
  senderId: string,
  text: string,
) {
  const chat = await this.prisma.chat.findUnique({
    where: {
      id: chatId,
    },
    include: {
      ride: {
        include: {
          driver: true,
        },
      },
    },
  });

  if (!chat) {
    throw new BadRequestException(
      'Chat not found',
    );
  }

  const riderId = chat.ride.riderId;
  const driverId = chat.ride.driver?.userId;

  if (
    senderId !== riderId &&
    senderId !== driverId
  ) {
    throw new BadRequestException(
      'Unauthorized',
    );
  }

  return this.prisma.message.create({
    data: {
      chatId,
      senderId,
      text,
    },
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          role: true,
        },
      },
    },
  });
}
async getMessages(chatId: string) {
  return this.prisma.message.findMany({
    where: {
      chatId,
    },
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}
}