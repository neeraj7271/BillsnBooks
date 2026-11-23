import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import {
  UnitOfWorkService,
  TenantContext,
} from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';

/**
 * Establishes the per-request tenant context inside AsyncLocalStorage so that
 * {@link UnitOfWorkService.executeInTransaction} can enforce PostgreSQL
 * Row-Level Security via `set_config('app.tenant_id', ...)`.
 *
 * This runs AFTER guards (so `req.user` is populated by {@link JwtAuthGuard})
 * and wraps the entire handler execution — including its async DB work — in the
 * ALS context. A `x-tenant-id` override is honoured ONLY for SUPER_ADMIN; any
 * other mismatch is rejected as cross-tenant access.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    // Public/unauthenticated routes carry no tenant; run them unchanged.
    if (!user || !user.tenantId) {
      return next.handle();
    }

    let effectiveTenantId: string = user.tenantId;
    const headerTenantId = req.headers['x-tenant-id'];
    if (headerTenantId && headerTenantId !== user.tenantId) {
      if (user.role !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Cross-tenant access forbidden');
      }
      effectiveTenantId = headerTenantId as string;
    }

    req.tenantId = effectiveTenantId;

    const tenantContext: TenantContext = {
      tenantId: effectiveTenantId,
      userId: user.id,
      roles: [user.role],
    };

    return new Observable((subscriber) => {
      UnitOfWorkService.runWithContext(tenantContext, () => {
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
        return Promise.resolve();
      });
    });
  }
}
