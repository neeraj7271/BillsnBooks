# syntax=docker/dockerfile:1.4
# Multi-stage Dockerfile for @platform/web (Node 22 Alpine, Non-Root)

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
RUN apk add --no-cache libc6-compat

# --- Builder Stage ---
FROM base AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY scripts ./scripts
COPY packages ./packages
COPY apps/web ./apps/web

RUN pnpm install --frozen-lockfile
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build web application
RUN pnpm --filter @platform/web build

# --- Production Runner ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache wget

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy root workspace and built files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

ARG VCS_REF=unknown
ARG BUILD_DATE=unknown
ARG VERSION=0.1.0

LABEL org.opencontainers.image.title="Antigravity Books Web" \
      org.opencontainers.image.description="Next.js responsive accounting frontend" \
      org.opencontainers.image.source="https://github.com/antigravity/books" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}"

WORKDIR /app/apps/web
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
