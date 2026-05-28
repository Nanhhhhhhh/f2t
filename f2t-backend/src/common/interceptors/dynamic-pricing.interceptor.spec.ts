import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { DynamicPricingService } from '@modules/dynamic-pricing/dynamic-pricing.service';
import { DynamicPricingInterceptor } from './dynamic-pricing.interceptor';

describe('DynamicPricingInterceptor', () => {
  let interceptor: DynamicPricingInterceptor;
  let configService: jest.Mocked<ConfigService>;
  let dynamicPricingService: jest.Mocked<DynamicPricingService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DynamicPricingInterceptor,
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: DynamicPricingService,
          useValue: { getAcceptedOverridesForProducts: jest.fn() },
        },
      ],
    }).compile();

    interceptor = module.get<DynamicPricingInterceptor>(DynamicPricingInterceptor);
    configService = module.get(ConfigService);
    dynamicPricingService = module.get(DynamicPricingService);
  });

  const createMockContext = (path: string): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ path }) }),
    } as ExecutionContext);

  const createMockHandler = (data: unknown): CallHandler => ({
    handle: () => of(data),
  });

  it('passes through on non-products route', async () => {
    configService.get.mockReturnValue('advisory');
    const ctx = createMockContext('/api/farms');
    const data = { items: [{ _id: 'x', pricePerUnit: 100 }] };
    const handler = createMockHandler(data);

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));
    expect(result).toEqual(data);
    expect(dynamicPricingService.getAcceptedOverridesForProducts).not.toHaveBeenCalled(); // eslint-disable-line @typescript-eslint/unbound-method
  });

  it('passes through in shadow mode', async () => {
    configService.get.mockReturnValue('shadow');
    const ctx = createMockContext('/api/products');
    const data = { items: [{ _id: 'x', pricePerUnit: 100 }] };
    const handler = createMockHandler(data);

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));
    expect(result).toEqual(data);
    expect(dynamicPricingService.getAcceptedOverridesForProducts).not.toHaveBeenCalled(); // eslint-disable-line @typescript-eslint/unbound-method
  });

  it('passes through when no accepted overrides exist', async () => {
    configService.get.mockReturnValue('advisory');
    const ctx = createMockContext('/api/products');
    dynamicPricingService.getAcceptedOverridesForProducts.mockResolvedValue(new Map());
    const data = { items: [{ _id: 'abc', pricePerUnit: 30000 }], total: 1, page: 1, limit: 10, hasMore: false };
    const handler = createMockHandler(data);

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));
    expect(result.items[0]).not.toHaveProperty('dynamicPrice');
  });

  it('injects dynamicPrice for accepted override in list response', async () => {
    configService.get.mockReturnValue('advisory');
    const ctx = createMockContext('/api/products');
    dynamicPricingService.getAcceptedOverridesForProducts.mockResolvedValue(
      new Map([['abc', { targetPrice: 27000, freshnessScore: 0.5, deltaPct: -10 } as any]])
    );
    const data = { items: [{ _id: 'abc', pricePerUnit: 30000 }], total: 1, page: 1, limit: 10, hasMore: false };
    const handler = createMockHandler(data);

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));
    expect(result.items[0].dynamicPrice).toBe(27000);
    expect(result.items[0].freshnessScore).toBe(0.5);
    expect(result.items[0].priceTag).toBe('flash_discount');
  });

  it('injects dynamicPrice for single product response', async () => {
    configService.get.mockReturnValue('advisory');
    const ctx = createMockContext('/api/products/abc');
    dynamicPricingService.getAcceptedOverridesForProducts.mockResolvedValue(
      new Map([['abc', { targetPrice: 27000, freshnessScore: 0.8, deltaPct: -10 } as any]])
    );
    const data = { _id: 'abc', pricePerUnit: 30000, name: 'Tomato' };
    const handler = createMockHandler(data);

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));
    expect(result.dynamicPrice).toBe(27000);
    expect(result.priceTag).toBe('flash_discount');
  });

  it('does not inject for rejected override (not in accepted map)', async () => {
    configService.get.mockReturnValue('advisory');
    const ctx = createMockContext('/api/products');
    dynamicPricingService.getAcceptedOverridesForProducts.mockResolvedValue(new Map());
    const data = { items: [{ _id: 'abc', pricePerUnit: 30000 }] };
    const handler = createMockHandler(data);

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));
    expect(result.items[0]).not.toHaveProperty('dynamicPrice');
  });
});