-- 구독 계산기 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS subscription_db;
USE subscription_db;

-- 제품 정보 테이블 생성
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL COMMENT '모델명',
    combination_type VARCHAR(100) COMMENT '결합유형',
    contract_period VARCHAR(50) COMMENT '계약기간',
    management_type VARCHAR(100) COMMENT '관리유형',
    visit_cycle VARCHAR(50) COMMENT '방문주기',
    prepayment VARCHAR(50) COMMENT '선납',
    prepayment_amount VARCHAR(50) COMMENT '선납금액',
    price VARCHAR(50) COMMENT '요금',
    discount_amount VARCHAR(50) COMMENT '할인금액',
    monthly_fee VARCHAR(50) COMMENT '월요금',
    management_type_id VARCHAR(100) COMMENT '관리유형구분자',
    company_benefit VARCHAR(100) COMMENT '전사혜택',
    company_amount VARCHAR(50) COMMENT '전사금액',
    sell_in_benefit VARCHAR(100) COMMENT '셀인혜택',
    sell_in_amount VARCHAR(50) COMMENT '셀인금액',
    sell_in_period VARCHAR(50) COMMENT '셀인기간',
    etc TEXT COMMENT '기타',
    identifier VARCHAR(255) COMMENT '구분자',
    benefit_identifier VARCHAR(255) COMMENT '혜택구분자',
    date VARCHAR(50) COMMENT '날짜',
    product_group VARCHAR(100) COMMENT '제품군',
    base_price VARCHAR(50) COMMENT '기준가',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;