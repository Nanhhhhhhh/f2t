import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import axios from 'axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';
import {
  NotificationPreferences,
  NotificationPreferencesDocument,
} from './schemas/notification-preferences.schema';
import { NotificationType } from './enums/notification-type.enum';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { FarmDocument } from '../farms/schemas/farm.schema';

interface NotificationQuery {
  page?: number;
  limit?: number;
  status?: string;
}

const LOW_STOCK_THRESHOLD = 10;

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(NotificationPreferences.name)
    private preferencesModel: Model<NotificationPreferencesDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
  ) {}

  async findAll(
    userId: string,
    query: NotificationQuery,
  ): Promise<{
    items: NotificationDocument[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    unreadCount: number;
  }> {
    const { page = 1, limit = 20 } = query;
    const filter: FilterQuery<NotificationDocument> = {
      userId: new Types.ObjectId(userId),
    };
    const skip = (page - 1) * limit;

    const [items, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(filter),
      this.notificationModel.countDocuments({ ...filter, isRead: false }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      hasMore: skip + items.length < total,
      unreadCount,
    };
  }

  async markAsRead(id: string, userId: string): Promise<NotificationDocument> {
    const notification = await this.notificationModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        { isRead: true },
        { new: true },
      )
      .exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    return notification;
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationModel
      .updateMany(
        { userId: new Types.ObjectId(userId), isRead: false },
        { isRead: true },
      )
      .exec();
  }

  async getPreferences(
    userId: string,
  ): Promise<NotificationPreferencesDocument> {
    let preferences = await this.preferencesModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();

    if (!preferences) {
      preferences = new this.preferencesModel({
        userId: new Types.ObjectId(userId),
      });
      await preferences.save();
    }

    return preferences;
  }

  async updatePreferences(
    userId: string,
    dto: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferencesDocument> {
    const preferences = await this.preferencesModel
      .findOneAndUpdate({ userId: new Types.ObjectId(userId) }, dto, {
        new: true,
        upsert: true,
      })
      .exec();

    return preferences;
  }

  async createAndPush(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    referenceId?: string;
    referenceType?: string;
    data?: Record<string, unknown>;
  }): Promise<NotificationDocument> {
    const notification = new this.notificationModel({
      userId: new Types.ObjectId(params.userId),
      type: params.type,
      title: params.title,
      message: params.message,
      referenceId: params.referenceId,
      referenceType: params.referenceType,
      data: params.data,
      isRead: false,
      pushSent: false,
    });
    const saved = await notification.save();

    // Fire and forget push
    void this.sendPush((saved._id as Types.ObjectId).toHexString(), params.userId);

    return saved;
  }

  async sendPush(notificationId: string, userId: string): Promise<void> {
    const [user, notification] = await Promise.all([
      this.userModel.findById(userId).select('+pushToken').lean().exec(),
      this.notificationModel.findById(notificationId).lean().exec(),
    ]);

    if (!user?.pushToken || !notification) return;

    try {
      await axios.post(
        'https://exp.host/--/api/v2/push/send',
        {
          to: user.pushToken,
          title: notification.title,
          body: notification.message,
          data: {
            notificationId,
            referenceId: notification.referenceId,
            referenceType: notification.referenceType,
            ...notification.data,
          },
          sound: 'default',
          badge: 1,
        },
        {
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
        },
      );

      await this.notificationModel.findByIdAndUpdate(notificationId, {
        pushSent: true,
      });
    } catch (error: unknown) {
      // Ignored
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkLowStockNightly(): Promise<void> {
    const lowStockProducts = await this.productModel
      .find({
        availableQuantity: { $lt: LOW_STOCK_THRESHOLD },
        status: 'available',
      })
      .populate<{ farmId: FarmDocument }>('farmId', 'ownerId')
      .lean()
      .exec();

    for (const product of lowStockProducts) {
      const farm = product.farmId as unknown as FarmDocument;
      const ownerId = farm.ownerId as Types.ObjectId | undefined;

      if (ownerId) {
        void this.createAndPush({
          userId: ownerId.toHexString(),
          type: NotificationType.LowStock,
          title: 'Sắp hết hàng (Daily Check)',
          message: `${product.name} chỉ còn ${product.availableQuantity} ${product.unit}.`,
          referenceId: (product._id as Types.ObjectId).toHexString(),
          referenceType: 'product',
          data: {
            productId: (product._id as Types.ObjectId).toHexString(),
            availableQuantity: product.availableQuantity,
            source: 'daily_check',
          },
        });
      }
    }
  }
}
