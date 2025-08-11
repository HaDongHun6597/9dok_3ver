-- created_by 컬럼 추가
USE auth_db;

ALTER TABLE users ADD COLUMN created_by INT(11) DEFAULT NULL COMMENT '등록자 ID';

-- 외래키 제약조건 추가 (옵션)
ALTER TABLE users ADD CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- 확인
DESCRIBE users;