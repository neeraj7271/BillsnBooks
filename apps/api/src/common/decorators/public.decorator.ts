import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route (or an entire controller) as publicly accessible, bypassing the
 * globally-registered {@link JwtAuthGuard}. Use sparingly: only for endpoints
 * that must work without authentication (login, register, token refresh,
 * health/metrics probes, and tokenised public share links).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
