import { Test, TestingModule } from "@nestjs/testing";
import { MongooseModule, getConnectionToken } from "@nestjs/mongoose";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Connection, Types as MongooseTypes } from "mongoose";
import { of } from "rxjs";
import { DynamicPricingService } from "./dynamic-pricing.service";
import { PriceOverride, PriceOverrideSchema } from "./schemas/price-override.schema";
import { FreshnessCache, FreshnessCacheSchema } from "./schemas/freshness-cache.schema";
import { Product, ProductSchema } from "@modules/products/schemas/product.schema";
import { Farm, FarmSchema } from "@modules/farms/schemas/farm.schema";
import { NotificationsService } from "@modules/notifications/notifications.service";
import { DemandForecastingService } from "@modules/demand-forecasting/demand-forecasting.service";
import { ForbiddenException } from "@nestjs/common";

describe("DynamicPricingService", () => {
  let service: DynamicPricingService;
  let mongod: MongoMemoryServer;
  let module: TestingModule;
  let connection: Connection;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: PriceOverride.name, schema: PriceOverrideSchema },
          { name: FreshnessCache.name, schema: FreshnessCacheSchema },
          { name: Product.name, schema: ProductSchema },
          { name: Farm.name, schema: FarmSchema },
        ]),
      ],
      providers: [
        DynamicPricingService,
        {
          provide: NotificationsService,
          useValue: {
            createAndPush: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: DemandForecastingService,
          useValue: {
            getForecast: jest.fn().mockResolvedValue({ productId: 'test', demand7d: 10, pWaste: 0.1, computedAt: new Date().toISOString() }),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key, defaultValue) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<DynamicPricingService>(DynamicPricingService);
    connection = module.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    await connection.close();
    await mongod.stop();
    await module.close();
  });

  afterEach(async () => {
    for (const collection of Object.values(connection.collections)) {
      await collection.deleteMany({});
    }
  });

  it("submitFreshness stores reading and returns median", async () => {
    const ownerId = new MongooseTypes.ObjectId();
    const farmModel = module.get("FarmModel");
    const productModel = module.get("ProductModel");
    
    const farm = await farmModel.create({
      ownerId,
      name: "Farm A",
      description: "Test farm",
      contactEmail: "a@test.com",
      contactPhone: "0900000000",
      address: { street: "1 St", city: "HCM", state: "HCM", zipCode: "70000", country: "VN" },
      location: { type: "Point", coordinates: [106.6, 10.7] },
    });
    
    const product = await productModel.create({
      farmId: farm._id,
      name: "Tomato",
      description: "Fresh tomato",
      category: "vegetables",
      pricePerUnit: 33000,
      unit: "kg",
      availableQuantity: 100,
      status: "available",
    });

    const result = await service.submitFreshness(product._id.toString(), 0.8, ownerId.toHexString());
    expect(result.medianScore).toBe(0.8);
    expect(result.freshnessTag).toBe("fresh");
  });

  it("submitFreshness keeps only last 5 readings", async () => {
    const ownerId = new MongooseTypes.ObjectId();
    const farmModel = module.get("FarmModel");
    const productModel = module.get("ProductModel");
    
    const farm = await farmModel.create({
      ownerId,
      name: "Farm A",
      description: "Test farm",
      contactEmail: "a2@test.com",
      contactPhone: "0900000002",
      address: { street: "1 St", city: "HCM", state: "HCM", zipCode: "70000", country: "VN" },
      location: { type: "Point", coordinates: [106.6, 10.7] },
    });
    const product = await productModel.create({
      farmId: farm._id,
      name: "Tomato",
      description: "Fresh tomato",
      category: "vegetables",
      pricePerUnit: 33000,
      unit: "kg",
      availableQuantity: 100,
      status: "available",
    });

    const productId = product._id.toString();
    for (let i = 0; i < 6; i++) {
      await service.submitFreshness(productId, i * 0.1, ownerId.toHexString());
    }
    const cacheModel = module.get("FreshnessCacheModel");
    const cache = await cacheModel.findOne({ productId: new MongooseTypes.ObjectId(productId) });
    expect(cache.readings.length).toBe(5);
  });

  it("computeWeibullFallback returns value between 0 and 1", () => {
    const result = (service as any).computeWeibullFallback("vegetables");
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it("getAcceptedOverridesForProducts returns only accepted non-expired", async () => {
    const overrideModel = module.get("PriceOverrideModel");
    const prod1 = new MongooseTypes.ObjectId();
    const prod2 = new MongooseTypes.ObjectId();
    const prod3 = new MongooseTypes.ObjectId();

    await overrideModel.create([
      { productId: prod1, farmId: new MongooseTypes.ObjectId(), basePrice: 10, targetPrice: 12, deltaPct: 20, freshnessScore: 0.9, freshnessTag: "fresh", status: "accepted", expiresAt: new Date(Date.now() + 100000), mode: "advisory", computedAt: new Date() },
      { productId: prod2, farmId: new MongooseTypes.ObjectId(), basePrice: 10, targetPrice: 12, deltaPct: 20, freshnessScore: 0.9, freshnessTag: "fresh", status: "accepted", expiresAt: new Date(Date.now() - 100000), mode: "advisory", computedAt: new Date() },
      { productId: prod3, farmId: new MongooseTypes.ObjectId(), basePrice: 10, targetPrice: 12, deltaPct: 20, freshnessScore: 0.9, freshnessTag: "fresh", status: "pending_review", expiresAt: new Date(Date.now() + 100000), mode: "advisory", computedAt: new Date() }
    ]);

    const result = await service.getAcceptedOverridesForProducts([prod1.toHexString(), prod2.toHexString(), prod3.toHexString()]);
    expect(result.size).toBe(1);
    expect(result.has(prod1.toHexString())).toBe(true);
  });

  it("reviewSuggestion throws ForbiddenException if wrong owner", async () => {
    const farmModel = module.get("FarmModel");
    const overrideModel = module.get("PriceOverrideModel");
    
    const ownerA = new MongooseTypes.ObjectId();
    const ownerB = new MongooseTypes.ObjectId();
    
    const farm = await farmModel.create({
      ownerId: ownerA,
      name: "Farm A",
      description: "Test farm",
      contactEmail: "a@test.com",
      contactPhone: "0900000000",
      address: { street: "1 St", city: "HCM", state: "HCM", zipCode: "70000", country: "VN" },
      location: { type: "Point", coordinates: [106.6, 10.7] },
    });
    const override = await overrideModel.create({
      productId: new MongooseTypes.ObjectId(),
      farmId: farm._id,
      basePrice: 10, targetPrice: 12, deltaPct: 20, freshnessScore: 0.9, freshnessTag: "fresh", status: "pending_review", expiresAt: new Date(Date.now() + 100000), mode: "advisory", computedAt: new Date()
    });

    await expect(service.reviewSuggestion(override._id.toString(), ownerB.toHexString(), "accepted")).rejects.toThrow(ForbiddenException);
  });

  it("runPricingTick calls sidecar and saves overrides", async () => {
    const productModel = module.get("ProductModel");
    const overrideModel = module.get("PriceOverrideModel");
    const httpService = module.get(HttpService);

    const farmId = new MongooseTypes.ObjectId();
    const product = await productModel.create({
      farmId,
      name: "Tomato",
      description: "Fresh tomato",
      category: "vegetables",
      pricePerUnit: 33000,
      unit: "kg",
      availableQuantity: 100,
      status: "available",
    });

    const mockResponse = {
      data: {
        overrides: [{
          productId: product._id.toString(),
          targetPrice: 30000,
          delta_pct: -10,
          safety_clipped: false,
          freshness_tag: "aging"
        }]
      }
    };

    (httpService.post as jest.Mock).mockReturnValue(of(mockResponse));

    await service.runPricingTick();

    const count = await overrideModel.countDocuments();
    expect(count).toBe(1);
  });

  describe('computeDaysToRestock', () => {
    it('returns intervalDays when no lastRestockedAt', () => {
      const days = (service as any).computeDaysToRestock(
        [{ category: 'vegetables', intervalDays: 4 }],
        'vegetables',
        undefined,
      );
      expect(days).toBe(4);
    });

    it('returns default 5 when no schedule entry for category', () => {
      const days = (service as any).computeDaysToRestock([], 'herbs', undefined);
      expect(days).toBe(5);
    });

    it('returns remaining days when restocked recently', () => {
      const recentDate = new Date(Date.now() - 1 * 24 * 3600 * 1000); // 1 day ago
      const days = (service as any).computeDaysToRestock(
        [{ category: 'vegetables', intervalDays: 4 }],
        'vegetables',
        recentDate,
      );
      // 1 day elapsed from 4-day interval → ~3 days remaining
      expect(days).toBeCloseTo(3, 0);
    });
  });
});
