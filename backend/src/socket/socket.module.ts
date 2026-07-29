import { Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { DriverModule } from '../driver/driver.module';
import { JwtModule } from '@nestjs/jwt';
@Module({
  imports:[DriverModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  providers: [SocketGateway],
  exports: [SocketGateway],
})
export class SocketModule {}