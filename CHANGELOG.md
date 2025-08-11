# 변경 내역

## 2025-08-12

### 주요 작업 내용

#### 1. 채널별 접근 제한 기능 구현
- **문제**: 사용자가 권한이 없는 채널에 접근 가능했음
- **해결**: 
  - DB의 `user_channel` 필드 기반 접근 제한
  - 클라이언트 사이드에서 채널 버튼 활성/비활성화
  - 채널 페이지 진입 시 권한 체크
- **로직**:
  - `user_channel`이 비어있으면 → 모든 채널 접근 가능
  - `user_channel`이 "이마트" → /em 채널만 접근 가능
  - `user_channel`이 "홈플러스" → /hp 채널만 접근 가능
  - `user_channel`이 "전자랜드" → /et 채널만 접근 가능

#### 2. 인증 시스템 개선
- **토큰 검증 타이밍 문제 해결**:
  - auth-system 서버의 토큰 전파 지연 문제 발견
  - retry 로직 추가 (최대 3회 시도, 200ms 간격)
  - /api/categories 엔드포인트에 적용
  
- **토큰 키 통일**:
  - 모든 시스템에서 `access_token` 키 사용
  - localStorage 키 불일치 문제 해결

- **is_active 필드 누락 문제**:
  - auth-system API 응답에 is_active 필드 없음
  - requireActiveUser 미들웨어에서 403 에러 발생
  - 기본값 true 설정으로 해결

#### 3. auth-system 수정
- **CSV 업로드 기능 개선**:
  - user_channel 필드 처리 누락 문제 수정
  - routes/admin.js: CSV 파싱 시 user_channel 추가
  - models/User.js: create, createBulk, updateProfile 메서드 수정
  - User 클래스 constructor에 user_channel 추가

- **사용자 편집 UI 개선**:
  - 채널 선택 드롭다운 추가 (이마트, 홈플러스, 전자랜드, 코스트코)
  - admin.html, admin.js 수정

#### 4. 코드 리팩토링
- **서버 사이드 채널 검증 제거**:
  - validateChannelAccess 미들웨어 주석 처리
  - 채널 내부 API에서 불필요한 검증 제거
  - 클라이언트 사이드에서만 채널 접근 제한

### 변경된 파일
- `9dok_3/`:
  - `auth/authMiddleware.js`: getCurrentUser 수정, is_active 기본값 추가
  - `public/auth.js`: distribution → user_channel 변경, 채널 접근 제한 로직
  - `server.js`: 채널 검증 미들웨어 제거, retry 로직 추가

- `auth-system/`:
  - `models/User.js`: user_channel 필드 완전 통합
  - `routes/admin.js`: CSV 업로드 시 user_channel 처리
  - `public/admin.html`: 사용자 편집 모달에 채널 선택 추가
  - `public/js/admin.js`: user_channel 필드 처리

### 커밋 내역
1. `beb0ed9` - fix: is_active 필드 누락으로 인한 403 에러 해결
2. `83b085e` - refactor: 서버 사이드 채널 접근 제한 제거
3. `978ecb3` - fix: 채널 내부 API에서 불필요한 채널 검증 제거
4. `3507bb9` - fix: distribution에서 user_channel로 변경
5. `9c4845c` - fix: 채널 접근 제한 - DB의 한글 distribution 값과 매칭
6. `0542cd0` - feat: 채널별 접근 제한 기능 구현
7. `8065165` - fix: 토큰 검증 타이밍 문제 해결 - retry 로직 추가
8. `8fc043f` - fix: 토큰 키 통일 및 채널 페이지 인증 문제 해결

### 테스트 확인 사항
- [x] 로그인 정상 작동
- [x] 채널별 접근 제한 작동
- [x] 제품 옵션 API 정상 작동
- [x] 사용자 편집에서 채널 변경 가능
- [x] CSV 업로드 시 user_channel 저장

### 배포 시 주의사항
1. auth-system 컨테이너 재빌드 필요
2. 9dok_3 컨테이너 재빌드 필요
3. CSV 파일로 사용자 재업로드 필요 (user_channel 값 반영)