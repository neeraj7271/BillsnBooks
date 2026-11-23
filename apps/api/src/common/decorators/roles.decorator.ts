import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@platform/shared-types';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to the given roles. Routes without this decorator are
 * open to any authenticated user. Enforced by {@link RolesGuard}.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
