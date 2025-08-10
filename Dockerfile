# Node.js 18 Alpine 이미지 사용 (가벼운 Linux 배포판)
FROM node:18-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일 복사 및 의존성 설치
COPY package*.json ./
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# 포트 3000 노출
EXPOSE 3000

# 애플리케이션 실행
CMD ["node", "server.js"]