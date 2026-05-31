import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, PipelineStage, UpdateQuery, FilterQuery } from 'mongoose';
import { Farm, FarmDocument } from './schemas/farm.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { PaginationResponseDto } from '../../common/dto/pagination-response.dto';

export interface FarmStats {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  ordersByStatus: {
    pending: number;
    confirmed: number;
    preparing: number;
    ready_for_pickup: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  totalRevenue: number;
  averageOrderValue: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    orderCount: number;
    revenue: number;
  }>;
  lowStockProducts: Array<{
    productId: string;
    productName: string;
    availableQuantity: number;
  }>;
  revenueByMonth: Array<{
    month: string;   // "2026-01"
    revenue: number;
  }>;
}
import {
  CreateFarmDto,
  UpdateFarmDto,
  GetFarmsFilterDto,
} from './dto/farm.dto';

interface AggregateResult {
  metadata: { total: number }[];
  data: FarmDocument[];
}

@Injectable()
export class FarmsService {
  constructor(
    @InjectModel(Farm.name) private farmModel: Model<FarmDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async create(
    ownerId: string,
    farmData: CreateFarmDto,
  ): Promise<FarmDocument> {
    const { coordinates, ...rest } = farmData;
    const createdFarm = new this.farmModel({
      ...rest,
      location: {
        type: 'Point',
        coordinates: [coordinates.longitude, coordinates.latitude],
      },
      ownerId: new Types.ObjectId(ownerId),
    });
    return createdFarm.save();
  }

  async findAll(
    query: GetFarmsFilterDto,
  ): Promise<PaginationResponseDto<FarmDocument>> {
    const {
      page = 1,
      limit = 10,
      search,
      isActive,
      latitude,
      longitude,
      radius = 10, // km
      sortBy = 'createdAt',
      sortOrder = 'desc',
      deliveryMethod,
    } = query;

    const hasLocation = latitude !== undefined && longitude !== undefined;

    if (hasLocation) {
      const pipeline: PipelineStage[] = [
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [longitude, latitude] },
            distanceField: 'distance',
            maxDistance: radius * 1000, // km to meters
            spherical: true,
          },
        },
      ];

      const match: FilterQuery<FarmDocument> & { $or?: Record<string, unknown>[] } = {};
      if (isActive !== undefined) match.isActive = isActive;
      if (deliveryMethod) match.deliveryMethods = deliveryMethod;
      if (search) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        match.$or = [
          { name: { $regex: escaped, $options: 'i' } },
          { description: { $regex: escaped, $options: 'i' } },
        ];
      }

      if (Object.keys(match).length > 0) {
        pipeline.push({ $match: match });
      }

      // Pagination using facet for count and data in one go
      pipeline.push({
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [
            { $sort: { distance: 1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            { $addFields: { id: { $toString: '$_id' } } },
          ],
        },
      });

      const results = await this.farmModel.aggregate<AggregateResult>(pipeline);
      const result = results[0] as AggregateResult | undefined;
      const metadata = result?.metadata;
      const total = metadata?.[0]?.total ?? 0;
      const items = result?.data ?? [];

      return new PaginationResponseDto(items, total, page, limit);
    }

    // Non-geo path
    const filter: FilterQuery<FarmDocument> = {};
    if (isActive !== undefined) filter.isActive = isActive;
    if (deliveryMethod) filter.deliveryMethods = deliveryMethod;
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
      ];
    }

    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.farmModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.farmModel.countDocuments(filter).exec(),
    ]);

    const itemsWithId = items.map((item) => ({
      ...item,
      id: (item._id as Types.ObjectId).toHexString(),
    }));

    return new PaginationResponseDto(
      itemsWithId as unknown as FarmDocument[],
      total,
      page,
      limit,
    );
  }

  async findOne(id: string): Promise<FarmDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid Farm ID: ${id}`);
    }
    const farm = await this.farmModel.findById(id).exec();
    if (!farm) {
      throw new NotFoundException(`Farm with ID ${id} not found`);
    }
    return farm;
  }

  async findOneByOwner(ownerId: string): Promise<FarmDocument | null> {
    return this.farmModel
      .findOne({ ownerId: new Types.ObjectId(ownerId) })
      .exec();
  }

  async update(
    id: string,
    ownerId: string,
    updateData: UpdateFarmDto,
  ): Promise<FarmDocument> {
    const farm = await this.findOne(id);
    if (farm.ownerId.toHexString() !== ownerId) {
      throw new ForbiddenException('You do not own this farm');
    }

    const { coordinates, ...rest } = updateData;
    const dataToUpdate: UpdateQuery<FarmDocument> = { ...rest };
    if (coordinates) {
      dataToUpdate.location = {
        type: 'Point',
        coordinates: [coordinates.longitude, coordinates.latitude],
      };
    }

    const updatedFarm = await this.farmModel
      .findByIdAndUpdate(id, dataToUpdate, { new: true })
      .exec();
    if (!updatedFarm) {
      throw new NotFoundException('Farm not found after update');
    }
    return updatedFarm;
  }

  async delete(id: string, ownerId: string): Promise<void> {
    const farm = await this.findOne(id);
    if (farm.ownerId.toHexString() !== ownerId) {
      throw new ForbiddenException('You do not own this farm');
    }
    await this.farmModel.findByIdAndDelete(id).exec();
  }

  async updateDeliveryZones(
    id: string,
    ownerId: string,
    zones: string[],
  ): Promise<FarmDocument> {
    const farm = await this.findOne(id);
    if (farm.ownerId.toHexString() !== ownerId) {
      throw new ForbiddenException('You do not own this farm');
    }
    const updatedFarm = await this.farmModel
      .findByIdAndUpdate(
        id,
        { deliveryZones: zones as unknown as Record<string, unknown>[] },
        { new: true },
      )
      .exec();
    if (!updatedFarm) {
      throw new NotFoundException('Farm not found after updating delivery zones');
    }
    return updatedFarm;
  }

  async updateBusinessHours(
    id: string,
    ownerId: string,
    hours: unknown,
  ): Promise<FarmDocument> {
    const farm = await this.findOne(id);
    if (farm.ownerId.toHexString() !== ownerId) {
      throw new ForbiddenException('You do not own this farm');
    }
    const updatedFarm = await this.farmModel
      .findByIdAndUpdate(
        id,
        { businessHours: hours as Record<string, unknown> },
        { new: true },
      )
      .exec();
    if (!updatedFarm) {
      throw new NotFoundException('Farm not found after updating business hours');
    }
    return updatedFarm;
  }

  async updateRestockSchedule(
    ownerId: string,
    schedule: { category: string; intervalDays: number }[],
  ): Promise<FarmDocument> {
    const farm = await this.farmModel.findOne({ ownerId: new Types.ObjectId(ownerId) });
    if (!farm) throw new NotFoundException('Farm not found');
    farm.restockSchedule = schedule;
    return farm.save();
  }

  async getAnalytics(id: string, ownerId: string): Promise<FarmStats> {
    const farm = await this.findOne(id);
    if (farm.ownerId.toHexString() !== ownerId) {
      throw new ForbiddenException('You do not own this farm');
    }

    const farmObjectId = new Types.ObjectId(id);
    const LOW_STOCK_THRESHOLD = 10;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [productStats, orderAggregation, topProducts, revenueByMonth] =
      await Promise.all([
        // 1. Product counts
        this.productModel.aggregate<{ total: number; active: number }>([
          { $match: { farmId: farmObjectId } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              active: {
                $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] },
              },
            },
          },
        ]),

        // 2. Order counts + revenue by status
        this.orderModel.aggregate<{ _id: string; count: number; revenue: number }>([
          { $match: { farmId: farmObjectId } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              revenue: { $sum: '$total' }, // Assuming totalAmount is 'total' in this codebase based on previous queries
            },
          },
        ]),

        // 3. Top 5 products by units ordered
        this.orderModel.aggregate<{
          _id: Types.ObjectId;
          productName: string;
          orderCount: number;
          revenue: number;
        }>([
          { $match: { farmId: farmObjectId, status: 'delivered' } },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.productId',
              productName: { $first: '$items.productName' },
              orderCount: { $sum: '$items.quantity' },
              revenue: {
                $sum: { $multiply: ['$items.pricePerUnit', '$items.quantity'] },
              },
            },
          },
          { $sort: { orderCount: -1 } },
          { $limit: 5 },
        ]),

        // 4. Revenue per month — last 6 months
        this.orderModel.aggregate<{ _id: string; revenue: number }>([
          {
            $match: {
              farmId: farmObjectId,
              status: 'delivered',
              createdAt: { $gte: sixMonthsAgo },
            },
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
              revenue: { $sum: '$total' },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

    // Low stock — separate query
    const lowStockProducts = await this.productModel
      .find({
        farmId: farmObjectId,
        availableQuantity: { $lt: LOW_STOCK_THRESHOLD },
        status: 'available',
      })
      .select('name availableQuantity')
      .lean()
      .exec();

    // Reduce order aggregation into byStatus + totals
    const byStatus = {
      pending: 0,
      confirmed: 0,
      preparing: 0,
      shipped: 0,
      ready_for_pickup: 0,
      delivered: 0,
      cancelled: 0,
    };
    let totalRevenue = 0;
    let totalOrders = 0;

    for (const r of orderAggregation) {
      const status = r._id as keyof typeof byStatus;
      if (status in byStatus) byStatus[status] = r.count;
      totalOrders += r.count;
      if (status === 'delivered') totalRevenue += r.revenue;
    }

    return {
      totalProducts: productStats[0]?.total ?? 0,
      activeProducts: productStats[0]?.active ?? 0,
      totalOrders,
      ordersByStatus: byStatus,
      totalRevenue,
      averageOrderValue: byStatus.delivered > 0
        ? totalRevenue / byStatus.delivered
        : 0,
      topProducts: topProducts.map(p => ({
        productId: p._id.toHexString(),
        productName: p.productName,
        orderCount: p.orderCount,
        revenue: p.revenue,
      })),
      lowStockProducts: lowStockProducts.map(p => ({
        productId: (p._id as Types.ObjectId).toHexString(),
        productName: p.name,
        availableQuantity: p.availableQuantity,
      })),
      revenueByMonth: revenueByMonth.map(r => ({
        month: r._id,
        revenue: r.revenue,
      })),
    };
  }
}
