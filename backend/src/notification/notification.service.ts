import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async createNotification(
    userId: string,
    title: string,
    message: string,
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        title,
        message,
      },
    });
  }

  async getMyNotifications(userId: string) {
  return this.prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

async markAsRead(id: string, userId: string) {
  return this.prisma.notification.update({
    where: {
      id,
      userId,
    },
    data: {
      isRead: true,
    },
  });
}

async markAllAsRead(userId: string) {
  return this.prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
}

async deleteNotification(id: string, userId: string) {
  return this.prisma.notification.delete({
    where: {
      id,
      userId,
    },
  });
}

async unreadCount(userId: string) {
  return this.prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}
}