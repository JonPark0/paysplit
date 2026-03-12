#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

COMPOSE_FILES=(
  -f "$ROOT_DIR/docker-compose.yml"
)

if [[ -f "$ROOT_DIR/docker-compose.ci.yml" ]]; then
  COMPOSE_FILES+=( -f "$ROOT_DIR/docker-compose.ci.yml" )
fi

compose() {
  docker compose "${COMPOSE_FILES[@]}" "$@"
}

cleanup() {
  compose down -v --remove-orphans >/dev/null 2>&1 || true
}

wait_for_url() {
  local url="$1"
  local max_attempts="${2:-45}"
  local sleep_seconds="${3:-2}"

  for ((attempt = 1; attempt <= max_attempts; attempt += 1)); do
    if curl -fsS "$url" >/dev/null; then
      return 0
    fi
    sleep "$sleep_seconds"
  done

  return 1
}

trap cleanup EXIT

export POSTGRES_DB="${POSTGRES_DB:-paysplit}"
export POSTGRES_USER="${POSTGRES_USER:-paysplit}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-paysplit}"
export BACKEND_PORT="${BACKEND_PORT:-3002}"
export FRONTEND_PORT="${FRONTEND_PORT:-8081}"
export JWT_SECRET="${JWT_SECRET:-paysplit-smoke-jwt-secret}"
export ENCRYPTION_KEY="${ENCRYPTION_KEY:-0123456789abcdef0123456789abcdef}"
export RECAPTCHA_REQUIRED="${RECAPTCHA_REQUIRED:-false}"
export CORS_ORIGIN="${CORS_ORIGIN:-http://localhost:${FRONTEND_PORT}}"

compose up -d --build

wait_for_url "http://localhost:${BACKEND_PORT}/api/health"
wait_for_url "http://localhost:${FRONTEND_PORT}/"

ocr_status="$(curl -sS -o /dev/null -w '%{http_code}' "http://localhost:${BACKEND_PORT}/api/ollama/health" || true)"
if [[ "$ocr_status" != "200" && "$ocr_status" != "503" ]]; then
  printf 'Unexpected OCR health status: %s\n' "$ocr_status"
  exit 1
fi

printf 'Smoke test passed: backend=%s frontend=%s ocr=%s\n' "OK" "OK" "$ocr_status"
