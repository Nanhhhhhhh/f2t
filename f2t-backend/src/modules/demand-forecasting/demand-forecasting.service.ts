import { Injectable, Inject, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@common/redis/redis.constants';
import { ForecastResultDto } from './dto/forecast.dto';

const CACHE_TTL_SECONDS = 6 * 3600;
const CACHE_KEY = (productId: string) => `df:v1:${productId}`;

@Injectable()
export class DemandForecastingService {
  private readonly logger = new Logger(DemandForecastingService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async getForecast(
    productId: string,
    category: string,
    freshness: number,
    inventoryRatio: number,
    basePrice: number,
    competitorRefPrice: number,
    daysToRestock: number,
    prevDelta: number,
  ): Promise<ForecastResultDto> {
    const key = CACHE_KEY(productId);
    try {
      const cached = await this.redis.get(key);
      if (cached) return JSON.parse(cached) as ForecastResultDto;
    } catch (e) {
      this.logger.warn(`Redis get failed: ${String(e)}`);
    }

    const sidecarUrl = this.config.get<string>('PRICING_SIDECAR_URL', 'http://localhost:8000');
    try {
      const resp$ = this.http.post<ForecastResultDto>(
        `${sidecarUrl}/forecast`,
        {
          state_vector: {
            productId,
            category,
            freshness,
            inventory_ratio: inventoryRatio,
            base_price: basePrice,
            competitor_ref_price: competitorRefPrice,
            days_to_restock: daysToRestock,
            prev_delta: prevDelta,
            demand_7d: 0.0,
          },
        },
        { timeout: 8000 },
      );
      const { data } = await firstValueFrom(resp$);
      const result: ForecastResultDto = {
        productId: data.productId,
        demand7d: data.demand7d,
        pWaste: data.pWaste,
        computedAt: new Date().toISOString(),
      };
      await this.redis.set(key, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS);
      return result;
    } catch (e) {
      this.logger.warn(`Forecast sidecar error for ${productId}: ${String(e)}`);
      return { productId, demand7d: 0, pWaste: 0, computedAt: new Date().toISOString() };
    }
  }

  async invalidate(productId: string): Promise<void> {
    await this.redis.del(CACHE_KEY(productId));
  }
}
