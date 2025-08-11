-- ==========================================
-- Auth System 테이블을 subscription_db로 마이그레이션
-- 실행: idvvbi.com:3307의 subscription_db에서 실행
-- ==========================================

USE subscription_db;

-- 기존 users 테이블 백업 (충돌 방지)
RENAME TABLE IF EXISTS users TO users_backup_old;

-- ==========================================
-- 인증 시스템 테이블 생성
-- ==========================================

-- 사용자 테이블 (auth_users로 생성하여 기존 테이블과 구분)
CREATE TABLE IF NOT EXISTS `auth_users` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='통합 인증 사용자 테이블';

-- 앱 등록 테이블
CREATE TABLE IF NOT EXISTS `auth_apps` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 세션/토큰 관리 테이블
CREATE TABLE IF NOT EXISTS `auth_sessions` (
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
  FOREIGN KEY (`user_id`) REFERENCES `auth_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 로그인 이력 테이블
CREATE TABLE IF NOT EXISTS `auth_login_history` (
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
  FOREIGN KEY (`user_id`) REFERENCES `auth_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 초기 데이터 삽입
-- ==========================================

-- 기본 관리자 계정 (사번: 1017701, 비밀번호: 1017701aA!@)
INSERT INTO `auth_users` (`employee_id`, `password`, `username`, `branch`, `is_admin`, `is_active`) VALUES
('1017701', '$2b$12$kWGysNRRAuEp0k2VZDznD.KgjwD3w4J3h4UQZzHEVA2XQ3bD9UGGC', '하동훈', 'Staff', 1, 1)
ON DUPLICATE KEY UPDATE `username` = VALUES(`username`);

-- 기본 앱 등록 (9dok3)
INSERT INTO `auth_apps` (`app_name`, `app_key`, `app_secret`, `redirect_urls`, `allowed_domains`, `description`) VALUES
('9dok3 구독 간편조회', '9dok3_app_key_2024', SHA2('9dok3_secret_key_2024_very_secure', 256), 
'https://9dok3.lgemart.com/auth/callback,http://localhost:9074/auth/callback', 
'9dok3.lgemart.com,localhost', 
'구독 서비스 간편 조회 앱')
ON DUPLICATE KEY UPDATE `app_name` = VALUES(`app_name`);

COMMIT;