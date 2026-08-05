import { Module } from '@nestjs/common';
import { RideController } from './ride.controller';
import { RideService } from './ride.service';
import {NotificationModule} from "../notification/notification.module";
import { PrismaModule } from 'src/prisma/prisma.module';
import { SocketModule } from 'src/socket/socket.module';
@Module({
  imports: [
    PrismaModule,
    NotificationModule,
    SocketModule,
  ],
  controllers: [RideController],
  providers: [RideService]
})
export class RideModule {}
