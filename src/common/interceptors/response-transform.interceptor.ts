import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface AppResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: object;
}

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, AppResponse<T>> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<AppResponse<T>> {
    return next.handle().pipe(
      map((response) => {
        // If service returns { data, message, meta } shape — pass through
        if (response && typeof response === 'object' && 'data' in response) {
          return {
            success: true,
            message: response.message ?? 'OK',
            data: response.data ?? null,
            ...(response.meta ? { meta: response.meta } : {}),
          };
        }
        // Raw value returned — wrap it
        return {
          success: true,
          message: 'OK',
          data: response ?? null,
        };
      }),
    );
  }
}
