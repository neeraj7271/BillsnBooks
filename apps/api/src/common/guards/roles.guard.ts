import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { UserRole } from '@platform/shared-types';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

/**
 * Enforces both static @Roles(...) and firm-customizable permission_roles matrix (@RequirePermission).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredPermission = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const user = context.switchToHttp().getRequest().user;

    if (requiredRoles && requiredRoles.length > 0) {
      if (!user || !requiredRoles.includes(user.role)) {
        throw new ForbiddenException('Insufficient role for this operation');
      }
    }

    if (requiredPermission) {
      if (!user) throw new ForbiddenException('Authentication required');
      if (['SUPER_ADMIN', 'FIRM_PARTNER', 'FIRM_ADMIN'].includes(user.role)) {
        return true;
      }
      if (this.dataSource && user.tenantId && user.id) {
        const rows = await this.dataSource.query(
          `SELECT pr.permissions
           FROM users u
           JOIN permission_roles pr ON pr.id = u.permission_role_id
           WHERE u.id = $1 AND u.tenant_id = $2 AND pr.is_active = true
           LIMIT 1`,
          [user.id, user.tenantId],
        );
        const perms = rows[0]?.permissions;
        if (perms && perms[requiredPermission] === true) {
          return true;
        }
      }
      throw new ForbiddenException(`Missing permission: ${requiredPermission}`);
    }

    return true;
  }
}
