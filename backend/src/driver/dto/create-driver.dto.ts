import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDriverDto {
  @IsString()
  @IsNotEmpty()
  cnic!: string;

  @IsString()
  @IsNotEmpty()
  licenseNumber!: string;

  @IsString()
  @IsNotEmpty()
  vehicleType!: string;

  @IsString()
  @IsNotEmpty()
  vehicleModel!: string;

  @IsString()
  @IsNotEmpty()
  vehicleNumber!: string;
}