import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery, PipelineStage } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { ProductsService } from '../products/products.service';
import { FarmsService } from '../farms/farms.service';
import { PaginationResponseDto } from '../../common/dto/pagination-response.dto';
import { CreateOrderDto, GetOrdersFilterDto } from './dto/order.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { DeliveryService } from '../delivery/delivery.service';
import { DynamicPricingService } from '../dynamic-pricing/dynamic-pricing.service';
import { Inject, forwardRef } from '@nestjs/common';

const extractId = (
  val: Types.ObjectId | { _id: Types.ObjectId } | { id: string },
): string => {
  if (val instanceof Types.ObjectId) return val.toHexString();
  if ('id' in val && typeof (val as { id: string }).id === 'string') {
    return (val as { id: string }).id;
  }
  return (val as { _id: Types.ObjectId })._id.toHexString();
};

interface RequestUser {
  userId: string;
  role: string;
  email: string;
}

export interface ConsumerStats {
  totalOrders: number;
  totalSpent: number;
  ordersByStatus: Record<string, number>;
  averageOrderValue: number;
  lastOrderDate: string | null;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private productsService: ProductsService,
    private farmsService: FarmsService,
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => DeliveryService))
    private deliveryService: DeliveryService,
    private dynamicPricingService: DynamicPricingService,
  ) {}

  async create(
    customerId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<OrderDocument> {
    const { items, ...orderData } = createOrderDto;
    let { farmId } = createOrderDto;

    // Map notes to specialInstructions if provided
    const finalOrderData = {
      ...orderData,
      specialInstructions:
        orderData.specialInstructions ?? createOrderDto.notes,
    };

    // Fix shippingAddress for DB if it uses frontend fields
    if (
      finalOrderData.shippingAddress &&
      !finalOrderData.shippingAddress.street
    ) {
      finalOrderData.shippingAddress.street =
        finalOrderData.shippingAddress.addressLine1 || '';
    }

    // 1. Resolve farmId from first product if not provided
    if (!farmId && items.length > 0) {
      const firstProduct = await this.productsService.findOne(
        items[0].productId,
      );
      farmId = firstProduct.farmId.toHexString();
    }

    if (!farmId) {
      throw new BadRequestException(
        'farmId is required or could not be inferred',
      );
    }

    const farm = await this.farmsService.findOne(farmId);

    // 1b. Validate the chosen delivery method is actually offered by this farm.
    // Farm vocab is 'pickup' | 'farm_delivery' | 'both'; checkout sends
    // 'pickup' | 'delivery' — map them before comparing.
    const requestedMethod = finalOrderData.deliveryMethod;
    if (requestedMethod) {
      const supported = (farm.deliveryMethods ?? []) as string[];
      const supportsPickup =
        supported.includes('pickup') || supported.includes('both');
      const supportsDelivery =
        supported.includes('farm_delivery') ||
        supported.includes('delivery') ||
        supported.includes('both');
      const wantsPickup = requestedMethod === 'pickup';
      const wantsDelivery =
        requestedMethod === 'delivery' || requestedMethod === 'farm_delivery';
      if (wantsPickup && !supportsPickup) {
        throw new BadRequestException(
          `${farm.name} does not offer pickup. Please choose a delivery method this farm supports.`,
        );
      }
      if (wantsDelivery && !supportsDelivery) {
        throw new BadRequestException(
          `${farm.name} does not offer delivery. Please choose farm pickup instead.`,
        );
      }
    }

    // 2. Fetch and snapshot products
    const orderItems: Array<{
      productId: unknown;
      productName: string;
      productImage: string;
      quantity: number;
      pricePerUnit: number;
      unit: string;
      totalPrice: number;
      farmId: unknown;
      farmName: string;
      specialRequests?: string;
    }> = [];
    let subtotal = 0;
    let totalItems = 0;

    // AI advisory pricing: when a farm has accepted a DDQN price suggestion, the
    // accepted override (targetPrice) becomes the authoritative price charged for
    // the order. Products without an accepted override keep their base price.
    const acceptedOverrides =
      await this.dynamicPricingService.getAcceptedOverridesForProducts(
        items.map((item) => item.productId),
      );

    for (const item of items) {
      const product = await this.productsService.findOne(item.productId);

      if (product.farmId.toHexString() !== farmId) {
        throw new BadRequestException(
          `Product ${product.name} does not belong to farm ${farm.name}`,
        );
      }

      if (product.availableQuantity < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${product.name}`);
      }

      const override = acceptedOverrides.get(
        (product._id as Types.ObjectId).toHexString(),
      );
      const unitPrice = override?.targetPrice ?? product.pricePerUnit;
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;
      totalItems += item.quantity;

      // Embedded snapshot
      orderItems.push({
        productId: product._id,
        productName: product.name,
        productImage: product.images[0],
        quantity: item.quantity,
        pricePerUnit: unitPrice,
        unit: product.unit,
        totalPrice,
        farmId: farm._id,
        farmName: farm.name,
        specialRequests: item.specialRequests ?? item.notes,
      });

      // Update stock (ideally this should be in a transaction)
      await this.productsService.updateStock(
        String(product._id as string),
        farm.ownerId.toHexString(),
        product.availableQuantity - item.quantity,
      );
    }

    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const tax = subtotal * 0.1; // Example 10% tax
    const total = subtotal + tax + (finalOrderData.deliveryFee || 0);

    const createdOrder = new this.orderModel({
      ...finalOrderData,
      orderNumber,
      customerId: new Types.ObjectId(customerId),
      farmId: new Types.ObjectId(farmId),
      items: orderItems,
      totalItems,
      subtotal,
      tax,
      total,
      status: 'pending',
      paymentStatus: 'pending',
      timeline: [
        {
          status: 'pending',
          timestamp: new Date(),
          message: 'Order placed successfully',
          updatedBy: customerId,
        },
      ],
    });

    const savedOrder = await createdOrder.save();

    // Notify farm owner
    void this.notificationsService.createAndPush({
      userId: farm.ownerId.toHexString(),
      type: NotificationType.NewOrder,
      title: 'Đơn hàng mới!',
      message: `Bạn có đơn hàng mới trị giá ${savedOrder.total.toLocaleString('vi-VN')}đ`,
      referenceId: (savedOrder._id as Types.ObjectId).toHexString(),
      referenceType: 'order',
      data: {
        orderId: (savedOrder._id as Types.ObjectId).toHexString(),
        totalAmount: savedOrder.total,
      },
    });

    return savedOrder;
  }

  async findAll(
    query: GetOrdersFilterDto,
    user: RequestUser,
  ): Promise<PaginationResponseDto<OrderDocument>> {
    const {
      page = 1,
      limit = 10,
      status,
      paymentStatus,
      farmId,
      customerId,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: FilterQuery<OrderDocument> = {};

    if (user.role === 'consumer') {
      filter.customerId = new Types.ObjectId(user.userId);
    } else if (user.role === 'farm') {
      const farm = await this.farmsService.findOneByOwner(user.userId);
      if (farm) {
        filter.farmId = farm._id;
      } else {
        return new PaginationResponseDto([], 0, page, limit);
      }
    } else {
      // Admin or other roles can filter by customerId or farmId
      if (customerId) filter.customerId = new Types.ObjectId(customerId);
      if (farmId) filter.farmId = new Types.ObjectId(farmId);
    }

    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (sortBy === 'customerName' || sortBy === 'farmName') {
      const pipeline: PipelineStage[] = [
        { $match: filter },
        {
          $lookup: {
            from: 'users',
            localField: 'customerId',
            foreignField: '_id',
            as: 'customer',
          },
        },
        {
          $lookup: {
            from: 'farms',
            localField: 'farmId',
            foreignField: '_id',
            as: 'farm',
          },
        },
        {
          $addFields: {
            customerNameSort: {
              $toLower: {
                $ifNull: [{ $arrayElemAt: ['$customer.firstName', 0] }, ''],
              },
            },
            farmNameSort: {
              $toLower: {
                $ifNull: [{ $arrayElemAt: ['$farm.name', 0] }, ''],
              },
            },
          },
        },
        {
          $sort: {
            [sortBy === 'customerName' ? 'customerNameSort' : 'farmNameSort']:
              sortOrder === 'asc' ? 1 : -1,
          },
        },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $project: {
            id: { $toString: '$_id' },
            customerNameSort: 0,
            farmNameSort: 0,
          },
        },
      ];

      const [items, total] = await Promise.all([
        this.orderModel.aggregate(pipeline).exec(),
        this.orderModel.countDocuments(filter).exec(),
      ]);

      return new PaginationResponseDto(
        items as unknown as OrderDocument[],
        total,
        page,
        limit,
      );
    }

    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    const total = await this.orderModel.countDocuments(filter);
    const items = await this.orderModel
      .find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('customerId')
      .exec();

    return new PaginationResponseDto(items, total, page, limit);
  }

  async findOne(id: string, user: RequestUser): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    const order = await this.orderModel
      .findById(id)
      .populate('customerId')
      .exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    const orderCustomerId = extractId(order.customerId);

    if (user.role === 'consumer' && orderCustomerId !== user.userId) {
      throw new ForbiddenException(
        'You do not have permission to view this order',
      );
    }

    if (user.role === 'farm') {
      const farm = await this.farmsService.findOneByOwner(user.userId);
      const orderFarmId = extractId(order.farmId);
      const farmId = farm ? (farm._id as Types.ObjectId).toHexString() : null;

      if (!farmId || orderFarmId !== farmId) {
        throw new ForbiddenException(
          'You do not have permission to view this order',
        );
      }
    }

    return order;
  }

  async findById(id: string): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async updateStatus(
    id: string,
    userId: string,
    status: string,
    message?: string,
  ): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid order ID format');
    }

    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException('Order not found');

    // Ownership check — farm must own this order
    const farm = await this.farmsService.findOneByOwner(userId);
    const orderFarmId = extractId(order.farmId);
    const farmId = farm ? (farm._id as Types.ObjectId).toHexString() : null;

    if (!farmId || orderFarmId !== farmId) {
      throw new ForbiddenException(
        'You do not have permission to update this order',
      );
    }

    const timelineEntry = {
      status,
      timestamp: new Date(),
      message: message || `Order status updated to ${status}`,
      updatedBy: userId,
    };

    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(
        id,
        {
          status,
          $push: { timeline: timelineEntry },
        },
        { new: true },
      )
      .exec();

    if (!updatedOrder) throw new NotFoundException('Order not found');

    // Auto-create shipment if status is shipped
    if (status === 'shipped') {
      void this.deliveryService.createShipment(id);
    }

    // Notify consumer
    const statusMessages: Record<string, { title: string; message: string }> = {
      confirmed: {
        title: 'Đơn hàng đã xác nhận',
        message: 'Đơn hàng của bạn đã được xác nhận và sẽ sớm được chuẩn bị.',
      },
      preparing: {
        title: 'Đang chuẩn bị hàng',
        message: 'Nông trại đang chuẩn bị đơn hàng của bạn.',
      },
      ready_for_pickup: {
        title: 'Sẵn sàng để lấy hàng',
        message: 'Đơn hàng của bạn đã sẵn sàng. Bạn có thể đến lấy hàng.',
      },
      shipped: {
        title: 'Đang vận chuyển',
        message: 'Đơn hàng của bạn đã được giao cho đơn vị vận chuyển.',
      },
      delivered: {
        title: 'Giao hàng thành công',
        message: 'Đơn hàng của bạn đã được giao thành công!',
      },
      cancelled: {
        title: 'Đơn hàng đã bị huỷ',
        message: 'Đơn hàng của bạn đã bị huỷ.',
      },
    };

    const msgConfig = statusMessages[status];
    const consumerId = extractId(updatedOrder.customerId);

    void this.notificationsService.createAndPush({
      userId: consumerId,
      type: `order_${status}` as NotificationType,
      title: msgConfig.title,
      message: msgConfig.message,
      referenceId: (updatedOrder._id as Types.ObjectId).toHexString(),
      referenceType: 'order',
    });

    return updatedOrder;
  }

  async cancel(id: string, userId: string): Promise<OrderDocument> {
    const order = await this.findOne(id, {
      userId,
      role: 'consumer',
      email: '',
    });
    if (order.status !== 'pending' && order.status !== 'confirmed') {
      throw new BadRequestException(
        'Cannot cancel order in its current status',
      );
    }
    return this.updateStatus(
      id,
      userId,
      'cancelled',
      'Order cancelled by customer',
    );
  }

  async getConsumerStats(userId: string): Promise<ConsumerStats> {
    const results = await this.orderModel.aggregate<{
      _id: string;
      count: number;
      totalAmount: number;
    }>([
      { $match: { customerId: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' },
        },
      },
    ]);

    const byStatus: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready_for_pickup: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    let totalSpent = 0;
    let totalOrders = 0;

    for (const r of results) {
      byStatus[r._id] = r.count;
      totalOrders += r.count;
      if (r._id === 'delivered') {
        totalSpent += r.totalAmount;
      }
    }

    const lastOrder = await this.orderModel
      .findOne({ customerId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .select('createdAt')
      .lean<{ createdAt: Date }>()
      .exec();

    return {
      totalOrders,
      totalSpent,
      ordersByStatus: byStatus,
      averageOrderValue: byStatus.delivered > 0
        ? totalSpent / byStatus.delivered
        : 0,
      lastOrderDate: lastOrder ? lastOrder.createdAt.toISOString() : null,
    };
  }

  async updatePaymentStatusByFarm(
    orderId: string,
    userId: string,
    status: string,
    transactionId?: string,
  ): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('Invalid order ID format');
    }

    const order = await this.orderModel.findById(orderId).exec();
    if (!order) throw new NotFoundException('Order not found');

    if (order.paymentMethod === 'stripe') {
      throw new BadRequestException(
        'Payment status for Stripe orders is managed automatically',
      );
    }

    // Ownership check — farm must own this order
    const farm = await this.farmsService.findOneByOwner(userId);
    const orderFarmId = extractId(order.farmId);
    const farmId = farm ? (farm._id as Types.ObjectId).toHexString() : null;

    if (!farmId || orderFarmId !== farmId) {
      throw new ForbiddenException(
        'You do not have permission to update this order',
      );
    }

    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(
        orderId,
        {
          paymentStatus: status,
          ...(transactionId && { paymentTransactionId: transactionId }),
          ...(status === 'paid' && { paidAt: new Date() }),
        },
        { new: true },
      )
      .exec();

    if (!updatedOrder) throw new NotFoundException('Order not found');
    return updatedOrder;
  }

  async saveStripeSession(orderId: string, sessionId: string): Promise<void> {
    await this.orderModel.findByIdAndUpdate(orderId, {
      stripeSessionId: sessionId,
    });
  }

  async updatePaymentStatus(
    orderId: string,
    status: 'paid' | 'failed' | 'refunded',
    extra?: {
      stripePaymentIntentId?: string;
      paidAt?: Date;
    },
  ): Promise<void> {
    const order = await this.orderModel
      .findByIdAndUpdate(
        orderId,
        { paymentStatus: status, ...extra },
        { new: true },
      )
      .exec();

    if (!order || status !== 'paid') return;

    try {
      const farm = await this.farmsService.findOne(
        (order.farmId).toHexString(),
      );
      void this.notificationsService.createAndPush({
        userId: (farm.ownerId).toHexString(),
        type: NotificationType.PaymentReceived,
        title: 'Thanh toán nhận được!',
        message: `Đơn hàng #${order.orderNumber} đã được thanh toán thành công.`,
        referenceId: (order._id as Types.ObjectId).toHexString(),
        referenceType: 'order',
        data: {
          orderId: (order._id as Types.ObjectId).toHexString(),
          orderNumber: order.orderNumber,
          totalAmount: order.total,
        },
      });
    } catch (err) {
      console.error('[updatePaymentStatus] Failed to send farm notification:', err);
    }
  }

  async savePaymentUrl(orderId: string, paymentUrl: string): Promise<void> {
    await this.orderModel.findByIdAndUpdate(orderId, { paymentUrl });
  }

  async saveShipmentInfo(
    orderId: string,
    info: {
      ghnOrderCode: string;
      trackingCode: string;
      estimatedDeliveryDate: Date;
    },
  ): Promise<void> {
    await this.orderModel.findByIdAndUpdate(orderId, info);
  }

  async updateTrackingSteps(
    orderId: string,
    steps: Array<{
      status: string;
      description: string;
      timestamp: Date;
      location?: string;
    }>,
  ): Promise<void> {
    await this.orderModel.findByIdAndUpdate(orderId, { trackingSteps: steps });
  }

  async findByGhnOrderCode(ghnOrderCode: string): Promise<OrderDocument | null> {
    return this.orderModel.findOne({ ghnOrderCode }).exec();
  }

  async appendTrackingStep(
    orderId: string,
    step: { status: string; description: string; timestamp: Date; location?: string },
  ): Promise<void> {
    await this.orderModel.findByIdAndUpdate(orderId, { $push: { trackingSteps: step } });
  }

  async updateOrderStatus(orderId: string, status: string): Promise<void> {
    await this.orderModel.findByIdAndUpdate(orderId, { status });
  }

  async findOneForUser(id: string, userId: string, role: string): Promise<OrderDocument> {
    const order = await this.findOne(id, { userId, role, email: '' });
    return order;
  }

}
  