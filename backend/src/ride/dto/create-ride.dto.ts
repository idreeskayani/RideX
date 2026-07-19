import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateRideDto {
  @IsNotEmpty()
  pickup!: string;
      
  @IsNotEmpty()
  destination!: string;

  @IsNumber()
  fare!: number;
}