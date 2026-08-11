import {
  Controller,
  Get,
  Patch,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles/roles.decorator';
import { UsersService } from './users.service';

const profileStorage = diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/profiles';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + extname(file.originalname));
  },
});

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: any) {
    return this.usersService.getMe(req.user.userId);
  }

  @Patch('switch-role')
  @UseGuards(JwtAuthGuard)
  switchRole(@Req() req: any) {
    return this.usersService.switchRole(req.user.userId);
  }

  @Patch('profile-image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image', { storage: profileStorage }))
  updateProfileImage(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.updateProfileImage(req.user.userId, file.filename);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  adminRoute() {
    return {
      message: 'Welcome Admin',
    };
  }

  @Get('driver')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DRIVER')
  driverRoute() {
    return {
      message: 'Welcome Driver',
    };
  }

  @Get('rider')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('RIDER')
  riderRoute() {
    return {
      message: 'Welcome Rider',
    };
  }
}