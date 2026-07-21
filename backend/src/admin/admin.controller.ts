import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { Query } from '@nestjs/common/decorators';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles/roles.decorator';
import { Role } from '@prisma/client';
import { RideStatus } from '@prisma/client';
import { GetUsersDto } from './dto/get-users.dto';
import {GetDriversDto} from './dto/get-drivers.dto';
import {GetRidesDto} from './dto/get-rides.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
  ) { }

  // ===========================
  // Dashboard
  // ===========================
  @Get('dashboard')
  dashboard() {
    return this.adminService.dashboard();
  }

  // ===========================
  // Get Pending Drivers
  // ===========================
  @Get('drivers/pending')
  getPendingDrivers() {
    return this.adminService.getPendingDrivers();
  }

  // ===========================
  // Approve Driver
  // ===========================
  @Patch('drivers/:id/approve')
  approveDriver(@Param('id') id: string) {
    return this.adminService.approveDriver(id);
  }

  // ===========================
  // Reject Driver
  // ===========================
  @Patch('drivers/:id/reject')
  rejectDriver(@Param('id') id: string) {
    return this.adminService.rejectDriver(id);
  }

 @Get('drivers')
getAllDrivers(@Query() query: GetDriversDto) {
  return this.adminService.getAllDrivers(query);
}

  // ===========================
  // Get All Users
  // ===========================
  @Get('users')
  getAllUsers(@Query() query: GetUsersDto) {
    return this.adminService.getAllUsers(query);
  }
  // ===========================
  // Block User
  // ===========================
  @Patch('users/:id/block')
  blockUser(@Param('id') id: string) {
    return this.adminService.blockUser(id);
  }

  // ===========================
  // Unblock User
  // ===========================
  @Patch('users/:id/unblock')
  unblockUser(@Param('id') id: string) {
    return this.adminService.unblockUser(id);
  }

  // ===========================
  // Delete User
  // ===========================
  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('rides')
getAllRides(@Query() query: GetRidesDto) {
  return this.adminService.getAllRides(query);
}

  @Get('rides/:id')
  getRideById(@Param('id') id: string) {
    return this.adminService.getRideById(id);
  }

  @Patch('rides/:id/cancel')
  cancelRide(@Param('id') id: string) {
    return this.adminService.cancelRide(id);
  }

  @Get('rides/status/:status')
  getRidesByStatus(@Param('status') status: RideStatus) {
    return this.adminService.getRidesByStatus(status);
  }
}