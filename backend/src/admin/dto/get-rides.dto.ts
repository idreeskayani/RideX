import {
    IsEnum,
    IsNumberString,
    IsOptional,
    IsString,
} from 'class-validator';
import { RideStatus } from '@prisma/client';

export class GetRidesDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    pickup?: string;

    @IsOptional()
    @IsString()
    destination?: string;

    @IsOptional()
    @IsEnum(RideStatus)
    status?: RideStatus;

    @IsOptional()
    @IsString()
    from?: string;

    @IsOptional()
    @IsString()
    to?: string;

    @IsOptional()
    @IsNumberString()
    page?: string = '1';

    @IsOptional()
    @IsNumberString()
    limit?: string = '10';

    @IsOptional()
    @IsString()
    sortBy?: string;

    @IsOptional()
    @IsString()
    order?: 'asc' | 'desc';
}