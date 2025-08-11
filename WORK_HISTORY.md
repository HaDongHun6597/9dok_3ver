# 구독간편조회 프로젝트 작업 내역

## 프로젝트 개요
- **목표**: AppSheet 구독간편조회 앱을 웹 애플리케이션으로 전환
- **기술스택**: Node.js, Express, MariaDB, HTML/CSS/JavaScript
- **데이터베이스**: MariaDB (idvvbi.com:3307)
- **포트**: 3008
- **인증**: LGEmart SSO 통합 인증 시스템 (JWT 기반)

## 데이터베이스 구조

### 1. subscriptions (구독 데이터)
- 이메일, 휴대전화, 채널, 구독 상태 등
- 20,377개 제품 레코드

### 2. model_images (모델별 이미지)
- 모델명, 이미지 URL, 설명 등
- 2,267개 이미지 데이터

### 3. partner_cards (제휴카드)
- 카드명, 사용금액, 혜택, 프로모션 정보 등
- 컬럼 타입: VARCHAR(100)으로 수정 완료

## 주요 기능

### 1. 채널별 구독 간편조회
- 이마트, 홈플러스, 전자랜드 채널별 페이지
- 7단계 제품 선택 프로세스
- 실시간 가격 계산 및 혜택 표시

### 2. 관리자 페이지 (/admin)
- CSV 파일 업로드 기능
  - 구독 데이터 업로드
  - 이미지 데이터 업로드  
  - 카드 데이터 업로드
- 데이터 다운로드 기능 (CSV 형식)
- JWT 기반 관리자 권한 확인

### 3. SSO 인증 시스템
- LGEmart 통합 인증 서버 연동 (auth.lgemart.com)
- JWT 기반 토큰 인증
- 자동 로그인 및 토큰 갱신
- 모든 API 엔드포인트 인증 필수

## API 엔드포인트

### 인증 API
- POST `/auth/login` - 로그인
- POST `/auth/logout` - 로그아웃
- POST `/auth/refresh` - 토큰 갱신
- GET `/auth/me` - 사용자 정보 조회

### 제품 API
- GET `/api/products` - 제품 목록
- GET `/api/categories` - 카테고리 목록
- GET `/api/products/find-exact` - 정확 검색
- GET `/api/product-options/:field` - 옵션 조회
- GET `/api/partner-cards` - 제휴카드 목록

### 관리자 API
- POST `/api/admin/upload/subscription` - 구독 데이터 업로드
- POST `/api/admin/upload/images` - 이미지 데이터 업로드
- POST `/api/admin/upload/cards` - 카드 데이터 업로드
- GET `/api/admin/download/:type` - 데이터 다운로드

## 최근 작업 내역 (2025-08-11)

### 오늘 수정 사항
1. **partner_cards 테이블 컬럼 타입 수정**
   - 혜택, 기본혜택, 프로모션혜택: INT → VARCHAR(100)
   - Data truncated 오류 해결

2. **프로젝트 정리**
   - 불필요한 파일 삭제
   - 작업 내역 문서 통합
   - 일회성 스크립트 파일 제거

3. **활성화 필드 처리 로직 수정**
   - 홈플러스/전자랜드 채널에서 활성화 필드 빈 값("")이 1로 저장되는 문제 해결
   - CSV 업로드 시 활성화 필드의 빈 값을 0으로 처리하도록 수정 (server.js:627-630)
   - 모델명 정렬 시 활성화 값 조건 개선 (server.js:267)

### 이전 작업 내역

#### UI/UX 개선
- 달무리 폰트 적용 (타이틀, 버튼)
- E-mart 스타일 디자인 적용
- 반응형 레이아웃 구현
- 모달 스크롤바 커스터마이징

#### 기능 개선
- 7단계 제품 선택 프로세스 구현
- 실시간 가격 계산기
- 제휴카드 혜택 자동 계산
- 선납금액 표시 기능
- 추가혜택 토글 기능

#### 인증 시스템
- JWT 기반 SSO 통합
- 자동 로그인 처리
- 토큰 자동 갱신
- 관리자 권한 확인

## 파일 구조
```
9dok_3/
├── server.js              # Express 서버
├── package.json           # 프로젝트 설정
├── docker-compose.yml     # Docker 설정
├── WORK_HISTORY.md        # 작업 내역 (이 파일)
├── SSO_INTEGRATION_GUIDE.md  # SSO 연동 가이드
├── auth/                  # 인증 모듈
│   ├── authMiddleware.js
│   └── authRoutes.js
├── config/                # 설정 파일
│   └── database.js
├── public/                # 정적 파일
│   ├── auth.js           # 인증 클라이언트
│   ├── channel-select.html  # 채널 선택 페이지
│   ├── style.css         # 전역 스타일
│   ├── script.js         # 메인 스크립트
│   ├── product-modal.js  # 모달 스크립트
│   ├── admin/            # 관리자 페이지
│   ├── em/               # 이마트 페이지
│   ├── hp/               # 홈플러스 페이지
│   ├── et/               # 전자랜드 페이지
│   └── fonts/            # 웹폰트
├── scripts/               # 유틸리티 스크립트
└── uploads/               # 업로드 임시 파일

```

## 환경 변수
```
DB_HOST=idvvbi.com
DB_PORT=3307
DB_USER=app_user
DB_PASSWORD=AppUser2024!@#
DB_NAME=subscription_db
JWT_SECRET=synology-auth-secret-key
AUTH_SERVER_URL=http://auth.lgemart.com
PORT=3008
```

## 접속 정보
- **웹 서버**: http://localhost:3008
- **관리자 페이지**: http://localhost:3008/admin
- **인증 서버**: http://auth.lgemart.com

## 개발자
- 하동훈 (KTcs)
- Claude Code Assistant
- Gemini Code Assistant

---
*최종 업데이트: 2025-08-11*