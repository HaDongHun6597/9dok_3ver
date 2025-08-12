# 9dok_3 Subscription System Database Schema Documentation
# 9dok_3 구독 시스템 데이터베이스 구조 문서

## Database Overview
- **Database Name**: subscription_db
- **Character Set**: utf8mb4 (일부 테이블 utf8mb3)
- **Collation**: utf8mb4_unicode_ci / utf8mb3_general_ci
- **Engine**: InnoDB (MariaDB 10.11.6)

---

## Table Structure (테이블 구조)

### 1. products (제품 정보)
구독 가능한 제품 정보를 저장하는 핵심 테이블

| Column | Type | Description | Default | Notes |
|--------|------|-------------|---------|--------|
| id | int(11) | Primary Key | AUTO_INCREMENT | |
| 모델명 | varchar(255) | 제품 모델명 | NULL | |
| 결합유형 | varchar(100) | 결합 상품 유형 | NULL | |
| 계약기간 | varchar(50) | 계약 기간 | NULL | 3년, 4년, 5년 등 |
| 관리유형 | varchar(100) | 관리 서비스 유형 | NULL | |
| 방문주기 | varchar(50) | 방문 서비스 주기 | NULL | |
| 선납 | varchar(50) | 선납 여부 | NULL | |
| 선납금액 | varchar(50) | 선납 금액 | NULL | |
| 요금 | varchar(50) | 기본 요금 | NULL | |
| 할인금액 | varchar(50) | 할인 금액 | NULL | |
| 월요금 | varchar(50) | 월 납부 요금 | NULL | |
| 관리유형구분자 | varchar(100) | 관리 유형 구분 코드 | NULL | |
| 전사혜택 | varchar(100) | 전사 혜택 내용 | NULL | |
| 전사금액 | varchar(50) | 전사 혜택 금액 | NULL | |
| 셀인혜택 | varchar(100) | 셀인 혜택 내용 | NULL | |
| 셀인금액 | varchar(50) | 셀인 혜택 금액 | NULL | |
| 셀인기간 | varchar(50) | 셀인 혜택 기간 | NULL | |
| 기타 | text | 기타 정보 | NULL | |
| 구분자 | varchar(255) | 제품 구분자 | NULL | |
| 혜택구분자 | varchar(255) | 혜택 구분자 | NULL | |
| 날짜 | varchar(50) | 등록/수정 날짜 | NULL | |
| 제품군 | varchar(100) | 제품 카테고리 | NULL | TV, 노트북, 가전 등 |
| 기준가 | varchar(50) | 기준 가격 | NULL | |
| 활성화 | int(11) | 활성화 순위/우선순위 | 1 | 높을수록 우선 표시 |
| channel | varchar(10) | 채널 구분 | 'em' | em, hp, et 등 |

**Indexes:**
- PRIMARY KEY (id)

**Usage Notes:**
- `활성화` 컬럼은 제품 표시 순서를 결정 (높은 값 우선)
- `channel` 컬럼으로 채널별 제품 관리
- 한글 컬럼명 사용 (레거시 시스템 호환)

---

### 2. model_images (모델 이미지)
제품 모델별 이미지 URL 관리

| Column | Type | Description | Default | Notes |
|--------|------|-------------|---------|--------|
| no | int(11) | Primary Key | AUTO_INCREMENT | |
| model_name | varchar(255) | 모델명 | NOT NULL | |
| image_url | text | 이미지 URL | NULL | LG 공식 이미지 |
| etland | varchar(50) | 이트랜드 정보 | NULL | |
| homeplus | varchar(50) | 홈플러스 정보 | NULL | |
| emart | varchar(50) | 이마트 정보 | NULL | |
| created_at | timestamp | 생성일시 | CURRENT_TIMESTAMP | |

**Indexes:**
- PRIMARY KEY (no)

**Sample Data:**
- 노트북: 14Z90T-G.AA50K, 15U50T-G.AA5VK
- TV: 27ART10CMPL.AKR, 43UT9300KS.AKRG
- 이미지는 LG 공식 웹사이트 CDN 사용

---

### 3. partner_cards (제휴 카드)
제휴 카드별 혜택 정보

| Column | Type | Description | Default | Notes |
|--------|------|-------------|---------|--------|
| id | int(11) | Primary Key | AUTO_INCREMENT | |
| 카드 | varchar(50) | 카드명 | NOT NULL | |
| 사용금액 | varchar(100) | 최소 사용 금액 조건 | NULL | |
| 카드혜택 | text | 카드 혜택 상세 | NULL | |
| 혜택 | varchar(100) | 혜택 요약 | NULL | |
| 기본혜택 | varchar(100) | 기본 혜택 | NULL | |
| 프로모션혜택 | varchar(100) | 프로모션 혜택 | NULL | |
| 프로모션개월 | int(11) | 프로모션 기간(월) | NULL | |
| 프로모션기간 | varchar(50) | 프로모션 기간 설명 | NULL | |
| 비고 | text | 추가 설명 | NULL | |
| 3년 | int(11) | 3년 혜택 금액 | NULL | |
| 3년p | int(11) | 3년 프로모션 금액 | NULL | |
| 4년 | int(11) | 4년 혜택 금액 | NULL | |
| 4년p | int(11) | 4년 프로모션 금액 | NULL | |
| 5년 | int(11) | 5년 혜택 금액 | NULL | |
| 5년p | int(11) | 5년 프로모션 금액 | NULL | |
| 6년 | int(11) | 6년 혜택 금액 | NULL | |
| 6년p | int(11) | 6년 프로모션 금액 | NULL | |
| 환급금액 | varchar(50) | 환급 금액 | NULL | |
| 교원 | varchar(50) | 교원 관련 정보 | NULL | |
| created_at | timestamp | 생성일시 | CURRENT_TIMESTAMP | |

**Indexes:**
- PRIMARY KEY (id)

**Usage Notes:**
- 계약 기간별 혜택 금액 관리
- 프로모션 기간 및 금액 별도 관리

---

### 4. subscription_benefits (구독 혜택)
구독 서비스별 혜택 정보

| Column | Type | Description | Default | Notes |
|--------|------|-------------|---------|--------|
| id | int(11) | Primary Key | AUTO_INCREMENT | |
| name | varchar(100) | 혜택명 | NOT NULL | |
| management_type | varchar(50) | 관리 유형 | NULL | |
| search_keyword | varchar(100) | 검색 키워드 | NULL | |
| icon_url | varchar(500) | 아이콘 URL | NULL | |
| vertical_image_url | varchar(500) | 세로 이미지 URL | NULL | |
| horizontal_image_url | varchar(500) | 가로 이미지 URL | NULL | |
| video_url | varchar(500) | 비디오 URL | NULL | |
| html_url | varchar(500) | HTML 콘텐츠 URL | NULL | |
| service_before | text | 서비스 전 상태 | NULL | |
| service_after | text | 서비스 후 상태 | NULL | |
| payment_value | text | 결제 가치 | NULL | |

**Indexes:**
- PRIMARY KEY (id)

**Usage Notes:**
- 다양한 미디어 형식 지원 (이미지, 비디오, HTML)
- Before/After 비교 콘텐츠 제공

---

### 5. product_selection_logs (제품 선택 로그)
사용자의 제품 선택 및 조회 이력

| Column | Type | Description | Default | Notes |
|--------|------|-------------|---------|--------|
| id | int(11) | Primary Key | AUTO_INCREMENT | |
| user_id | varchar(50) | 사용자 ID | NULL | |
| username | varchar(100) | 사용자명 | NULL | |
| employee_id | varchar(50) | 사번 | NULL | |
| branch | varchar(100) | 지점 | NULL | |
| company | varchar(100) | 회사 | NULL | |
| team | varchar(100) | 팀 | NULL | |
| position | varchar(100) | 직책 | NULL | |
| channel | varchar(20) | 채널 | NULL | |
| product_id | varchar(100) | 제품 ID | NULL | |
| product_name | varchar(200) | 제품명 | NULL | |
| product_category | varchar(100) | 제품 카테고리 | NULL | |
| product_price | decimal(10,2) | 제품 가격 | NULL | |
| action_type | varchar(50) | 액션 유형 | NULL | view, select, purchase 등 |
| session_id | varchar(100) | 세션 ID | NULL | |
| ip_address | varchar(50) | IP 주소 | NULL | |
| user_agent | text | 브라우저 정보 | NULL | |
| selection_time | datetime | 선택 시간 | CURRENT_TIMESTAMP | |
| details | text | 상세 정보 | NULL | JSON 형식 가능 |

**Indexes:**
- PRIMARY KEY (id)
- KEY idx_user_id (user_id)
- KEY idx_selection_time (selection_time)

**Usage Notes:**
- 사용자 행동 분석용 상세 로그
- 채널별, 지점별 통계 분석 가능

---

### 6. upload_logs (업로드 로그)
데이터 업로드 이력 관리

| Column | Type | Description | Default | Notes |
|--------|------|-------------|---------|--------|
| id | int(11) | Primary Key | AUTO_INCREMENT | |
| data_type | varchar(50) | 데이터 유형 | NULL | products, cards 등 |
| channel | varchar(20) | 채널 | NULL | |
| record_count | int(11) | 레코드 수 | NULL | |
| upload_time | datetime | 업로드 시간 | CURRENT_TIMESTAMP | |

**Indexes:**
- PRIMARY KEY (id)

**Usage Notes:**
- CSV 파일 업로드 추적
- 데이터 변경 이력 관리

---

## Data Flow (데이터 흐름)

```
1. 제품 데이터 업로드 (CSV)
   └─> upload_logs 기록
   └─> products 테이블 갱신

2. 사용자 제품 조회
   └─> product_selection_logs 기록 (action_type: 'view')
   └─> products + model_images JOIN 조회

3. 제품 선택/구매
   └─> product_selection_logs 기록 (action_type: 'select')
   └─> partner_cards 혜택 계산
   └─> subscription_benefits 표시
```

---

## Channel Management (채널 관리)

### 채널 코드
- `em`: 이마트 (E-Mart)
- `hp`: 홈플러스 (Homeplus) 
- `et`: 이트랜드 (ET Land)

### 채널별 데이터 분리
```sql
-- 이마트 제품 조회
SELECT * FROM products WHERE channel = 'em' AND 활성화 > 0 ORDER BY 활성화 DESC;

-- 채널별 로그 분석
SELECT channel, COUNT(*) as count 
FROM product_selection_logs 
WHERE selection_time >= DATE_SUB(NOW(), INTERVAL 1 DAY)
GROUP BY channel;
```

---

## Query Examples (쿼리 예시)

### 제품 검색 (모델명 + 이미지)
```sql
SELECT 
    p.*,
    mi.image_url
FROM products p
LEFT JOIN model_images mi ON p.모델명 = mi.model_name
WHERE p.channel = 'em' 
  AND p.활성화 > 0
ORDER BY p.활성화 DESC, p.id DESC;
```

### 인기 제품 분석
```sql
SELECT 
    product_name,
    product_category,
    COUNT(*) as view_count,
    COUNT(DISTINCT user_id) as unique_users
FROM product_selection_logs
WHERE action_type = 'view'
  AND selection_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY product_name, product_category
ORDER BY view_count DESC
LIMIT 10;
```

### 카드 혜택 조회
```sql
SELECT 
    카드,
    CASE 
        WHEN '3년' = :contract_period THEN 3년
        WHEN '4년' = :contract_period THEN 4년
        WHEN '5년' = :contract_period THEN 5년
        WHEN '6년' = :contract_period THEN 6년
    END as benefit_amount,
    카드혜택
FROM partner_cards
WHERE 사용금액 <= :purchase_amount;
```

---

## Maintenance Guidelines (유지보수 가이드)

### 새 테이블 추가 시
1. 이 문서에 테이블 구조 추가
2. 컬럼명 규칙:
   - 시스템 필드: 영문 (id, created_at 등)
   - 비즈니스 필드: 한글 가능 (기존 시스템 호환)
3. 인덱스 설계:
   - 조회 빈도가 높은 컬럼
   - 조인에 사용되는 컬럼
4. 문자셋 선택:
   - 일반적으로 utf8mb4 사용
   - 레거시 호환 필요시 utf8mb3

### 데이터 업로드
1. CSV 파일 준비 (UTF-8 인코딩)
2. 업로드 전 백업
3. upload_logs에 기록
4. 활성화 순위 조정

### 성능 최적화
1. **인덱스 관리**
   - product_selection_logs: user_id, selection_time
   - products: channel, 활성화

2. **데이터 정리**
   - 30일 이상 된 로그 아카이빙
   - 비활성 제품 별도 테이블 이동

3. **쿼리 최적화**
   - 채널별 쿼리 분리
   - 활성화 > 0 조건 필수

---

## Security Considerations (보안 고려사항)

1. **개인정보 보호**
   - product_selection_logs의 개인정보 암호화 고려
   - IP 주소 마스킹 (끝자리 0 처리)

2. **접근 제어**
   - 채널별 데이터 접근 권한 분리
   - 로그 조회 권한 제한

3. **데이터 보존**
   - 로그 데이터 90일 보관
   - 제품 변경 이력 1년 보관

---

## Backup & Recovery (백업 및 복구)

### 백업 정책
- 일일 전체 백업 (새벽 2시)
- 시간별 증분 백업 (제품 데이터)
- 주간 원격지 백업

### 복구 절차
```bash
# 전체 복구
mysql -u root -p subscription_db < subscription_db_backup.sql

# 특정 테이블 복구
mysql -u root -p subscription_db < products_backup.sql
```

---

## API Integration Points (API 통합 지점)

### 제품 조회 API
- Endpoint: `/api/products`
- Parameters: channel, category, 활성화

### 로그 기록 API
- Endpoint: `/api/log/selection`
- Method: POST
- Body: user_id, product_id, action_type

### 혜택 계산 API
- Endpoint: `/api/benefits/calculate`
- Parameters: product_id, card_id, period

---

## Version History (버전 이력)

- **v1.0** (2025-08): 초기 구조
  - 6개 핵심 테이블 생성
  - 채널별 데이터 분리 구조

---

## Contact
이 문서에 대한 질문이나 수정 요청은 시스템 관리자에게 문의하세요.

**Last Updated**: 2025-08-12
**Database Version**: MariaDB 10.11.6
**Document Version**: 1.0