# syntax=docker/dockerfile:1.4
# Multi-stage Dockerfile for @platform/api (Node 22 Alpine, Non-Root)

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
RUN apk add --no-cache libc6-compat

# --- Dependencies & Build ---
FROM base AS builder
WORKDIR /app

# Copy root workspace configurations
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy all packages & apps
COPY packages ./packages
COPY apps/api ./apps/api

# Install and build API + dependencies
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @platform/api build
RUN pnpm prune --prod

# --- Production Runner ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install runtime dependencies for healthchecks
RUN apk add --no-cache wget

# Create non-root user and group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Copy built artifacts and production dependencies
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

USER appuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/v1/health || exit 1

ARG VCS_REF=unknown
ARG BUILD_DATE=unknown
ARG VERSION=0.1.0

LABEL org.opencontainers.image.title="Antigravity Books API" \
      org.opencontainers.image.description="Double-entry accounting and GST compliance API engine" \
      org.opencontainers.image.source="https://github.com/antigravity/books" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}"

CMD ["node", "apps/api/dist/src/main"]
