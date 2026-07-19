import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { DriverModule } from './driver/driver.module';
import { AdminModule } from './admin/admin.module';
import { RideModule } from './ride/ride.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    DriverModule,
    AdminModule,
    RideModule,
  ],
})
export class AppModule {}