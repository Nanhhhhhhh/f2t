import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { HttpModule } from "@nestjs/axios";
import { NotificationsModule } from "@modules/notifications/notifications.module";
import { FarmsModule } from "@modules/farms/farms.module";
import { Farm, FarmSchema } from "@modules/farms/schemas/farm.schema";
import { Product, ProductSchema } from "@modules/products/schemas/product.schema";
import { PriceOverride, PriceOverrideSchema } from "./schemas/price-override.schema";
import { FreshnessCache, FreshnessCacheSchema } from "./schemas/freshness-cache.schema";
import { DynamicPricingService } from "./dynamic-pricing.service";
import { DynamicPricingController } from "./dynamic-pricing.controller";
import { PricingTickCron } from "./pricing-tick.cron";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PriceOverride.name, schema: PriceOverrideSchema },
      { name: FreshnessCache.name, schema: FreshnessCacheSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Farm.name, schema: FarmSchema },
    ]),
    HttpModule,
    NotificationsModule,
    FarmsModule,
  ],
  controllers: [DynamicPricingController],
  providers: [DynamicPricingService, PricingTickCron],
  exports: [DynamicPricingService],
})
export class DynamicPricingModule {}
