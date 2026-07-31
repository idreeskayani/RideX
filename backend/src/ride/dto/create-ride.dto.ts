import { IsNotEmpty, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { RideCategory } from '@prisma/client';

export class CreateRideDto {
  @IsNotEmpty()
  pickup!: string;

  @IsNotEmpty()
  destination!: string;

  @IsNumber()
  fare!: number;

  @IsOptional()
  @IsEnum(RideCategory)
  category?: RideCategory;

  @IsOptional()
  @IsNumber()
  pickupLat?: number;

  @IsOptional()
  @IsNumber()
  pickupLng?: number;

  @IsOptional()
  @IsNumber()
  destinationLat?: number;

  @IsOptional()
  @IsNumber()
  destinationLng?: number;
}
