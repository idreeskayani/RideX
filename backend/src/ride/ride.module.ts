import { Module } from '@nestjs/common';
import { RideController } from './ride.controller';
import { RideService } from './ride.service';
import {NotificationModule} from "../notification/notification.module";
import { PrismaModule } from 'src/prisma/prisma.module';
@Module({
  imports: [
    PrismaModule,
    NotificationModule
  ],
  controllers: [RideController],
  providers: [RideService]
})
export class RideModule {}
