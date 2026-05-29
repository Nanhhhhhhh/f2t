import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Farm, FarmDocument } from '../farms/schemas/farm.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { PaginationResponseDto } from '../../common/dto/pagination-response.dto';
import { AdminUsersQueryDto, AdminFarmsQueryDto, AdminOrdersQueryDto, AdminProductsQueryDto } from './dto/admin.dto';

export interface AdminAnalyticsDto {
  totalUsers: number;
  totalFarms: number;
  totalOrders: number;
  totalRevenue: number;
  ordersByStatus: Record<string, number>;
  farmsByVerification: Record<string, number>;
  newUsersThisMonth: number;
  newOrdersThisMonth: number;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Farm.name) private farmModel: Model<FarmDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async findAllUsers(query: AdminUsersQueryDto): Promise<PaginationResponseDto<UserDocument>> {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const filter: FilterQuery<UserDocument> = {};

    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = { $regex: escaped, $options: 'i' };
      filter.$or = [
        { email: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
      ];
    }

    if (query.role) filter.role = query.role;
    if (query.isBanned !== undefined) filter.isBanned = query.isBanned;

    const sortField = query.sortBy ?? 'createdAt';
    const sortDir = query.sortOrder === 'asc' ? 1 : -1;

    const total = await this.userModel.countDocuments(filter);
    const items = await this.userModel
      .find(filter)
      .sort({ [sortField]: sortDir })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    return new PaginationResponseDto(items, total, page, limit);
  }

  async banUser(id: string, isBanned: boolean): Promise<{ id: string; isBanned: boolean }> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ID format');
    
    // Keep isBanned and status consistent so the banned filter and UI agree.
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { isBanned, status: isBanned ? 'suspended' : 'active' },
      { new: true },
    ).exec();

    if (!user) throw new NotFoundException('User not found');

    return { id: (user._id as Types.ObjectId).toHexString(), isBanned: user.isBanned };
  }

  async changeUserRole(id: string, role: string): Promise<{ id: string; role: string }> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ID format');

    const user = await this.userModel.findByIdAndUpdate(
      id,
      { role },
      { new: true },
    ).exec();

    if (!user) throw new NotFoundException('User not found');

    return { id: (user._id as Types.ObjectId).toHexString(), role: user.role };
  }

  async findAllFarms(query: AdminFarmsQueryDto): Promise<PaginationResponseDto<FarmDocument>> {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const filter: FilterQuery<FarmDocument> = {};

    if (query.search) {
      const searchRegex = { $regex: query.search, $options: 'i' };
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
      ];
    }

    if (query.verificationStatus) filter.verificationStatus = query.verificationStatus;

    const total = await this.farmModel.countDocuments(filter);
    const items = await this.farmModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    return new PaginationResponseDto(items, total, page, limit);
  }

  async verifyFarm(id: string, verificationStatus: string, reason?: string): Promise<{ id: string; verificationStatus: string; reason?: string }> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ID format');

    const farm = await this.farmModel.findByIdAndUpdate(
      id,
      { verificationStatus },
      { new: true },
    ).exec();

    if (!farm) throw new NotFoundException('Farm not found');

    return { id: (farm._id as Types.ObjectId).toHexString(), verificationStatus: farm.verificationStatus, reason };
  }

  async findAllOrders(query: AdminOrdersQueryDto): Promise<PaginationResponseDto<OrderDocument>> {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const filter: FilterQuery<OrderDocument> = {};

    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.orderNumber = { $regex: escaped, $options: 'i' };
    }
    if (query.status) filter.status = query.status;
    if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;

    const total = await this.orderModel.countDocuments(filter);
    const items = await this.orderModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('customerId')
      .populate('farmId', 'name')
      .exec();

    return new PaginationResponseDto(items, total, page, limit);
  }

  async findAllProducts(query: AdminProductsQueryDto): Promise<PaginationResponseDto<ProductDocument>> {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const filter: FilterQuery<ProductDocument> = {};

    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' };
    }
    
    if (query.farmId) {
      if (Types.ObjectId.isValid(query.farmId)) {
        filter.farmId = new Types.ObjectId(query.farmId);
      }
    }

    const total = await this.productModel.countDocuments(filter);
    const items = await this.productModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    return new PaginationResponseDto(items, total, page, limit);
  }

  async getAnalytics(): Promise<AdminAnalyticsDto> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      totalFarms,
      totalOrders,
      revenueAgg,
      ordersStatusAgg,
      farmsVerifAgg,
      newUsersThisMonth,
      newOrdersThisMonth
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.farmModel.countDocuments(),
      this.orderModel.countDocuments(),
      this.orderModel.aggregate<{ total: number }>([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      this.orderModel.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      this.farmModel.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$verificationStatus', count: { $sum: 1 } } }
      ]),
      this.userModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
      this.orderModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
    ]);

    const ordersByStatus: Record<string, number> = {};
    for (const item of ordersStatusAgg) {
      ordersByStatus[item._id || 'unknown'] = item.count;
    }

    const farmsByVerification: Record<string, number> = {};
    for (const item of farmsVerifAgg) {
      farmsByVerification[item._id || 'unknown'] = item.count;
    }

    return {
      totalUsers,
      totalFarms,
      totalOrders,
      totalRevenue: revenueAgg[0]?.total ?? 0,
      ordersByStatus,
      farmsByVerification,
      newUsersThisMonth,
      newOrdersThisMonth,
    };
  }
}
