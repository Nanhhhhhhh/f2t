import { Body, Controller, Get, HttpCode, Post, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DeliveryService, TrackingResponse } from './delivery.service';
import { OrdersService } from '../orders/orders.service';
import { GhnWebhookDto } from './dto/ghn-webhook.dto';

interface JwtUser {
  userId: string;
  role: string;
  email: string;
}

@ApiTags("delivery")
@Controller('delivery')
export class DeliveryController {
  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly ordersService: OrdersService,
  ) {}

  @Get('orders/:orderId/tracking')
  @UseGuards(JwtAuthGuard)
  async getTracking(
    @Param('orderId') orderId: string,
    @CurrentUser() user: JwtUser,
  ): Promise<TrackingResponse> {
    return this.deliveryService.getTracking(orderId, user.userId, user.role);
  }

  @Post('orders/:orderId/create-shipment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('farm')
  @ApiOperation({ summary: "Trigger GHN shipment creation for an order" })
  async createShipment(
    @Param('orderId') orderId: string,
  ): Promise<{ success: boolean; trackingCode: string }> {
    await this.deliveryService.createShipment(orderId);
    const order = await this.ordersService.findById(orderId);
    return { success: true, trackingCode: order.trackingCode || '' };
  }

  @Post('webhook/ghn')
  @HttpCode(200)
  @ApiOperation({ summary: "GHN push webhook — receives status updates from GHN" })
  @ApiResponse({ status: 200, description: "Acknowledged" })
  async ghnWebhook(@Body() payload: GhnWebhookDto): Promise<{ received: boolean }> {
    await this.deliveryService.handleGhnWebhook(payload);
    return { received: true };
  }
}
