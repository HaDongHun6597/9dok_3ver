# 작업 내역 - 2025-08-11

## 해결된 문제
MariaDB 연결 실패 문제 해결

## 원인
Connection pool 설정이 부적절했음
- `connectionLimit: 5` → 너무 많은 동시 연결 시도
- `acquireTimeout: 30000` → 과도한 대기 시간
- `connectTimeout: 20000` → 너무 긴 연결 시도 시간

## 해결 방법
`server.js`의 pool 설정을 `test-db.js`와 동일하게 수정:
```javascript
const pool = mariadb.createPool({
  host: 'idvvbi.com',
  port: 3307,
  user: 'app_user',
  password: 'AppUser2024!@#',
  database: 'subscription_db',
  connectionLimit: 1,  // 단일 연결로 제한
  connectTimeout: 5000  // 5초로 단축
});
```

## 핵심 변경사항
1. **connectionLimit: 1** - 동시 연결을 1개로 제한하여 안정성 확보
2. **acquireTimeout 제거** - 불필요한 대기 시간 제거
3. **connectTimeout: 5000** - 빠른 실패/재시도를 위해 타임아웃 단축

## 결과
- DB 연결 성공
- 서버 정상 작동