import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { RideCategory } from '@prisma/client';

export class CreateDriverDto {
  @IsString()
  @IsNotEmpty()
  cnic!: string;

  @IsString()
  @IsNotEmpty()
  licenseNumber!: string;

  @IsEnum(RideCategory)
  @IsNotEmpty()
  vehicleType!: RideCategory;

  @IsString()
  @IsNotEmpty()
  vehicleModel!: string;

  @IsString()
  @IsNotEmpty()
  vehicleNumber!: string;
}