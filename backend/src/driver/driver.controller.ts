import { Body, Controller, Post, Req, UseGuards, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { DriverService } from './driver.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { Get, Patch } from '@nestjs/common';
import { Roles } from "../auth/decorators/roles/roles.decorator";
import { RolesGuard } from "../auth/guards/roles/roles.guard";
import { Role } from "@prisma/client";
import { UpdateLocationDto } from './dto/update-location.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

const storage = diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/drivers';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + extname(file.originalname));
  },
});

@Controller('driver')
export class DriverController {
  constructor(private readonly driverService: DriverService) { }

  @UseGuards(JwtAuthGuard)
  @Post('register')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'licenseImage', maxCount: 1 },
    { name: 'cnicImage', maxCount: 1 },
    { name: 'selfieImage', maxCount: 1 },
  ], { storage }))
  register(
    @Req() req,
    @Body() dto: CreateDriverDto,
    @UploadedFiles() files: { licenseImage?: Express.Multer.File[]; cnicImage?: Express.Multer.File[]; selfieImage?: Express.Multer.File[] },
  ) {
    dto.licenseImage = files?.licenseImage?.[0]?.filename;
    dto.cnicImage = files?.cnicImage?.[0]?.filename;
    dto.selfieImage = files?.selfieImage?.[0]?.filename;
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

  @Patch('location')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER)
  updateLocation(
    @Req() req,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.driverService.updateLocation(
      req.user.userId,
      dto,
    );
  }
}