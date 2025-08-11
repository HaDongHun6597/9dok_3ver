-- 누락된 모든 컬럼 한 번에 추가
USE auth_db;

-- created_by 컬럼 (이미 있으면 무시)
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by INT(11) DEFAULT NULL COMMENT '등록자 ID';

-- must_change_password 컬럼 (이미 있으면 무시)
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password TINYINT(1) DEFAULT 1 COMMENT '비밀번호 변경 필요';

-- company, team, distribution, user_channel, position 컬럼들 (이미 있으면 무시)
ALTER TABLE users ADD COLUMN IF NOT EXISTS company VARCHAR(100) DEFAULT NULL COMMENT '회사';
ALTER TABLE users ADD COLUMN IF NOT EXISTS team VARCHAR(100) DEFAULT NULL COMMENT '팀';
ALTER TABLE users ADD COLUMN IF NOT EXISTS distribution VARCHAR(100) DEFAULT NULL COMMENT '유통';
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_channel VARCHAR(100) DEFAULT NULL COMMENT '채널';
ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(100) DEFAULT NULL COMMENT '직책';

-- 확인
DESCRIBE users;