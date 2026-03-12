# PaySplit - Smart Bill Splitting Service

[![CI](https://github.com/JonPark0/paysplit/actions/workflows/ci.yml/badge.svg)](https://github.com/JonPark0/paysplit/actions/workflows/ci.yml)

PaySplit은 영수증 기반 더치페이 계산을 위한 웹 애플리케이션입니다.

- 방 생성/참여 기반 협업 정산
- OCR 기반 영수증 항목 추출
- 항목별/균등/수동 분할
- 정산 진행 상태 및 활동 로그 관리
- PWA 지원

## Tech Stack

- Frontend: React + Vite + TypeScript + PWA
- Backend: Node.js 24 + Express
- Database: PostgreSQL 18
- Infra: Docker + Docker Compose
- OCR: Gemini API, OLLAMA, Mindlogic Gateway (Tesseract fallback)

## Quick Start

### 1) Clone

```bash
git clone <repository-url>
cd paysplit
```

### 2) Environment

```bash
cp .env.example .env
```

최소 필수 설정값:

- `JWT_SECRET`
- `ENCRYPTION_KEY` (32자 이상)
- `POSTGRES_PASSWORD`

OCR까지 사용하려면 추가 설정:

- Gemini 사용: `OCR_PROVIDER=gemini`, `GEMINI_API_KEY`
- OLLAMA 사용: `OCR_PROVIDER=ollama`, `OLLAMA_URL`, `OLLAMA_MODEL`
- Mindlogic Gateway 사용:
  - OpenAI 호환: `OCR_PROVIDER=mindlogic`, `MINDLOGIC_API_FORMAT=openai`, `MINDLOGIC_API_KEY`, `MINDLOGIC_MODEL`
  - Anthropic Messages: `OCR_PROVIDER=mindlogic`, `MINDLOGIC_API_FORMAT=anthropic`, `MINDLOGIC_API_KEY`, `MINDLOGIC_MODEL`

### 3) Run (Docker)

```bash
docker compose up -d --build
```

접속 주소:

- Frontend: `http://localhost:8081`
- Backend: `http://localhost:3002`
- Health: `http://localhost:3002/api/health`

중지:

```bash
docker compose down
```

## Development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

검증:

```bash
npm run typecheck
npm run build
```

### Backend

```bash
cd backend
npm install
npm run dev
```

검증:

```bash
npm run typecheck
npm run build
```

## Operational Checks

스택 기동 후 권장 점검:

```bash
docker compose ps
curl -fsS http://localhost:3002/api/health
curl -fsS http://localhost:8081
```

OCR 헬스:

```bash
curl -sS -o /tmp/ocr-health.out -w "%{http_code}" http://localhost:3002/api/ollama/health
```

- `200`: OCR provider 정상
- `503`: OCR provider 미설정 또는 연결 실패 (핵심 서비스는 동작 가능)

통합 스모크 테스트:

```bash
./scripts/smoke-compose.sh
```

- 프론트/백엔드 컨테이너 빌드 및 기동
- Backend `/api/health`, Frontend `/` 응답 확인
- OCR health 상태코드(`200` 또는 `503`) 확인

## Security and Reliability Notes

- Room access는 DB 세션 매핑 기반으로 검증됩니다.
- API/업로드 rate limiting이 적용됩니다.
- 프로덕션에서 reCAPTCHA 누락 요청은 차단됩니다.
- 파일 암호화는 AES-256-GCM 기반으로 동작합니다.
- 서버는 필수 환경변수 누락 시 시작되지 않습니다.

## Deployment Guide

운영 배포 상세 절차/체크리스트는 `docs/DEPLOYMENT.md`를 참고하세요.

## Project Structure

```text
paysplit/
├── frontend/
├── backend/
├── uploads/
├── docker-compose.yml
├── .env.example
└── docs/
    └── DEPLOYMENT.md
```
