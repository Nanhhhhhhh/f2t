import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { DynamicPricingService } from '@modules/dynamic-pricing/dynamic-pricing.service';

@Injectable()
export class DynamicPricingInterceptor implements NestInterceptor {
  constructor(
    private configService: ConfigService,
    private dynamicPricingService: DynamicPricingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const path = context.switchToHttp().getRequest<Request>().path;

    if (!path.includes('/products')) {
      return next.handle();
    }

    if (this.configService.get('PRICING_MODE', 'shadow') === 'shadow') {
      return next.handle();
    }

    return next.handle().pipe(
      switchMap(async (raw) => {
        if (!raw || typeof raw !== 'object') {
          return raw;
        }

        // The global TransformInterceptor may have already wrapped the response as
        // { success, data, message }. Unwrap so we enrich the actual product payload,
        // then re-wrap — making this interceptor independent of interceptor ordering.
        const isEnvelope =
          'success' in (raw as Record<string, unknown>) &&
          'data' in (raw as Record<string, unknown>);
        const payload = isEnvelope ? (raw as { data: unknown }).data : raw;

        if (!payload || typeof payload !== 'object') {
          return raw;
        }

        const hasItems = Array.isArray((payload as { items?: unknown }).items);
        let ids: string[] = [];
        if (hasItems) {
          ids = (payload as { items: any[] }).items.map((p) => p?._id?.toString() ?? p?.id);
        } else if ((payload)._id || (payload).id) {
          ids = [(payload)._id?.toString() ?? (payload).id];
        } else {
          return raw;
        }

        ids = ids.filter((id) => id !== null && id !== undefined);
        if (ids.length === 0) {
          return raw;
        }

        const overridesMap = await this.dynamicPricingService.getAcceptedOverridesForProducts(ids);
        if (overridesMap.size === 0) {
          return raw;
        }

        const enrich = (product: Record<string, unknown>) => {
          const id = (product._id as any)?.toString() ?? (product.id as string);
          const override = overridesMap.get(id);
          if (!override) return product;
          // product may be a Mongoose document — spreading it would copy internal
          // ($__/_doc) fields, not the data. Convert to a plain object first.
          const plain =
            typeof (product as any).toJSON === 'function' ? (product as any).toJSON() : product;
          return {
            ...plain,
            dynamicPrice: override.targetPrice,
            freshnessScore: override.freshnessScore,
            priceTag: (override.deltaPct < 0 ? 'flash_discount' : 'standard') as string,
          };
        };

        const enrichedPayload = hasItems
          ? {
              ...(payload as Record<string, unknown>),
              items: ((payload as { items: Record<string, unknown>[] }).items).map(enrich),
            }
          : enrich(payload as Record<string, unknown>);

        return isEnvelope ? { ...(raw as Record<string, unknown>), data: enrichedPayload } : enrichedPayload;
      }),
    );
  }
}
