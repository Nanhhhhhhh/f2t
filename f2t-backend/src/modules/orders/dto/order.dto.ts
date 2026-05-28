import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ShippingAddressDto {
  @IsString() @IsOptional() street?: string;
  @IsString() @IsOptional() city?: string;
  @IsOptional() @IsString() addressLine1?: string;
  @IsOptional() @IsString() addressLine2?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() phoneNumber?: string;
  @IsOptional() @IsString() recipientName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() streetAddress?: string;
  @IsOptional() @IsString() ward?: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() coordinates?: number[];
}

class OrderItemDto {
  @ApiProperty() @IsString() @IsNotEmpty() productId!: string;
  @ApiProperty() @IsNumber() @Min(1) quantity!: number;
  @IsOptional() @IsString() specialRequests?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreateOrderDto {
  @ApiProperty() @IsString() @IsOptional() farmId?: string;
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiProperty({ enum: ['pickup', 'farm_delivery', 'both', 'delivery'] })
  @IsEnum(['pickup', 'farm_delivery', 'both', 'delivery'])
  deliveryMethod!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress?: ShippingAddressDto;

  @ApiProperty({ enum: ['cash', 'stripe'] })
  @IsEnum(['cash', 'stripe'])
  paymentMethod!: string;
  @IsOptional() @IsString() specialInstructions?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsNumber() deliveryFee?: number;
  @IsOptional() @IsString() deliveryDate?: string;
  @IsOptional() @IsString() deliveryTimeSlot?: string;
  @IsOptional() @IsString() deliveryInstructions?: string;
  @IsOptional() @IsString() discountCode?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: [
      'pending',
      'confirmed',
      'preparing',
      'ready_for_pickup',
      'shipped',
      'delivered',
      'cancelled',
    ],
  })
  @IsEnum([
    'pending',
    'confirmed',
    'preparing',
    'ready_for_pickup',
    'shipped',
    'delivered',
    'cancelled',
  ])
  status!: string;

  @IsOptional() @IsString() message?: string;
}

export class GetOrdersFilterDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @IsOptional()
  @IsString()
  farmId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['createdAt', 'updatedAt', 'total', 'status', 'customerName', 'farmName'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: string = 'desc';
}

export class UpdatePaymentStatusDto {
  @ApiProperty({
    enum: ['pending', 'paid', 'failed', 'refunded'],
  })
  @IsEnum(['pending', 'paid', 'failed', 'refunded'])
  status!: string;

  @IsOptional() @IsString() transactionId?: string;
}
