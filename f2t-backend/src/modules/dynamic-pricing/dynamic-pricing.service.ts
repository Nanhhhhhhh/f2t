import { Injectable, ForbiddenException, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { PriceOverride, PriceOverrideDocument } from "./schemas/price-override.schema";
import { FreshnessCache, FreshnessCacheDocument } from "./schemas/freshness-cache.schema";
import { Product, ProductDocument } from "@modules/products/schemas/product.schema";
import { Farm, FarmDocument } from "@modules/farms/schemas/farm.schema";
import { NotificationsService } from "@modules/notifications/notifications.service";
import { NotificationType } from "@modules/notifications/enums/notification-type.enum";
import { DemandForecastingService } from "@modules/demand-forecasting/demand-forecasting.service";

interface SidecarOverride {
  targetPrice?: number;
  target_price?: number;
  deltaPct?: number;
  delta_pct?: number;
  freshnessScore?: number;
  freshness_score?: number;
  freshnessTag?: string;
  freshness_tag?: string;
  safetyClipped?: boolean;
  safety_clipped?: boolean;
  productId?: string;
  product_id?: string;
}

@Injectable()
export class DynamicPricingService {
  private readonly logger = new Logger(DynamicPricingService.name);

  constructor(
    @InjectModel(PriceOverride.name) private overrideModel: Model<PriceOverrideDocument>,
    @InjectModel(FreshnessCache.name) private freshnessCacheModel: Model<FreshnessCacheDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Farm.name) private farmModel: Model<FarmDocument>,
    private notificationsService: NotificationsService,
    private configService: ConfigService,
    private httpService: HttpService,
    private demandForecastingService: DemandForecastingService,
  ) {}

  private computeFreshnessTag(score: number): string {
    if (score >= 0.8) return "fresh";
    if (score >= 0.4) return "aging";
    return "critical";
  }

  private computeWeibullFallback(category: string): number {
    let lambda = 0.995;
    if (category === "leafy" || category === "root" || category === "vegetables") {
      lambda = 0.97;
    } else if (category === "herbs") {
      lambda = 0.96;
    } else if (category === "fruits" || category === "fruit") {
      lambda = 0.985;
    }
    return Math.pow(lambda, 24);
  }

  private mapProductCategoryToAgent(category: string): string {
    if (category === "leafy" || category === "vegetables") return "leafy";
    if (category === "root") return "root";
    if (category === "fruit" || category === "fruits") return "fruit";
    if (category === "herbs") return "herbs";
    return "root";
  }

  private computeDaysToRestock(
    schedule: { category: string; intervalDays: number }[],
    category: string,
    lastRestockedAt?: Date,
  ): number {
    const item = schedule.find((s) => s.category === category);
    const intervalDays = item?.intervalDays ?? 5;
    if (!lastRestockedAt) return intervalDays;
    const daysSince = (Date.now() - lastRestockedAt.getTime()) / 86_400_000;
    const remaining = intervalDays - (daysSince % intervalDays);
    return Math.max(0, remaining);
  }

  private async getCompetitorRefPrice(
    farmId: Types.ObjectId | string,
    category: string,
    ownPrice: number,
  ): Promise<number> {
    try {
      const farm = await this.farmModel.findById(farmId).select("location").lean();
      if (!farm?.location.coordinates) return ownPrice * 0.95;

      const nearbyFarms = await this.farmModel
        .find({
          _id: { $ne: new Types.ObjectId(farmId.toString()) },
          location: {
            $near: {
              $geometry: { type: "Point", coordinates: farm.location.coordinates },
              $maxDistance: 10000,
            },
          },
        })
        .select("_id")
        .limit(2)
        .lean();

      if (!nearbyFarms.length) return ownPrice * 0.95;

      const competitorProducts = await this.productModel
        .find({
          farmId: { $in: nearbyFarms.map((f) => f._id) },
          category,
          status: "available",
        })
        .select("pricePerUnit")
        .lean();

      if (!competitorProducts.length) return ownPrice * 0.95;

      return competitorProducts.reduce((sum, p) => sum + p.pricePerUnit, 0) / competitorProducts.length;
    } catch {
      return ownPrice * 0.95;
    }
  }

  async classifyFreshnessImage(
    productId: string,
    image_b64: string,
    category: string,
    ownerId: string,
  ): Promise<{
    score: number;
    tag: string;
    label: string;
    confidence: number;
    medianScore: number;
    freshnessTag: string;
    suggestion?: PriceOverride | null;
  }> {
    const sidecarUrl = this.configService.get<string>("PRICING_SIDECAR_URL", "http://localhost:8000");
    let score: number;
    let tag: string;
    let label: string;
    let confidence: number;

    try {
      const response$ = this.httpService.post(
        `${sidecarUrl}/freshness/classify`,
        { image_b64, category },
        { timeout: 15000 },
      );
      const resp = await firstValueFrom(response$);
      ({ score, tag, label, confidence } = resp.data as { score: number; tag: string; label: string; confidence: number });
    } catch (err) {
      this.logger.warn(`Freshness classify sidecar error: ${err instanceof Error ? err.message : String(err)}`);
      // Fall back to Weibull estimate so the flow still generates a suggestion.
      score = this.computeWeibullFallback(category);
      tag = this.computeFreshnessTag(score);
      label = score >= 0.5 ? "fresh" : "rotten";
      confidence = 0;
    }

    const { medianScore, freshnessTag, suggestion } = await this.submitFreshness(productId, score, ownerId);
    return { score, tag, label, confidence, medianScore, freshnessTag, suggestion };
  }

  async submitFreshness(
    productId: string,
    score: number,
    ownerId: string,
  ): Promise<{ medianScore: number; freshnessTag: string; suggestion?: PriceOverride | null }> {
    const pId = new Types.ObjectId(productId);

    // Security check: must own the farm the product belongs to
    const product = await this.productModel.findById(pId).select("farmId");
    if (!product) throw new Error("Product not found");
    const farm = await this.farmModel.findById(product.farmId).select("ownerId");
    if (!farm || farm.ownerId.toHexString() !== ownerId) {
      throw new ForbiddenException("Not owner of this farm");
    }

    let cache = await this.freshnessCacheModel.findOne({ productId: pId });
    if (!cache) {
      cache = new this.freshnessCacheModel({ productId: pId, readings: [] });
    }

    cache.readings.push({ score, scannedAt: new Date() });
    if (cache.readings.length > 5) {
      cache.readings = cache.readings.slice(-5);
    }

    // Use the latest score instead of the median as requested by the user.
    const latestScore = score;

    cache.medianScore = latestScore;
    cache.updatedAt = new Date();
    cache.expiresAt = new Date(cache.updatedAt.getTime() + 6 * 3600 * 1000);

    await cache.save();

    // Immediately (re)compute an AI price suggestion for this product so a freshness
    // scan produces a visible suggestion card without waiting for the hourly cron.
    const suggestion = await this.generateSuggestionForProduct(productId).catch((err) => {
      this.logger.warn(`generateSuggestionForProduct failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    });

    return {
      medianScore: latestScore,
      freshnessTag: this.computeFreshnessTag(latestScore),
      suggestion,
    };
  }

  async generateSuggestionForProduct(productId: string): Promise<PriceOverrideDocument | null> {
    const product = await this.productModel
      .findById(productId)
      .select("_id farmId name category pricePerUnit availableQuantity status")
      .lean();
    if (!product || product.status === "unavailable") return null;

    const cache = await this.freshnessCacheModel.findOne({ productId: product._id });
    const freshness = cache?.medianScore ?? this.computeWeibullFallback(product.category);

    const competitorRefPrice = await this.getCompetitorRefPrice(product.farmId, product.category, product.pricePerUnit);

    const agentCat = this.mapProductCategoryToAgent(product.category);
    const inventoryRatio = Math.min((product.availableQuantity ?? 0) / 100, 2.0);

    // Farm restock schedule
    const farmDoc = await this.farmModel.findById(product.farmId).select('restockSchedule').lean();
    const schedule = (farmDoc?.restockSchedule as { category: string; intervalDays: number }[]) ?? [];

    // Previous delta from last override
    const lastOverride = await this.overrideModel
      .findOne({ productId: product._id, status: { $in: ['accepted', 'shadow', 'pending_review'] } })
      .sort({ computedAt: -1 })
      .select('deltaPct')
      .lean();
    const prevDelta = lastOverride ? (lastOverride.deltaPct ?? 0) / 100 : 0.0;

    // Resolve lastRestockedAt
    const productFull = await this.productModel
      .findById(product._id)
      .select('lastRestockedAt')
      .lean();
    const daysToRestock = this.computeDaysToRestock(
      schedule,
      product.category,
      productFull?.lastRestockedAt,
    );

    // Demand forecast
    const forecast = await this.demandForecastingService.getForecast(
      product._id.toString(),
      agentCat,
      freshness,
      inventoryRatio,
      product.pricePerUnit,
      competitorRefPrice,
      daysToRestock,
      prevDelta,
    );

    const stateVector = {
      productId: product._id.toString(),
      category: agentCat,
      freshness,
      inventory_ratio: inventoryRatio,
      base_price: product.pricePerUnit,
      competitor_ref_price: competitorRefPrice,
      days_to_restock: daysToRestock,
      prev_delta: prevDelta,
      demand_7d: forecast.demand7d,
    };

    const sidecarUrl = this.configService.get<string>("PRICING_SIDECAR_URL", "http://localhost:8000");
    let ov: SidecarOverride | undefined;
    try {
      const response$ = this.httpService.post(sidecarUrl + "/predict", { state_vectors: [stateVector] }, { timeout: 10000 });
      const resp = await firstValueFrom(response$);
      ov = (resp.data?.overrides || [])[0];
    } catch (err) {
      this.logger.warn("Pricing sidecar error: " + (err instanceof Error ? err.message : String(err)));
      return null;
    }
    if (!ov) return null;

    const mode = this.configService.get<string>("PRICING_MODE", "shadow");
    const ttlHours = parseFloat(this.configService.get<string>("PRICING_SUGGESTION_TTL_HOURS", "1")) || 1;
    const status = mode === "shadow" ? "shadow" : "pending_review";

    // Replace any prior non-final suggestion for this product so the latest scan wins.
    await this.overrideModel.deleteMany({ productId: product._id, status: { $in: ["shadow", "pending_review"] } });

    const doc = new this.overrideModel({
      productId: product._id,
      farmId: product.farmId,
      basePrice: product.pricePerUnit,
      targetPrice: ov.targetPrice ?? ov.target_price,
      deltaPct: ov.deltaPct ?? ov.delta_pct,
      freshnessScore: ov.freshnessScore ?? ov.freshness_score ?? freshness,
      freshnessTag: ov.freshnessTag ?? ov.freshness_tag ?? this.computeFreshnessTag(freshness),
      safetyClipped: ov.safetyClipped ?? ov.safety_clipped ?? false,
      mode,
      status,
      computedAt: new Date(),
      expiresAt: new Date(Date.now() + ttlHours * 3600 * 1000),
    });
    await doc.save();
    return doc;
  }

  async getAcceptedOverridesForProducts(productIds: string[]): Promise<Map<string, PriceOverrideDocument>> {
    const ids = productIds.map((id) => new Types.ObjectId(id));
    const overrides = await this.overrideModel.find({
      productId: { $in: ids },
      status: "accepted",
      expiresAt: { $gt: new Date() },
    });

    const map = new Map<string, PriceOverrideDocument>();
    for (const override of overrides) {
      map.set(override.productId.toHexString(), override);
    }
    return map;
  }

  async getSuggestionsForOwner(ownerId: string): Promise<{ items: (Record<string, unknown> & { id: string; productName: string })[]; total: number }> {
    const farms = await this.farmModel.find({ ownerId: new Types.ObjectId(ownerId) }).select("_id");
    const farmIds = farms.map((f) => f._id);

    const raw = await this.overrideModel
      .find({
        farmId: { $in: farmIds },
        status: "pending_review",
        expiresAt: { $gt: new Date() },
      })
      .lean();

    const productIds = [...new Set(raw.map((i) => i.productId.toString()))].map(
      (id) => new Types.ObjectId(id),
    );
    const products = await this.productModel.find({ _id: { $in: productIds } }).select("_id name").lean();
    const nameMap = new Map(products.map((p) => [p._id.toString(), p.name]));

    const items = raw.map((item) => ({
      ...item,
      id: item._id.toString(),
      productName: nameMap.get(item.productId.toString()) ?? "Unknown Product",
    }));

    return { items, total: items.length };
  }

  async reviewSuggestion(overrideId: string, ownerId: string, decision: "accepted" | "rejected"): Promise<PriceOverrideDocument> {
    const override = await this.overrideModel.findById(overrideId);
    if (!override) {
      throw new Error("Override not found");
    }

    const farm = await this.farmModel.findById(override.farmId);
    if (!farm || farm.ownerId.toHexString() !== ownerId) {
      throw new ForbiddenException("Not owner of this farm");
    }

    override.status = decision;
    override.reviewedAt = new Date();
    override.reviewedBy = new Types.ObjectId(ownerId);
    await override.save();

    // Advisory mode: an accepted suggestion is surfaced as `dynamicPrice` via the
    // interceptor (keeping the original pricePerUnit so the discount badge is visible).
    // Writing pricePerUnit directly is "live" mode, which is out of scope.

    return override;
  }

  async getShadowReport(): Promise<any> {
    const mode = this.configService.get<string>("PRICING_MODE", "shadow");
    const isAdvisory = mode === "advisory";

    const shadowCount = await this.overrideModel.countDocuments({ status: "shadow" });
    const shadowDays = Math.ceil(shadowCount / 24) || 0;

    const totalNonShadow = await this.overrideModel.countDocuments({ status: { $ne: "shadow" } });
    const safetyClippedCount = await this.overrideModel.countDocuments({ status: { $ne: "shadow" }, safetyClipped: true });
    const safetyClipRate = totalNonShadow > 0 ? safetyClippedCount / totalNonShadow : 0;

    const advisoryStats = isAdvisory
      ? await (async () => {
          const totalAdvisory = await this.overrideModel.countDocuments({ mode: 'advisory' });
          const acceptedCount = await this.overrideModel.countDocuments({ mode: 'advisory', status: 'accepted' });
          const rejectedCount = await this.overrideModel.countDocuments({ mode: 'advisory', status: 'rejected' });
          return {
            totalSuggestions: totalAdvisory,
            acceptanceRate: totalAdvisory > 0 ? acceptedCount / totalAdvisory : null,
            rejectionRate: totalAdvisory > 0 ? rejectedCount / totalAdvisory : null,
          };
        })()
      : { totalSuggestions: 0, acceptanceRate: null, rejectionRate: null };

    return {
      mode,
      shadowDays,
      avgLift: 0,
      wasteRate: 0,
      safetyClipRate,
      graduated: isAdvisory,
      advisoryStats,
    };
  }

  async runPricingTick(): Promise<void> {
    try {
      const products = await this.productModel
        .find({ status: "available" })
        .select("_id farmId name category pricePerUnit availableQuantity")
        .lean();

      if (products.length === 0) return;

      const productIds = products.map((p) => p._id);
      // Clear previous non-final suggestions so repeated ticks don't pile up duplicates.
      await this.overrideModel.deleteMany({
        productId: { $in: productIds },
        status: { $in: ["shadow", "pending_review"] },
      });
      const caches = await this.freshnessCacheModel.find({ productId: { $in: productIds } });
      const cacheMap = new Map<string, FreshnessCacheDocument>();
      for (const cache of caches) {
        cacheMap.set(cache.productId.toHexString(), cache);
      }

      // Build competitor price cache — one $geoNear per unique (farmId, category) pair.
      const competitorPairCache = new Map<string, number>();
      for (const p of products) {
        const key = `${p.farmId}:${p.category}`;
        if (!competitorPairCache.has(key)) {
          competitorPairCache.set(key, await this.getCompetitorRefPrice(p.farmId, p.category, p.pricePerUnit));
        }
      }

      // Pre-fetch farms for restockSchedule
      const farmIds = [...new Set(products.map((p) => p.farmId.toString()))];
      const farms = await this.farmModel
        .find({ _id: { $in: farmIds } })
        .select('_id restockSchedule')
        .lean();
      const farmScheduleMap = new Map(
        farms.map((f) => [
          f._id.toString(),
          (f.restockSchedule as { category: string; intervalDays: number }[]) ?? [],
        ]),
      );

      // Pre-fetch last override per product for prev_delta
      const lastOverrides = await this.overrideModel.aggregate<{ _id: Types.ObjectId; deltaPct: number }>([
        { $match: { productId: { $in: productIds }, status: { $in: ['accepted', 'shadow', 'pending_review'] } } },
        { $sort: { computedAt: -1 } },
        { $group: { _id: '$productId', deltaPct: { $first: '$deltaPct' } } },
      ]);
      const prevDeltaMap = new Map(
        lastOverrides.map((o) => [o._id.toString(), (o.deltaPct ?? 0) / 100]),
      );

      // Pre-fetch lastRestockedAt per product
      const productsWithRestock = await this.productModel
        .find({ _id: { $in: productIds } })
        .select('_id lastRestockedAt')
        .lean();
      const lastRestockedMap = new Map(
        productsWithRestock.map((p) => [p._id.toString(), p.lastRestockedAt]),
      );

      const state_vectors = await Promise.all(
        products.map(async (p) => {
          const cache = cacheMap.get(p._id.toString());
          const freshness = cache?.medianScore ?? this.computeWeibullFallback(p.category);
          const agentCat = this.mapProductCategoryToAgent(p.category);
          const compKey = `${p.farmId}:${p.category}`;
          const competitorRefPrice = competitorPairCache.get(compKey) ?? p.pricePerUnit * 0.95;
          const schedule = farmScheduleMap.get(p.farmId.toString()) ?? [];
          const daysToRestock = this.computeDaysToRestock(
            schedule,
            p.category,
            lastRestockedMap.get(p._id.toString()),
          );
          const prevDelta = prevDeltaMap.get(p._id.toString()) ?? 0.0;
          const inventoryRatio = Math.min((p.availableQuantity ?? 0) / 100, 2.0);

          const forecast = await this.demandForecastingService.getForecast(
            p._id.toString(),
            agentCat,
            freshness,
            inventoryRatio,
            p.pricePerUnit,
            competitorRefPrice,
            daysToRestock,
            prevDelta,
          );

          return {
            productId: p._id.toString(),
            category: agentCat,
            freshness,
            inventory_ratio: inventoryRatio,
            base_price: p.pricePerUnit,
            competitor_ref_price: competitorRefPrice,
            days_to_restock: daysToRestock,
            prev_delta: prevDelta,
            demand_7d: forecast.demand7d,
          };
        }),
      );

      const sidecarUrl = this.configService.get<string>("PRICING_SIDECAR_URL", "http://localhost:8000");
      let sidecarResponse;
      try {
        const response$ = this.httpService.post(sidecarUrl + "/predict", { state_vectors }, { timeout: 10000 });
        sidecarResponse = await firstValueFrom(response$);
      } catch (err) {
        this.logger.warn("Sidecar error: " + (err instanceof Error ? err.message : String(err)));
        return;
      }

      const overrides = sidecarResponse.data?.overrides || [];
      const mode = this.configService.get<string>("PRICING_MODE", "shadow");
      const ttlHoursStr = this.configService.get<string>("PRICING_SUGGESTION_TTL_HOURS", "1");
      const ttlHours = parseFloat(ttlHoursStr) || 1;
      
      const newOverrideDocs: PriceOverrideDocument[] = [];

      for (const ov of overrides) {
        const product = products.find((p) => p._id.toString() === ov.productId || p._id.toString() === ov.product_id);
        if (!product) continue;

        const status = mode === "shadow" ? "shadow" : "pending_review";
        const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);

        const doc = new this.overrideModel({
          productId: product._id,
          farmId: product.farmId,
          basePrice: product.pricePerUnit,
          targetPrice: ov.targetPrice || ov.target_price,
          deltaPct: ov.deltaPct || ov.delta_pct,
          freshnessScore: ov.freshnessScore || ov.freshness_score || 1,
          freshnessTag: ov.freshnessTag || ov.freshness_tag || "fresh",
          safetyClipped: ov.safetyClipped || ov.safety_clipped || false,
          mode,
          status,
          computedAt: new Date(),
          expiresAt,
        });
        await doc.save();
        newOverrideDocs.push(doc);
      }

      if (mode === "advisory") {
        const farmGroups = new Map<string, any>();
        for (const doc of newOverrideDocs) {
          farmGroups.set(doc.farmId.toHexString(), doc.farmId);
        }

        for (const farmId of farmGroups.keys()) {
          const farm = await this.farmModel.findById(farmId).select("ownerId name");
          if (farm?.ownerId) {
            await this.notificationsService.createAndPush({
              userId: farm.ownerId.toHexString(),
              type: NotificationType.System,
              title: "Gợi ý giá mới",
              message: "Hệ thống vừa tạo gợi ý giá mới cho nông trại " + farm.name,
              referenceType: "price_suggestion",
              data: { screen: "/(app)/farm/price-suggestions" },
            });
          }
        }
      }
    } catch (err) {
      this.logger.error("runPricingTick error: " + (err instanceof Error ? err.message : String(err)));
    }
  }
}
