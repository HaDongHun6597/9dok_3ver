# 9dok_3 인증 아키텍처

## 개요
9dok_3는 자체 인증을 구현하지 않고, auth-system의 인증을 **pass-through** 방식으로 사용합니다.

## 인증 흐름

```
사용자 → 9dok3.lgemart.com → nginx 프록시
                                ↓
                    /auth/* → auth.lgemart.com (인증 처리)
                    /user/* → auth.lgemart.com (사용자 정보)
                    /api/*  → 9dok_3 서버 (비즈니스 로직)
```

## 구현 방식

### 1. 프론트엔드 (public/auth.js)
- 로그인/로그아웃 요청을 `/auth/*` 경로로 전송
- 사용자 정보 요청을 `/user/*` 경로로 전송
- 토큰은 localStorage에 저장

### 2. nginx 프록시
- `/auth/*` 경로는 `auth.lgemart.com`으로 프록시
- `/user/*` 경로는 `auth.lgemart.com`으로 프록시
- `/api/*` 경로는 9dok_3 서버로 전달

### 3. 백엔드 (server.js)
- API 요청에 대해서만 토큰 검증
- 토큰 검증은 auth-system의 `/user/profile` API 호출로 처리
- 자체 JWT 검증 없이 auth-system의 응답을 신뢰

## 장점
1. **단순함**: 인증 로직을 중복 구현하지 않음
2. **일관성**: 모든 앱이 동일한 인증 시스템 사용
3. **유지보수**: auth-system만 관리하면 됨
4. **보안**: 중앙 집중식 보안 정책 적용

## 필요한 설정

### nginx 설정
```nginx
location /auth/ {
    proxy_pass https://auth.lgemart.com/auth/;
}

location /user/ {
    proxy_pass https://auth.lgemart.com/user/;
}
```

### 환경 변수 (.env)
```env
AUTH_SERVER_URL=https://auth.lgemart.com
```

### 미들웨어 (authMiddleware.js)
```javascript
// auth-system에 토큰 검증 위임
async function authenticateToken(req, res, next) {
    const token = extractToken(req);
    
    try {
        // auth-system의 /user/profile 호출
        const user = await authClient.getCurrentUser(token);
        req.user = user;
        next();
    } catch (error) {
        res.status(403).json({ error: '인증 실패' });
    }
}
```

## 주의사항
1. JWT 시크릿 키를 9dok_3에서 직접 사용하지 않음
2. 토큰 발급/갱신은 모두 auth-system에서 처리
3. 9dok_3는 토큰의 유효성만 확인 (auth-system API 호출)

## 배포 체크리스트
- [ ] nginx 프록시 설정 확인
- [ ] auth.lgemart.com 접근 가능 확인
- [ ] CORS 설정 확인
- [ ] 환경 변수 설정 확인