import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { Product, ProductDocument } from '@modules/products/schemas/product.schema';
import { SidecarRecommendResponse } from './dto/recommend-sidecar.dto';

const ACTIVE_STATUS = ['available', 'seasonal'];

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

  async getCrossSell(productIds: string[], limit: number): Promise<Product[]> {
    if (!productIds.length) return [];

    const ids = productIds.map((id) => (Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id));
    const cartProducts = await this.productModel
      .find({ _id: { $in: ids } })
      .select('category farmId')
      .lean();
    if (!cartProducts.length) return [];

    const cartCategories = [...new Set(cartProducts.map((p) => p.category))];
    const cartProductIds = new Set(productIds);

    const scoreByCat = new Map<string, number>();
    const recCategories: string[] = [];
    const sidecarUrl = this.config.get<string>('RECOMMENDER_SIDECAR_URL', 'http://localhost:8001');
    try {
      const resp$ = this.http.post<SidecarRecommendResponse>(
        `${sidecarUrl}/recommend`,
        { cart_categories: cartCategories, top_k: 5 },
        { timeout: 5000 },
      );
      const { data } = await firstValueFrom(resp$);
      for (const r of data.recommendations) {
        recCategories.push(r.category);
        scoreByCat.set(r.category, r.score);
      }
    } catch (e) {
      this.logger.warn(`Recommender sidecar error: ${String(e)}`);
    }

    // Chỉ gợi ý sản phẩm CÙNG FARM với giỏ — đơn hàng F2T theo 1 farm, nên sản phẩm
    // farm khác không thể thêm vào cùng giỏ (nút "Thêm" sẽ lỗi). Category mà recommender
    // gợi ý chỉ dùng để xếp hạng (ưu tiên), không lọc cứng để farm vẫn đủ gợi ý.
    const candidates = await this.productModel
      .find({
        farmId: { $in: cartProducts.map((p) => p.farmId) },
        status: { $in: ACTIVE_STATUS },
        availableQuantity: { $gt: 0 },
        _id: { $nin: ids },
      })
      .select('-__v')
      .lean();

    const ranked = candidates
      .filter((p) => {
        const idStr = p._id instanceof Types.ObjectId ? p._id.toHexString() : (p._id as string);
        return !cartProductIds.has(idStr);
      })
      .map((p) => {
        const ruleScore = scoreByCat.get(p.category) ?? 0.1;
        return { p, score: ruleScore };
      })
      .sort((a, b) => b.score - a.score || (b.p.availableQuantity - a.p.availableQuantity))
      .slice(0, limit)
      .map((x) => {
        // .lean() bỏ virtual 'id' của schema → tự thêm để frontend dùng p.id.
        // Thiếu 'id' thì cart item có productId rỗng → checkout lỗi "productId should not be empty".
        const p = x.p as Record<string, unknown>;
        return { ...p, id: String(p._id) } as unknown as Product;
      });

    return ranked;
  }
}
