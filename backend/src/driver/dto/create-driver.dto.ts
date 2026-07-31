import { IsNotEmpty, IsString, IsEnum } from 'class-validator';

export enum RideCategory {
  MINI = 'MINI',
  RIDE_AC = 'RIDE_AC',
  PREMIUM = 'PREMIUM',
}

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