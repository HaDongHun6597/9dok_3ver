-- must_change_password 컬럼 추가
USE auth_db;

ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) DEFAULT 1 COMMENT '비밀번호 변경 필요 여부';

-- 확인
DESCRIBE users;