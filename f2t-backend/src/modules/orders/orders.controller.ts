import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
  GetOrdersFilterDto,
} from './dto/order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrderDocument } from "./schemas/order.schema";

interface RequestUser {
  userId: string;
  role: string;
  email: string;
}

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Place a new order' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<{ order: OrderDocument }> {
    const order = await this.ordersService.create(user.userId, createOrderDto);
    return { order };
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders for current user/farm' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'paymentStatus', required: false, type: String })
  @ApiQuery({ name: 'farmId', required: false, type: String })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, type: String, enum: ['asc', 'desc'] })
  async findAll(
    @Query() filterDto: GetOrdersFilterDto,
    @CurrentUser() user: RequestUser,
  ): Promise<{ items: OrderDocument[]; total: number; page: number; limit: number; hasMore: boolean; }> {
    const result = await this.ordersService.findAll(filterDto, user);
    return {
      items: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get global order stats' })
  async getStats(@CurrentUser() user: RequestUser): Promise<import('./orders.service').ConsumerStats> {
    return this.ordersService.getConsumerStats(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details' })
  async findOne(@Param('id') id: string, @CurrentUser() user: RequestUser): Promise<OrderDocument> {
    return this.ordersService.findOne(id, user);
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  // @Roles('farm') // Removed roles for now to allow both to update in some cases, though usually farm
  @ApiOperation({ summary: 'Update order status' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() statusDto: UpdateOrderStatusDto,
  ): Promise<OrderDocument> {
    return this.ordersService.updateStatus(
      id,
      user.userId,
      statusDto.status,
      statusDto.message,
    );
  }

  @Post(':id/payment-status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  // @Roles('farm')
  @ApiOperation({ summary: 'Update order payment status' })
  async updatePaymentStatus(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() paymentStatusDto: UpdatePaymentStatusDto,
  ): Promise<OrderDocument> {
    return this.ordersService.updatePaymentStatusByFarm(
      id,
      user.userId,
      paymentStatusDto.status,
      paymentStatusDto.transactionId,
    );
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel order' })
  async cancel(@Param('id') id: string, @CurrentUser() user: RequestUser): Promise<OrderDocument> {
    return this.ordersService.cancel(id, user.userId);
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  // @Roles('farm')
  @ApiOperation({ summary: 'Refund order' })
  async refund(@Param('id') id: string, @CurrentUser() user: RequestUser): Promise<OrderDocument> {
    return this.ordersService.updateStatus(
      id,
      user.userId,
      'refunded',
      'Order refunded',
    );
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get order timeline' })
  async getTimeline(@Param('id') id: string, @CurrentUser() user: RequestUser): Promise<import('./schemas/order.schema').OrderTrackingStep[]> {
    const order = await this.ordersService.findOne(id, user);
    return order.timeline;
  }
}
