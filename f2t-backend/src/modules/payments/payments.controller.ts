import {
  Controller,
  Post,
  UseGuards,
  Body,
  HttpCode,
  Req,
  Headers,
  BadRequestException,
  RawBodyRequest,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Request } from 'express';

import { IsNotEmpty, IsString } from 'class-validator';

interface JwtUser {
  userId: string;
  role: string;
  email: string;
}

export class CreateCheckoutDto {
  @IsString()
  @IsNotEmpty()
  orderId!: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    
  ) {}

  // POST /api/payments/checkout
  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(
    @Body() dto: CreateCheckoutDto,
    @CurrentUser() user: JwtUser,
  ): Promise<{ sessionId: string; url: string }> {
    return this.paymentsService.createCheckoutSession(dto.orderId, user.userId);
  }

  // POST /api/payments/webhook
  @Post('webhook')
  @HttpCode(200)
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    if (!req.rawBody) {
      throw new BadRequestException('Missing raw body');
    }
    await this.paymentsService.handleWebhook(req.rawBody, signature);
    return { received: true };
  }
}
