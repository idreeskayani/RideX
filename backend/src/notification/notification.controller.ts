import {
  Controller,
  Get,
  Req,
  UseGuards,
  Delete,
  Param,
  Patch
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';

@Controller('notification')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
  ) { }

  @UseGuards(JwtAuthGuard)
  @Get()
  getMyNotifications(@Req() req) {
    return this.notificationService.getMyNotifications(
      req.user.userId,
    );
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  markAsRead(
    @Param('id') id: string,
    @Req() req,
  ) {
    return this.notificationService.markAsRead(
      id,
      req.user.userId,
    );
  }

  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  markAllAsRead(@Req() req) {
    return this.notificationService.markAllAsRead(
      req.user.userId,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  delete(
    @Param('id') id: string,
    @Req() req,
  ) {
    return this.notificationService.deleteNotification(
      id,
      req.user.userId,
    );
  }

  @Get('count')
  @UseGuards(JwtAuthGuard)
  count(@Req() req) {
    return this.notificationService.unreadCount(
      req.user.userId,
    );
  }
}