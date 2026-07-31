import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { DriverService } from '../driver/driver.service';
import { PrismaService } from '../prisma/prisma.service';
import { RideStatus } from '@prisma/client';

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@WebSocketGateway({ cors: { origin: '*' } })
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly driverService: DriverService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) { client.disconnect(); return; }

      const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
      client.data.user = payload;
      client.join(`driver-${payload.sub}`);
      client.join(`user-${payload.sub}`);
      console.log(`Socket connected: ${client.id} | user: ${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Socket disconnected: ${client.id}`);
  }

  sendRideStatus(riderId: string, event: string, data: any) {
    this.server.to(`user-${riderId}`).emit(event, data);
  }

  broadcastToRide(rideId: string, event: string, data: any) {
    this.server.to(`ride-${rideId}`).emit(event, data);
  }

  @SubscribeMessage('join-ride')
  handleJoinRide(@ConnectedSocket() client: Socket, @MessageBody() data: { rideId: string }) {
    client.join(`ride-${data.rideId}`);
    console.log(`${client.id} joined ride-${data.rideId}`);
  }

  @SubscribeMessage('driver-location')
  async handleDriverLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { rideId: string; latitude: number; longitude: number },
  ) {
    const { rideId, latitude, longitude } = data;
    const userId = client.data.user?.sub;

    // 1. Persist driver location to DB
    if (userId) {
      await this.prisma.driver.updateMany({
        where: { userId },
        data: { latitude, longitude },
      }).catch(() => {});
    }

    // 2. Broadcast to all ride room members (rider app listens on 'ride' event)
    this.server.to(`ride-${rideId}`).emit('ride', { latitude, longitude });

    // 3. Load ride to check proximity thresholds
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } }).catch(() => null);
    if (!ride) return;

    // 4. Auto-arrive: driver within 30m of pickup while ACCEPTED
    if (ride.status === RideStatus.ACCEPTED && ride.pickupLat && ride.pickupLng) {
      const dist = haversineMeters(latitude, longitude, ride.pickupLat, ride.pickupLng);
      if (dist <= 30) {
        await this.prisma.ride.update({
          where: { id: rideId },
          data: { status: RideStatus.DRIVER_ARRIVED },
        }).catch(() => {});
        const arrivedPayload = { rideId, status: RideStatus.DRIVER_ARRIVED };
        this.server.to(`user-${ride.riderId}`).emit('ride-arrived', arrivedPayload);
        this.server.to(`ride-${rideId}`).emit('ride-arrived', arrivedPayload);
        console.log(`Auto-arrived ride ${rideId} — driver ${dist.toFixed(0)}m from pickup`);
      }
    }

    // 5. Auto-complete: driver within 30m of destination while STARTED
    if (ride.status === RideStatus.STARTED && ride.destinationLat && ride.destinationLng) {
      const dist = haversineMeters(latitude, longitude, ride.destinationLat, ride.destinationLng);
      if (dist <= 30) {
        await this.prisma.ride.update({
          where: { id: rideId },
          data: { status: RideStatus.COMPLETED },
        }).catch(() => {});
        const completedPayload = { rideId, status: RideStatus.COMPLETED };
        this.server.to(`user-${ride.riderId}`).emit('ride-completed', completedPayload);
        this.server.to(`ride-${rideId}`).emit('ride-completed', completedPayload);
        console.log(`Auto-completed ride ${rideId} — driver ${dist.toFixed(0)}m from destination`);
      }
    }
  }
}
