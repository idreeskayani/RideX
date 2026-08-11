import {
  Controller,
  Get,
  Patch,
  UseGuards,
  Req,
} from '@nestjs/common';

import { JwtAuthGuard} from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard'
import { Roles } from '../auth/decorators/roles/roles.decorator';
import { UsersService } from './users.service';

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