import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { GetReviewsQueryDto } from './dto/get-reviews-query.dto';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private usersService: UsersService,
  ) {}

  async create(customerId: string, dto: CreateReviewDto): Promise<ReviewDocument> {
    // Construct ObjectIds first — throws BSONError if invalid, which is intentional
    let customerObjId: Types.ObjectId;
    let productObjId: Types.ObjectId;
    let orderObjId: Types.ObjectId;
    try {
      customerObjId = new Types.ObjectId(customerId);
      productObjId = new Types.ObjectId(dto.productId);
      orderObjId = new Types.ObjectId(dto.orderId);
    } catch {
      throw new ForbiddenException('Chỉ có thể đánh giá sản phẩm trong đơn hàng đã giao thành công.');
    }

    const user = await this.usersService.findById(customerId);
    const customerName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Người dùng';
    const customerAvatarUrl = user?.avatarUrl;

    const deliveredOrder = await this.orderModel
      .findOne({
        _id: orderObjId,
        customerId: customerObjId,
        status: 'delivered',
        'items.productId': productObjId,
      })
      .exec();

    if (!deliveredOrder) {
      throw new ForbiddenException('Chỉ có thể đánh giá sản phẩm trong đơn hàng đã giao thành công.');
    }

    const review = await this.reviewModel.create({
      productId: productObjId,
      orderId: orderObjId,
      customerId: customerObjId,
      customerName,
      customerAvatarUrl,
      rating: dto.rating,
      comment: dto.comment,
      photos: dto.photos ?? [],
    });

    await this.updateProductRating(dto.productId);
    return review;
  }

  async findAll(query: GetReviewsQueryDto) {
    const { page = 1, limit = 10, productId } = query;
    const filter: Record<string, unknown> = {};
    if (productId) filter.productId = new Types.ObjectId(productId);

    const [items, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.reviewModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page, limit, hasMore: page * limit < total };
  }

  async findMine(customerId: string, query: GetReviewsQueryDto) {
    const { page = 1, limit = 10 } = query;
    const filter = { customerId: new Types.ObjectId(customerId) };
    const [items, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.reviewModel.countDocuments(filter).exec(),
    ]);
    return { items, total, page, limit, hasMore: page * limit < total };
  }

  async remove(id: string, requesterId: string, isAdmin: boolean): Promise<void> {
    const review = await this.reviewModel.findById(id).exec();
    if (!review) throw new NotFoundException('Review not found');
    if (!isAdmin && review.customerId.toHexString() !== requesterId) {
      throw new ForbiddenException();
    }
    await this.reviewModel.deleteOne({ _id: id }).exec();
    await this.updateProductRating(review.productId.toHexString());
  }

  private async updateProductRating(productId: string): Promise<void> {
    const result = await this.reviewModel.aggregate([
      { $match: { productId: new Types.ObjectId(productId) } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const avg = result[0]?.avg ?? 0;
    const count = result[0]?.count ?? 0;
    await this.productModel
      .updateOne(
        { _id: new Types.ObjectId(productId) },
        { averageRating: Math.round(avg * 10) / 10, reviewCount: count },
      )
      .exec();
  }
}
