import { UnauthorizedException } from '@nestjs/common';

export interface RequestContext {
  tenantId: string;
  userId: string;
  role: string;
}

/**
 * Resolves the authenticated request context strictly from the JWT-populated
 * `req.user` set by {@link JwtAuthGuard}. There are intentionally NO fallbacks
 * to request headers (`x-tenant-id`, `x-user-id`) or hard-coded default UUIDs:
 * identity must come from a verified access token, never from client-supplied
 * headers. Cross-tenant impersonation is handled centrally by
 * {@link TenantContextInterceptor}, which validates the `x-tenant-id` override
 * against the caller's role before the handler runs.
 */
export function requireContext(req: any): RequestContext {
  const user = req?.user;
  if (!user || !user.tenantId || !user.id) {
    throw new UnauthorizedException('Authenticated user context is missing');
  }
  // An interceptor may have resolved an authorised tenant override.
  const tenantId = req.tenantId || user.tenantId;
  return { tenantId, userId: user.id, role: user.role };
}
