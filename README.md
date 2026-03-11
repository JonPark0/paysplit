# PaySplit - 더치페이 계산 서비스

PaySplit은 더치페이 계산을 편리하게 해주는 웹 애플리케이션입니다.

## 주요 기능

- 📱 **반응형 디자인**: 데스크탑 및 모바일 지원
- 🌐 **다국어 지원**: 한국어, 영어
- 📷 **OCR 지원**: 영수증 자동 인식
- 💰 **스마트 분할**: 다양한 분할 방식 지원
- 🔐 **보안**: 파일 암호화 및 사용자 인증
- 📱 **PWA**: 모바일 앱 수준의 경험

## 기술 스택

- **Frontend**: React + Vite + PWA
- **Backend**: Node.js + Express
- **Database**: PostgreSQL 18
- **Infrastructure**: Docker + Docker Compose
- **OCR**: Tesseract.js

## 시작하기

### 요구사항

- Docker & Docker Compose
- Node.js 24+ (개발 환경)

### 설치 및 실행

1. 저장소 클론
```bash
git clone <repository-url>
cd paysplit
```

2. 환경 변수 설정
```bash
cp .env.example .env
# .env 파일을 편집하여 필요한 설정 입력
```

3. 컨테이너 빌드 및 실행
```bash
docker-compose up --build
```

4. 브라우저에서 접속
- Frontend: http://localhost:8081
- Backend API: http://localhost:3002

## 개발 환경 설정

### Frontend 개발
```bash
cd frontend
npm install
npm run dev
```

### Backend 개발
```bash
cd backend
npm install
npm run dev
```

## 프로젝트 구조

```
paysplit/
├── frontend/          # React 프론트엔드
├── backend/           # Node.js 백엔드
├── docker-compose.yml # PostgreSQL 포함 Docker 구성
├── uploads/           # 암호화된 파일 저장소
├── nginx/             # Nginx 설정
└── README.md
```

## 라이선스

이 프로젝트는 MIT 라이선스 하에 제공됩니다.

## 기여

버그 리포트나 기능 요청은 GitHub Issues를 통해 제출해 주세요.
