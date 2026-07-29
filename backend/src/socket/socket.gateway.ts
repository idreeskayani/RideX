import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { DriverService } from '../driver/driver.service';


@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly driverService: DriverService,
    private readonly jwtService: JwtService,
  ) { }

  handleConnection(client: Socket) {
    console.log('New Socket Connection');

    console.log('Headers:');
    console.log(client.handshake.headers);

    console.log('Auth:');
    console.log(client.handshake.auth);

    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.replace(
          'Bearer ',
          '',
        );

      console.log('Token:', token);

      if (!token) {
        console.log('No token found');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      console.log('Payload:', payload);

      client.data.user = payload;

      client.join(`driver-${payload.sub}`);

      console.log(
        `Driver joined room: driver-${payload.sub}`,
      );

      client.join(`user-${payload.sub}`);

      console.log(
        `User joined room: user-${payload.sub}`,
      );
      console.log('Authenticated');

      console.log("Socket ID :", client.id);
    } catch (error) {
      console.log(error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(
      `Socket Disconnected: ${client.id}`,
    );
  }
  sendRideStatus(
    riderId: string,
    event: string,
    data: any,
  ) {
    this.server
      .to(`user-${riderId}`)
      .emit(event, data);
  }
  @SubscribeMessage('driver-location')
  handleDriverLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      rideId: string;
      latitude: number;
      longitude: number;
    },
  ) {
    this.server.to(`ride-${data.rideId}`).emit('ride', {
      latitude: data.latitude,
      longitude: data.longitude,
    });
  }

  @SubscribeMessage('join-ride')
  handleJoinRide(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      rideId: string;
    },
  ) {
    client.join(`ride-${data.rideId}`);

    console.log(
      `${client.id} joined ride-${data.rideId}`,
    );
  }
}