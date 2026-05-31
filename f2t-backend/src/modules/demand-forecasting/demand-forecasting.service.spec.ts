import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { REDIS_CLIENT } from '@common/redis/redis.constants';
import { DemandForecastingService } from './demand-forecasting.service';

const mockRedis = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
const mockHttp = { post: jest.fn() };
const mockConfig = { get: jest.fn((key: string, def?: string) => def ?? '') };

describe('DemandForecastingService', () => {
  let service: DemandForecastingService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DemandForecastingService,
        { provide: HttpService, useValue: mockHttp },
        { provide: ConfigService, useValue: mockConfig },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();
    service = module.get(DemandForecastingService);
  });

  it('returns cached forecast on Redis hit', async () => {
    mockRedis.get.mockResolvedValue(
      JSON.stringify({ productId: 'p1', demand7d: 12.5, pWaste: 0.15, computedAt: new Date().toISOString() }),
    );
    const result = await service.getForecast('p1', 'leafy', 0.85, 0.3, 50000, 47000, 2, 0.0);
    expect(result.demand7d).toBe(12.5);
    expect(mockHttp.post).not.toHaveBeenCalled();
  });

  it('calls sidecar and caches on Redis miss', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockHttp.post.mockReturnValue(
      of({ data: { productId: 'p1', demand7d: 18.0, pWaste: 0.08 } }),
    );
    const result = await service.getForecast('p1', 'leafy', 0.85, 0.3, 50000, 47000, 2, 0.0);
    expect(mockHttp.post).toHaveBeenCalledWith(
      expect.stringContaining('/forecast'),
      expect.objectContaining({ state_vector: expect.objectContaining({ productId: 'p1' }) }),
      expect.any(Object),
    );
    expect(mockRedis.set).toHaveBeenCalledWith('df:v1:p1', expect.any(String), 'EX', 21600);
    expect(result.demand7d).toBe(18.0);
  });

  it('returns zeros on sidecar error', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockHttp.post.mockReturnValue(throwError(() => new Error('sidecar down')));
    const result = await service.getForecast('p1', 'leafy', 0.85, 0.3, 50000, 47000, 2, 0.0);
    expect(result.demand7d).toBe(0);
    expect(result.pWaste).toBe(0);
  });
});
