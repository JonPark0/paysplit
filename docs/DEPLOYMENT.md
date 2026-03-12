# Deployment Guide

이 문서는 PaySplit의 운영 배포 시 필요한 절차와 점검 항목을 정리합니다.

## 1. Prerequisites

- Docker / Docker Compose 설치
- Node.js 24 (로컬 검증용)
- 외부 네트워크 `nginx-proxy-manager_npm-network` 사용 시 사전 생성

```bash
docker network inspect nginx-proxy-manager_npm-network >/dev/null 2>&1 || docker network create nginx-proxy-manager_npm-network
```

## 2. Environment Variables

`.env.example`를 복사해 `.env`를 생성합니다.

필수 항목:

- `JWT_SECRET`
- `ENCRYPTION_KEY` (32자 이상)
- `POSTGRES_PASSWORD`

권장 항목:

- `RECAPTCHA_SECRET_KEY` (운영에서 `RECAPTCHA_REQUIRED=true`인 경우 사실상 필수)
- `CORS_ORIGIN`
- `RATE_LIMIT_WINDOW`, `RATE_LIMIT_MAX`, `UPLOAD_RATE_LIMIT_MAX`

OCR 사용 시:

- `OCR_PROVIDER=gemini` + `GEMINI_API_KEY`
- 또는 `OCR_PROVIDER=ollama` + `OLLAMA_URL`
- 또는 `OCR_PROVIDER=mindlogic` + `MINDLOGIC_API_KEY`

Mindlogic Gateway 사용 시:

- OpenAI 호환 모드
  - `MINDLOGIC_API_FORMAT=openai`
  - `MINDLOGIC_BASE_URL=https://factchat-cloud.mindlogic.ai/v1/gateway`
  - 호출 엔드포인트: `/chat/completions/`
  - 인증: `Authorization: Bearer <API_KEY>`
- Anthropic Messages 모드
  - `MINDLOGIC_API_FORMAT=anthropic`
  - `MINDLOGIC_CLAUDE_BASE_URL=https://factchat-cloud.mindlogic.ai/v1/gateway/claude`
  - 호출 엔드포인트: `/v1/messages/`
  - 인증: `x-api-key`, `anthropic-version`
  - 선택: `MINDLOGIC_ANTHROPIC_BETA` (prompt caching 등)

관련 문서:

- 개요: https://docs.mindlogic.ai/docs/inu/gateway/getting-started/overview#gateway-api
- OpenAI SDK 연동: https://docs.mindlogic.ai/docs/inu/gateway/integrations/openai-sdk#python
- Anthropic Messages API: https://docs.mindlogic.ai/docs/inu/gateway/api-reference/messages-api#anthropic-messages-api

## 3. Build and Start

```bash
docker compose up -d --build
```

## 4. Health Checks

### Compose status

```bash
docker compose ps
```

정상 기준:

- `postgres`: healthy
- `backend`: healthy
- `frontend`: healthy

### API/Frontend

```bash
curl -fsS http://localhost:3002/api/health
curl -fsS http://localhost:8081
```

### OCR (optional)

```bash
curl -sS -o /tmp/ocr-health.out -w "%{http_code}" http://localhost:3002/api/ollama/health
```

- `200`: OCR provider 정상
- `503`: OCR 설정/연결 문제. 정산 핵심 API는 동작 가능

## 5. PostgreSQL Notes

- 서비스는 PostgreSQL 18을 사용합니다.
- 서버 시작 시 마이그레이션이 자동 실행됩니다.
- 로그에서 `Migration ... completed successfully` 확인 가능

## 6. Security Checklist

- [ ] 기본값 시크릿 사용 금지
- [ ] `JWT_SECRET` 충분한 길이 및 무작위성
- [ ] `ENCRYPTION_KEY` 32자 이상
- [ ] 운영에서 `RECAPTCHA_SECRET_KEY` 설정
- [ ] `CORS_ORIGIN` 운영 도메인으로 제한

## 7. Upgrade / Rollback Strategy

### Upgrade

```bash
git pull
docker compose up -d --build
```

### Rollback

```bash
git checkout <previous-commit>
docker compose up -d --build
```

## 8. Shutdown

```bash
docker compose down
```
