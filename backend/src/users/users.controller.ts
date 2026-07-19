import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard} from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard'
import { Roles } from '../auth/decorators/roles/roles.decorator';

@Controller('users')
export class UsersController {

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