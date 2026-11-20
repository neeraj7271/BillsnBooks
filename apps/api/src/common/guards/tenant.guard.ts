import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.tenantId) {
      throw new ForbiddenException('Tenant context missing from user session');
    }

    // Header override option if superadmin acts on behalf of tenant
    const headerTenantId = request.headers['x-tenant-id'];
    if (headerTenantId && headerTenantId !== user.tenantId && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Cross-tenant access forbidden');
    }

    const effectiveTenantId = (headerTenantId as string) || user.tenantId;

    // Set tenant context for this async execution flow
    UnitOfWorkService.runWithContext(
      {
        tenantId: effectiveTenantId,
        userId: user.id,
        roles: [user.role],
      },
      () => Promise.resolve(),
    );

    request.tenantId = effectiveTenantId;
    return true;
  }
}

