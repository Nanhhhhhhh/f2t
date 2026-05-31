/**
 * E2E tests for the dynamic pricing flow.
 *
 * Architecture:
 *  - mongodb-memory-server   → real MongoDB, no mocks
 *  - Mini HTTP sidecar mock  → returns exact dynamic-pricing-final response shapes
 *  - NestJS TestingModule    → real guards, interceptors, pipes
 *
 * Flow under test:
 *  Register farm owner → create farm → create product (DB direct) →
 *  POST freshness score → sidecar /forecast + /predict called →
 *  PriceOverride created → GET suggestions → PATCH accept/reject
 */
import * as http from 'http';
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Model, Types } from 'mongoose';

import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '../src/modules/auth/auth.module';
import { UsersModule } from '../src/modules/users/users.module';
import { FarmsModule } from '../src/modules/farms/farms.module';
import { NotificationsModule } from '../src/modules/notifications/notifications.module';
import { DynamicPricingModule } from '../src/modules/dynamic-pricing/dynamic-pricing.module';
import { DemandForecastingModule } from '../src/modules/demand-forecasting/demand-forecasting.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { Product, ProductSchema } from '../src/modules/products/schemas/product.schema';
import { DemandForecastingService } from '../src/modules/demand-forecasting/demand-forecasting.service';

// ── Sidecar mock server ───────────────────────────────────────────────────────

function startMockSidecar(): Promise<{ server: http.Server; url: string }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += String(chunk)));
      req.on('end', () => {
        let payload: Record<string, unknown> = {};
        try { payload = JSON.parse(body) as Record<string, unknown>; } catch { /* empty body */ }

        res.setHeader('Content-Type', 'application/json');

        if (req.url === '/forecast') {
          // Matches dynamic-pricing-final ForecastResponse shape
          const sv = (payload as Record<string, { productId: string }>).state_vector;
          res.writeHead(200);
          res.end(JSON.stringify({
            productId: sv?.productId ?? 'unknown',
            demand7d: 12.0,
            pWaste: 0.08,
          }));
        } else if (req.url === '/predict') {
          // Matches dynamic-pricing-final PriceOverride shape (snake_case fields)
          const svs = (payload as { state_vectors: Array<{ productId: string; base_price: number }> }).state_vectors ?? [];
          const overrides = svs.map((sv) => ({
            productId: sv.productId,
            targetPrice: Math.round(sv.base_price * 0.88),
            delta_pct: -12.0,
            safety_clipped: false,
            freshness_tag: 'aging',
          }));
          res.writeHead(200);
          res.end(JSON.stringify({ overrides }));
        } else if (req.url === '/freshness/classify') {
          // Matches dynamic-pricing-final ClassifyResponse shape
          res.writeHead(200);
          res.end(JSON.stringify({ score: 0.58, tag: 'aging', label: 'fresh', confidence: 0.72 }));
        } else if (req.url === '/health') {
          res.writeHead(200);
          res.end(JSON.stringify({ status: 'ok', ddqn_loaded: true, forecaster_loaded: true }));
        } else {
          res.writeHead(404);
          res.end('{}');
        }
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      resolve({ server, url: `http://127.0.0.1:${addr.port}` });
    });
  });
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('DynamicPricing (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mockSidecar: { server: http.Server; url: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let productModel: Model<any>;

  let farmOwnerToken: string;
  let farmId: string;
  let productId: string;

  beforeAll(async () => {
    // 1. Start sidecar mock before creating the NestJS module
    mockSidecar = await startMockSidecar();

    // 2. Start in-memory MongoDB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({
            MONGODB_URI: uri,
            JWT_SECRET: 'e2e-test-secret',
            JWT_REFRESH_SECRET: 'e2e-test-refresh-secret',
            JWT_EXPIRATION: '1h',
            JWT_REFRESH_EXPIRATION: '7d',
            PRICING_SIDECAR_URL: mockSidecar.url,
            PRICING_MODE: 'advisory',
            PRICING_SUGGESTION_TTL_HOURS: '1',
            // Redis will fail to connect → DemandForecastingService degrades gracefully
            REDIS_URL: 'redis://127.0.0.1:1',
          })],
        }),
        ScheduleModule.forRoot(),
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
        AuthModule,
        UsersModule,
        FarmsModule,
        NotificationsModule,
        DemandForecastingModule,
        DynamicPricingModule,
      ],
    })
    // DemandForecastingService injects REDIS_CLIENT from @Global RedisModule,
    // which is not imported in the test context. Override the whole service.
    .overrideProvider(DemandForecastingService)
    .useValue({
      getForecast: jest.fn().mockResolvedValue({
        productId: 'mock',
        demand7d: 12.0,
        pWaste: 0.1,
        computedAt: new Date().toISOString(),
      }),
      invalidate: jest.fn().mockResolvedValue(undefined),
    })
    .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    app.setGlobalPrefix('api');
    await app.init();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    productModel = moduleFixture.get<Model<any>>(getModelToken(Product.name));

    // 3. Register farm owner
    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'farmowner-dp@test.com',
        password: 'password123',
        firstName: 'Farm',
        lastName: 'Owner',
        phoneNumber: '0901234567',
        role: 'farm',
      });
    expect(reg.status).toBe(201);
    farmOwnerToken = (reg.body as { data: { accessToken: string } }).data.accessToken;

    // 4. Create farm
    const farmRes = await request(app.getHttpServer())
      .post('/api/farms')
      .set('Authorization', `Bearer ${farmOwnerToken}`)
      .send({
        name: 'Test Farm DP',
        description: 'Farm for dynamic pricing E2E',
        coordinates: { latitude: 10.7769, longitude: 106.7009 },
        address: { street: '1 Nguyen Hue', city: 'Ho Chi Minh', zipCode: '70000', country: 'VN' },
        contactEmail: 'farm-dp@test.com',
        contactPhone: '0901234567',
        deliveryMethods: ['pickup'],
      });
    expect(farmRes.status).toBe(201);
    farmId = (farmRes.body as { data: { id: string } }).data.id;
    expect(farmId).toBeTruthy();
  }, 60000);

  afterAll(async () => {
    await app.close();
    await mongod.stop();
    await new Promise<void>((resolve) => mockSidecar.server.close(() => resolve()));
  });

  // ── Setup: create product in DB directly ────────────────────────────────────

  beforeEach(async () => {
    const doc = await (productModel as unknown as Model<{
      farmId: Types.ObjectId;
      name: string;
      description: string;
      category: string;
      pricePerUnit: number;
      unit: string;
      availableQuantity: number;
      status: string;
    }>).create({
      farmId: new Types.ObjectId(farmId),
      name: 'Fresh Tomatoes',
      description: 'Ripe red tomatoes',
      category: 'vegetables',
      pricePerUnit: 35000,
      unit: 'kg',
      availableQuantity: 80,
      status: 'available',
    });
    productId = (doc._id as Types.ObjectId).toHexString();
  });

  afterEach(async () => {
    await (productModel as Model<unknown>).deleteMany({});
    // Also wipe overrides and freshness caches so tests don't bleed state
    const conn = (productModel as { db: { collection: (n: string) => { deleteMany: (q: unknown) => Promise<unknown> } } }).db;
    await conn.collection('price_overrides').deleteMany({});
    await conn.collection('freshness_caches').deleteMany({});
  });

  // ── Test: submit freshness score ─────────────────────────────────────────────

  describe('POST /api/dynamic-pricing/freshness/:productId', () => {
    it('creates a pending_review suggestion via sidecar /forecast + /predict', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/dynamic-pricing/freshness/${productId}`)
        .set('Authorization', `Bearer ${farmOwnerToken}`)
        .send({ score: 0.55, category: 'vegetables' });

      expect(res.status).toBe(201);
      const data = (res.body as { data: {
        medianScore: number;
        freshnessTag: string;
        suggestion: { targetPrice: number; deltaPct: number; status: string; freshnessTag: string } | null;
      } }).data;

      expect(data.medianScore).toBeCloseTo(0.55, 2);
      expect(data.freshnessTag).toBe('aging');

      // Sidecar was called → suggestion created
      expect(data.suggestion).toBeTruthy();
      expect(data.suggestion!.targetPrice).toBeGreaterThan(0);
      expect(data.suggestion!.deltaPct).toBeLessThan(0); // discount (delta_pct = -12)
      expect(data.suggestion!.status).toBe('pending_review');
      expect(data.suggestion!.freshnessTag).toBe('aging');
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/dynamic-pricing/freshness/${productId}`)
        .send({ score: 0.7, category: 'vegetables' });
      expect(res.status).toBe(401);
    });

    it('returns 403 when user does not own the farm', async () => {
      // Register a second user who does not own the farm
      const reg2 = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'other-user@test.com',
          password: 'password123',
          firstName: 'Other',
          lastName: 'User',
          phoneNumber: '0900000002',
          role: 'farm',
        });
      const otherToken = (reg2.body as { data: { accessToken: string } }).data.accessToken;

      const res = await request(app.getHttpServer())
        .post(`/api/dynamic-pricing/freshness/${productId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ score: 0.7, category: 'vegetables' });
      expect(res.status).toBe(403);
    });
  });

  // ── Test: scan freshness image ────────────────────────────────────────────────

  describe('POST /api/dynamic-pricing/freshness/:productId/scan', () => {
    it('classifies image via sidecar /freshness/classify and returns suggestion', async () => {
      const fakeImageB64 = Buffer.from('not-a-real-image').toString('base64');
      const res = await request(app.getHttpServer())
        .post(`/api/dynamic-pricing/freshness/${productId}/scan`)
        .set('Authorization', `Bearer ${farmOwnerToken}`)
        .send({ image_b64: fakeImageB64, category: 'vegetables' });

      expect(res.status).toBe(201);
      const data = (res.body as { data: {
        score: number;
        tag: string;
        label: string;
        confidence: number;
        medianScore: number;
      } }).data;

      // Sidecar returned score=0.58 → aging
      expect(data.score).toBeCloseTo(0.58, 2);
      expect(data.tag).toBe('aging');
      expect(data.medianScore).toBeCloseTo(0.58, 2);
    });
  });

  // ── Test: get suggestions ─────────────────────────────────────────────────────

  describe('GET /api/dynamic-pricing/suggestions', () => {
    it('returns pending suggestions for the farm owner', async () => {
      // First, submit freshness to create a suggestion
      await request(app.getHttpServer())
        .post(`/api/dynamic-pricing/freshness/${productId}`)
        .set('Authorization', `Bearer ${farmOwnerToken}`)
        .send({ score: 0.6, category: 'vegetables' });

      const res = await request(app.getHttpServer())
        .get('/api/dynamic-pricing/suggestions')
        .set('Authorization', `Bearer ${farmOwnerToken}`);

      expect(res.status).toBe(200);
      const data = (res.body as { data: { items: unknown[]; total: number } }).data;
      expect(data.total).toBeGreaterThanOrEqual(1);
      expect(data.items.length).toBeGreaterThanOrEqual(1);

      const suggestion = data.items[0] as {
        productName: string;
        deltaPct: number;
        freshnessTag: string;
        status: string;
      };
      expect(suggestion.productName).toBe('Fresh Tomatoes');
      expect(suggestion.status).toBe('pending_review');
    });
  });

  // ── Test: accept suggestion ───────────────────────────────────────────────────

  describe('PATCH /api/dynamic-pricing/suggestions/:id/accept', () => {
    it('accepts a suggestion and marks it accepted', async () => {
      // Create suggestion
      await request(app.getHttpServer())
        .post(`/api/dynamic-pricing/freshness/${productId}`)
        .set('Authorization', `Bearer ${farmOwnerToken}`)
        .send({ score: 0.65, category: 'vegetables' });

      const sugRes = await request(app.getHttpServer())
        .get('/api/dynamic-pricing/suggestions')
        .set('Authorization', `Bearer ${farmOwnerToken}`);
      const suggestion = (sugRes.body as { data: { items: Array<{ id: string }> } }).data.items[0];
      expect(suggestion).toBeTruthy();

      const acceptRes = await request(app.getHttpServer())
        .patch(`/api/dynamic-pricing/suggestions/${suggestion.id}/accept`)
        .set('Authorization', `Bearer ${farmOwnerToken}`);

      expect(acceptRes.status).toBe(200);
      const accepted = (acceptRes.body as { data: { status: string; reviewedAt: string } }).data;
      expect(accepted.status).toBe('accepted');
      expect(accepted.reviewedAt).toBeTruthy();
    });
  });

  // ── Test: reject suggestion ───────────────────────────────────────────────────

  describe('PATCH /api/dynamic-pricing/suggestions/:id/reject', () => {
    it('rejects a suggestion and marks it rejected', async () => {
      await request(app.getHttpServer())
        .post(`/api/dynamic-pricing/freshness/${productId}`)
        .set('Authorization', `Bearer ${farmOwnerToken}`)
        .send({ score: 0.72, category: 'vegetables' });

      const sugRes = await request(app.getHttpServer())
        .get('/api/dynamic-pricing/suggestions')
        .set('Authorization', `Bearer ${farmOwnerToken}`);
      const suggestion = (sugRes.body as { data: { items: Array<{ id: string }> } }).data.items[0];

      const rejectRes = await request(app.getHttpServer())
        .patch(`/api/dynamic-pricing/suggestions/${suggestion.id}/reject`)
        .set('Authorization', `Bearer ${farmOwnerToken}`);

      expect(rejectRes.status).toBe(200);
      const rejected = (rejectRes.body as { data: { status: string } }).data;
      expect(rejected.status).toBe('rejected');
    });

    it('returns 403 when a different user tries to reject', async () => {
      await request(app.getHttpServer())
        .post(`/api/dynamic-pricing/freshness/${productId}`)
        .set('Authorization', `Bearer ${farmOwnerToken}`)
        .send({ score: 0.70, category: 'vegetables' });

      const sugRes = await request(app.getHttpServer())
        .get('/api/dynamic-pricing/suggestions')
        .set('Authorization', `Bearer ${farmOwnerToken}`);
      const suggestion = (sugRes.body as { data: { items: Array<{ id: string }> } }).data.items[0];

      const reg2 = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: `intruder-${Date.now()}@test.com`,
          password: 'password123',
          firstName: 'Intruder',
          lastName: 'User',
          phoneNumber: '0900009999',
          role: 'farm',
        });
      const intruderToken = (reg2.body as { data: { accessToken: string } }).data.accessToken;

      const res = await request(app.getHttpServer())
        .patch(`/api/dynamic-pricing/suggestions/${suggestion.id}/reject`)
        .set('Authorization', `Bearer ${intruderToken}`);
      expect(res.status).toBe(403);
    });
  });
});
