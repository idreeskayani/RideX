import { IsOptional, IsString, IsEnum } from 'class-validator';
import { RideCategory } from '@prisma/client';

export class UpdateDriverDto {
  @IsOptional()
  @IsEnum(RideCategory)
  vehicleType?: RideCategory;

  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @IsOptional()
  @IsString()
  vehicleNumber?: string;
}