import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data: unknown) => {
        const isObject = data !== null && typeof data === 'object';
        const dataObj = isObject ? (data as Record<string, unknown>) : null;

        return {
          success: true,
          data: (dataObj?.data ?? data) as T,
          message: dataObj?.message as string | undefined,
        };
      }),
    );
  }
}
