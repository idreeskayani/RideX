import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { DriverModule } from './driver/driver.module';
import { AdminModule } from './admin/admin.module';
import { RideModule } from './ride/ride.module';
import { RatingModule } from './rating/rating.module';
import { NotificationModule } from './notification/notification.module';
import { SocketModule } from './socket/socket.module';
import { PaymentModule } from './payment/payment.module';
import {ConfigModule} from "@nestjs/config";
import { MailModule } from './mail/mail.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    DriverModule,
    AdminModule,
    RideModule,
    RatingModule,
    NotificationModule,
    SocketModule,
    PaymentModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MailModule,
    ChatModule,
  ],
})
export class AppModule {}