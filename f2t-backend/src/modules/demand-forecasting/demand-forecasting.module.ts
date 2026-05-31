import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { Product, ProductSchema } from '@modules/products/schemas/product.schema';
import { Farm, FarmSchema } from '@modules/farms/schemas/farm.schema';
import { FreshnessCache, FreshnessCacheSchema } from '@modules/dynamic-pricing/schemas/freshness-cache.schema';
import { DemandForecastingService } from './demand-forecasting.service';
import { DemandForecastingController } from './demand-forecasting.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Farm.name, schema: FarmSchema },
      { name: FreshnessCache.name, schema: FreshnessCacheSchema },
    ]),
    HttpModule,
  ],
  controllers: [DemandForecastingController],
  providers: [DemandForecastingService],
  exports: [DemandForecastingService],
})
export class DemandForecastingModule {}
