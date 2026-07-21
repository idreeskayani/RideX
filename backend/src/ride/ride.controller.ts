import {
  Body,
  Controller,
  Post,
  Patch,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Query} from '@nestjs/common';
import { RideService } from './ride.service';
import { DriverService } from "../driver/driver.service";
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { CreateRideDto } from './dto/create-ride.dto';
import { Get } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles/roles.decorator';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Role } from '@prisma/client';
import { AuthGuard } from "@nestjs/passport";

@Controller('ride')
export class RideController {
  constructor(private readonly rideService: RideService) { }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RIDER)
  @Post('request')
  requestRide(
    @Req() req,
    @Body() dto: CreateRideDto,
  ) {
    return this.rideService.requestRide(
      req.user.userId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DRIVER')
  @Get('available')
  getAvailableRides(@Req() req) {
    return this.rideService.getAvailableRides(
      req.user.userId,
    );
  }

  @Patch(':id/accept')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER)
  acceptRide(
    @Param('id') rideId: string,
    @Req() req,
  ) {
    return this.rideService.acceptRide(
      rideId,
      req.user.userId,
    );
  }
  @UseGuards(JwtAuthGuard)
  @Patch('start/:rideId')
  startRide(
    @Req() req,
    @Param('rideId') rideId: string,
  ) {
    return this.rideService.startRide(
      rideId,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER)
  @Patch('complete/:rideId')
  completeRide(
    @Param('rideId') rideId: string,
    @Req() req,
  ) {
    return this.rideService.completeRide(
      rideId,
      req.user.userId,
    );
  }

  @Patch(':rideId/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RIDER)
  cancelRideByRider(
    @Param('rideId') rideId: string,
    @Req() req,
  ) {
    return this.rideService.cancelRideByRider(
      rideId,
      req.user.userId,
    );
  }
  @Patch(':rideId/driver-cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER)
  cancelRideByDriver(
    @Param('rideId') rideId: string,
    @Req() req,
  ) {
    return this.rideService.cancelRideByDriver(
      rideId,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-rides')
  getMyRides(@Req() req) {
    return this.rideService.getMyRides(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-trips')
  getMyTrips(@Req() req) {
    return this.rideService.getMyTrips(req.user.userId);
  }

  @Get('nearby-drivers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RIDER)
  getNearbyDrivers(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
  ) {
    return this.rideService.getNearbyDrivers(
      Number(latitude),
      Number(longitude),
    );
  }
}