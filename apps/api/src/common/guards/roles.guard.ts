import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@platform/shared-types';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Enforces role requirements declared with {@link Roles}. Registered globally
 * AFTER JwtAuthGuard, so `req.user` is already populated. If a route declares
 * no roles, access is allowed for any authenticated user.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const user = context.switchToHttp().getRequest().user;
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient role for this operation');
    }
    return true;
  }
}
