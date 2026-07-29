import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('payment')
export class PaymentController {
  constructor(
    private paymentService: PaymentService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('create-intent')
  createIntent(
    @Req() req,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentService.createPaymentIntent(
      req.user.userId,
      dto.rideId,
    );
  }
}