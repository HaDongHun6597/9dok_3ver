# 9dok_3 배포 가이드

## 🚨 중요: nginx 프록시 설정 필수

9dok_3는 자체 인증을 하지 않고 auth-system을 사용합니다. 
**반드시 nginx에서 인증 경로를 프록시해야 합니다.**

## nginx 설정 (필수)

`/etc/nginx/sites-available/9dok3.lgemart.com` 파일:

```nginx
server {
    listen 443 ssl;
    server_name 9dok3.lgemart.com;
    
    # SSL 인증서
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # ==========================================
    # 중요: 인증 관련 경로 프록시 (반드시 설정!)
    # ==========================================
    
    # /auth/* → auth.lgemart.com으로 프록시
    location /auth/ {
        proxy_pass https://auth.lgemart.com/auth/;
        proxy_http_version 1.1;
        proxy_set_header Host auth.lgemart.com;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        
        # CORS 헤더 (필요 시)
        add_header 'Access-Control-Allow-Origin' 'https://9dok3.lgemart.com' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
    }
    
    # /user/* → auth.lgemart.com으로 프록시
    location /user/ {
        proxy_pass https://auth.lgemart.com/user/;
        proxy_http_version 1.1;
        proxy_set_header Host auth.lgemart.com;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        
        # CORS 헤더 (필요 시)
        add_header 'Access-Control-Allow-Origin' 'https://9dok3.lgemart.com' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
    }

    # ==========================================
    # 9dok_3 애플리케이션
    # ==========================================
    
    # 나머지 모든 요청은 9dok_3 서버로
    location / {
        proxy_pass http://localhost:9074;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}

# HTTP → HTTPS 리다이렉트
server {
    listen 80;
    server_name 9dok3.lgemart.com;
    return 301 https://$server_name$request_uri;
}
```

## 배포 체크리스트

### 1. nginx 설정 확인
```bash
# 설정 파일 편집
sudo nano /etc/nginx/sites-available/9dok3.lgemart.com

# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/9dok3.lgemart.com /etc/nginx/sites-enabled/

# 설정 테스트
sudo nginx -t

# nginx 재시작
sudo systemctl reload nginx
```

### 2. 프록시 동작 확인
```bash
# /auth/login 프록시 테스트
curl -X POST https://9dok3.lgemart.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"employee_id":"test","password":"test"}'

# 응답이 auth.lgemart.com에서 와야 함
```

### 3. Docker 컨테이너 실행
```bash
cd /path/to/9dok_3
docker-compose up -d --build
```

### 4. 로그 확인
```bash
# 9dok_3 로그
docker logs subscription-app -f

# nginx 에러 로그
sudo tail -f /var/log/nginx/error.log
```

## 문제 해결

### 403 Forbidden 에러
- nginx 프록시 설정 확인
- `/auth/` 및 `/user/` 경로가 auth.lgemart.com으로 프록시되는지 확인

### 토큰 갱신 실패
- `/auth/refresh` 경로가 제대로 프록시되는지 확인
- CORS 헤더 설정 확인

### API 인증 실패
- server.js의 AUTH_SERVER_URL 환경변수 확인
- authMiddleware.js가 auth-system과 통신 가능한지 확인

## 환경 변수 (.env)
```env
NODE_ENV=production
AUTH_SERVER_URL=https://auth.lgemart.com
JWT_SECRET=synology_auth_jwt_secret_key_2024_very_secure
DB_HOST=idvvbi.com
DB_PORT=3307
DB_USER=app_user
DB_PASSWORD=AppUser2024!@#
DB_NAME=subscription_db
```

## 중요 참고사항

1. **9dok_3는 자체 인증을 하지 않습니다**
   - 모든 인증은 auth.lgemart.com에서 처리
   - nginx 프록시 설정이 필수

2. **토큰 검증 방식**
   - 프론트엔드: `/auth/*`, `/user/*` 경로 사용
   - 백엔드: auth.lgemart.com의 `/user/profile` API 호출로 검증

3. **CORS 설정**
   - auth.lgemart.com에서 9dok3.lgemart.com 허용 필요
   - nginx에서도 CORS 헤더 추가 가능