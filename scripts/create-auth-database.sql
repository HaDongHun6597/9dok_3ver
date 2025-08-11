-- ==========================================
-- 인증 전용 데이터베이스 생성
-- 실행: idvvbi.com:3307에 root로 접속하여 실행
-- ==========================================

-- 인증 전용 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS `auth_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 데이터베이스 선택
USE auth_db;

-- ==========================================
-- 인증 시스템 테이블 생성
-- ==========================================

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '사번',
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '실명',
  `branch` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '지점명',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '연락처',
  `profile_image` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `is_admin` tinyint(1) DEFAULT 0,
  `last_login` timestamp NULL DEFAULT NULL,
  `login_attempts` int(11) DEFAULT 0,
  `lockout_until` timestamp NULL DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL COMMENT '등록자 ID',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_id` (`employee_id`),
  KEY `idx_employee_id` (`employee_id`),
  KEY `idx_username` (`username`),
  KEY `idx_branch` (`branch`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 정보 테이블';

-- 앱 등록 테이블
CREATE TABLE IF NOT EXISTS `apps` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `app_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `app_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `app_secret` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `redirect_urls` text COLLATE utf8mb4_unicode_ci,
  `allowed_domains` text COLLATE utf8mb4_unicode_ci,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `app_key` (`app_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='등록된 앱 정보 테이블';

-- 세션/토큰 관리 테이블
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `refresh_token_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` timestamp NOT NULL,
  `refresh_expires_at` timestamp NULL DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_used_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_token_hash` (`token_hash`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 세션 및 토큰 관리 테이블';

-- 로그인 이력 테이블
CREATE TABLE IF NOT EXISTS `login_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `login_type` enum('login', 'logout', 'failed_login', 'token_refresh') COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `success` tinyint(1) DEFAULT 1,
  `failure_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 로그인 이력 테이블';

-- 시스템 설정 테이블
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` text COLLATE utf8mb4_unicode_ci,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='시스템 설정 테이블';

-- ==========================================
-- 초기 데이터 삽입
-- ==========================================

-- 기본 시스템 설정
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES
('max_login_attempts', '5', '최대 로그인 시도 횟수'),
('lockout_time_minutes', '15', '계정 잠금 시간 (분)'),
('jwt_expire_hours', '1', 'JWT 토큰 만료 시간 (시간)'),
('refresh_token_expire_days', '7', '리프레시 토큰 만료 시간 (일)')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- 기본 관리자 계정 (사번: 1017701, 비밀번호: 1017701aA!@)
INSERT INTO `users` (`employee_id`, `password`, `username`, `branch`, `is_admin`, `is_active`) VALUES
('1017701', '$2b$12$kWGysNRRAuEp0k2VZDznD.KgjwD3w4J3h4UQZzHEVA2XQ3bD9UGGC', '하동훈', 'Staff', 1, 1)
ON DUPLICATE KEY UPDATE `username` = VALUES(`username`);

-- 기본 앱 등록 (9dok3)
INSERT INTO `apps` (`app_name`, `app_key`, `app_secret`, `redirect_urls`, `allowed_domains`, `description`) VALUES
('9dok3 구독 간편조회', '9dok3_app_key_2024', SHA2('9dok3_secret_key_2024_very_secure', 256), 
'https://9dok3.lgemart.com/auth/callback,http://localhost:9074/auth/callback', 
'9dok3.lgemart.com,localhost', 
'구독 서비스 간편 조회 앱')
ON DUPLICATE KEY UPDATE `app_name` = VALUES(`app_name`);

-- 사용자 권한 부여
GRANT ALL PRIVILEGES ON auth_db.* TO 'app_user'@'%';
GRANT ALL PRIVILEGES ON subscription_db.* TO 'app_user'@'%';
FLUSH PRIVILEGES;

COMMIT;