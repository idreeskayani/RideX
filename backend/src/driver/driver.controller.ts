import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { DriverService } from './driver.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { Get, Patch } from '@nestjs/common';
import { Roles } from "../auth/decorators/roles/roles.decorator";
import { RolesGuard } from "../auth/guards/roles/roles.guard";
import { Role } from "@prisma/client";

@Controller('driver')
export class DriverController {
  constructor(private readonly driverService: DriverService) { }

  @UseGuards(JwtAuthGuard)
  @Post('register')
  register(
    @Req() req,
    @Body() dto: CreateDriverDto,
  ) {
    // console.log("USERID",req.user.userId);
    return this.driverService.register(req.user.userId, dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req) {
    console.log('USER', req.user);
    return this.driverService.getProfile(req.user.userId);
  }

  @Patch('go-online')
  @UseGuards(JwtAuthGuard)
  goOnline(@Req() req) {
    return this.driverService.goOnline(req.user.userId);
  }

  @Patch('go-offline')
  @UseGuards(JwtAuthGuard)
  goOffline(@Req() req) {
    return this.driverService.goOffline(req.user.userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @Req() req,
    @Body() dto: UpdateDriverDto,
  ) {
    return this.driverService.updateProfile(
      req.user.userId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('earnings')
  getEarnings(@Req() req) {
    return this.driverService.getEarnings(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('earnings/history')
  getEarningHistory(@Req() req) {
    return this.driverService.getEarningHistory(
      req.user.userId,
    );
  }
}