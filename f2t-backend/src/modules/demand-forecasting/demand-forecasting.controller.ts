import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '@modules/products/schemas/product.schema';
import { Farm, FarmDocument } from '@modules/farms/schemas/farm.schema';
import { FreshnessCache, FreshnessCacheDocument } from '@modules/dynamic-pricing/schemas/freshness-cache.schema';
import { DemandForecastingService } from './demand-forecasting.service';

@ApiTags('demand-forecasting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('demand-forecasting')
export class DemandForecastingController {
  constructor(
    private readonly service: DemandForecastingService,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Farm.name) private farmModel: Model<FarmDocument>,
    @InjectModel(FreshnessCache.name) private freshnessCacheModel: Model<FreshnessCacheDocument>,
  ) {}

  @Get('forecast/:productId')
  @ApiOperation({ summary: 'Get 7-day demand forecast for a product' })
  @ApiResponse({ status: 200, description: 'Forecast result' })
  async getForecast(@Param('productId') productId: string) {
    const product = await this.productModel.findById(productId)
      .select('farmId category pricePerUnit availableQuantity').lean();
    if (!product) return { productId, demand7d: 0, pWaste: 0 };

    const farm = await this.farmModel.findById(product.farmId)
      .select('restockSchedule').lean();
    const scheduleItem = (farm?.restockSchedule as { category: string; intervalDays: number }[] | undefined)
      ?.find((s) => s.category === product.category);
    const daysToRestock = scheduleItem?.intervalDays ?? 5;

    const cache = await this.freshnessCacheModel
      .findOne({ productId: new Types.ObjectId(productId) }).lean();
    const freshness = cache?.medianScore ?? 0.7;

    return this.service.getForecast(
      productId,
      product.category,
      freshness,
      Math.min((product.availableQuantity ?? 0) / 100, 2.0),
      product.pricePerUnit,
      product.pricePerUnit * 0.95,
      daysToRestock,
      0.0,
    );
  }

  @Get('farm/:farmId/forecasts')
  @ApiOperation({ summary: 'Get forecasts for all products in a farm' })
  @ApiResponse({ status: 200, description: 'Array of forecast results' })
  async getFarmForecasts(@Param('farmId') farmId: string) {
    const products = await this.productModel
      .find({ farmId: new Types.ObjectId(farmId), status: 'available' })
      .select('_id category pricePerUnit availableQuantity').lean();

    const farm = await this.farmModel.findById(farmId).select('restockSchedule').lean();
    const productIds = products.map((p) => p._id);
    const caches = await this.freshnessCacheModel.find({ productId: { $in: productIds } }).lean();
    const cacheMap = new Map(caches.map((c) => [c.productId.toString(), c.medianScore]));

    return Promise.all(
      products.map((p) => {
        const scheduleItem = (farm?.restockSchedule as { category: string; intervalDays: number }[] | undefined)
          ?.find((s) => s.category === p.category);
        const freshness = cacheMap.get(p._id.toString()) ?? 0.7;
        return this.service.getForecast(
          p._id.toString(),
          p.category,
          freshness,
          Math.min((p.availableQuantity ?? 0) / 100, 2.0),
          p.pricePerUnit,
          p.pricePerUnit * 0.95,
          scheduleItem?.intervalDays ?? 5,
          0.0,
        );
      }),
    );
  }
}
