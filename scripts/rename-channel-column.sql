-- channel 컬럼명을 user_channel로 변경 (MySQL 예약어 충돌 방지)
USE auth_db;

ALTER TABLE users CHANGE COLUMN channel user_channel VARCHAR(100) DEFAULT NULL COMMENT '채널';

-- 확인
DESCRIBE users;