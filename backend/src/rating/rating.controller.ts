import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RatingService } from './rating.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { CreateRatingDto } from './dto/create-rating.dto';

@Controller('rating')
export class RatingController {
  constructor(
    private readonly ratingService: RatingService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post(':rideId')
  createRating(
    @Req() req,
    @Param('rideId') rideId: string,
    @Body() dto: CreateRatingDto,
  ) {
    return this.ratingService.createRating(
      req.user.userId,
      rideId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('driver')
  getDriverRatings(@Req() req) {
    return this.ratingService.getDriverRatings(
      req.user.userId,
    );
  }
}