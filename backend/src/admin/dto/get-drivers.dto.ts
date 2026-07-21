import {
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import { DriverStatus } from '@prisma/client';

export class GetDriversDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(DriverStatus)
  status?: DriverStatus;

  @IsOptional()
  @IsString()
  isOnline?: string;

  @IsOptional()
  @IsNumberString()
  page?: string = '1';

  @IsOptional()
  @IsNumberString()
  limit?: string = '10';
}