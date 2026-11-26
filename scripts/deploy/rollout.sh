#!/usr/bin/env bash
set -euo pipefail

# Antigravity Books - Zero-Downtime Production Rollout Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${ROOT_DIR}"

IMAGE_TAG="${1:-latest}"
COMPOSE_FILE="docker/docker-compose.prod.yml"

echo "=== 🚀 Initiating Zero-Downtime Rollout (Tag: ${IMAGE_TAG}) ==="

# 1. Verify environment
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production file not found."
    exit 1
fi

# 2. Build or Pull Updated Images
echo "📦 Building/Pulling updated container images..."
docker compose -f "${COMPOSE_FILE}" build api web worker

# 3. Execute Migrations Prior to Container Replacement
echo "🔄 Running database migrations in isolated container..."
if ! docker compose -f "${COMPOSE_FILE}" run --rm --no-deps api node apps/api/dist/src/database/migration-runner.js; then
    echo "❌ Migration failed! Aborting rollout to protect production stability."
    exit 1
fi

# 4. Perform Rolling Update on Worker, API, then Web
echo "🔄 Replacing worker container..."
docker compose -f "${COMPOSE_FILE}" up -d --no-deps worker

echo "🔄 Performing zero-downtime rolling restart for API..."
docker compose -f "${COMPOSE_FILE}" up -d --no-deps api

# Wait for API Healthcheck
echo "⏳ Verifying API healthcheck..."
MAX_RETRIES=12
RETRY_COUNT=0
API_HEALTHY=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker compose -f "${COMPOSE_FILE}" exec -T api wget -qO- http://localhost:4000/v1/health | grep -q "ok"; then
        API_HEALTHY=1
        break
    fi
    sleep 3
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $API_HEALTHY -ne 1 ]; then
    echo "🚨 Healthcheck failed for API container! Initiating immediate rollback..."
    docker compose -f "${COMPOSE_FILE}" restart api
    exit 1
fi

echo "🔄 Performing rolling restart for Web frontend..."
docker compose -f "${COMPOSE_FILE}" up -d --no-deps web

echo "⏳ Verifying Web healthcheck..."
RETRY_COUNT=0
WEB_HEALTHY=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker compose -f "${COMPOSE_FILE}" exec -T web wget -qO- http://localhost:3000/api/health | grep -q "ok"; then
        WEB_HEALTHY=1
        break
    fi
    sleep 3
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $WEB_HEALTHY -ne 1 ]; then
    echo "🚨 Healthcheck failed for Web container!"
    exit 1
fi

echo "🎉 Zero-downtime rollout completed successfully! Stack is green."
