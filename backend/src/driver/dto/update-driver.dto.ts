import { IsOptional, IsString } from 'class-validator';

export class UpdateDriverDto {
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @IsOptional()
  @IsString()
  vehicleNumber?: string;
}