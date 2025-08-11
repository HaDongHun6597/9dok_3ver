-- auth_db 사용자 비밀번호 수정
USE auth_db;

-- 모든 사용자 삭제 후 다시 생성
TRUNCATE TABLE users;

-- 관리자 계정 (사번: 1017701, 비밀번호: 1017701aA!@)
INSERT INTO users (employee_id, password, username, branch, is_admin, is_active) VALUES
('1017701', '$2b$12$x0ZR7xn3VUaFcWDjys0qheyd1SzzyecMLrdbVdCRBUFmJk6M/sU52', '하동훈', 'Staff', 1, 1);

-- 테스트 계정 (사번: test123, 비밀번호: test123!)
INSERT INTO users (employee_id, password, username, branch, is_admin, is_active) VALUES
('test123', '$2b$12$dCe0U.ZBaP73WVR0m/QpdexBlx5lAx.OUPfoIgi51VxXuSe8tuCum', '테스트', '테스트지점', 0, 1);

-- 간단한 비밀번호 계정 (사번: 123456, 비밀번호: 123456789)
INSERT INTO users (employee_id, password, username, branch, is_admin, is_active) VALUES
('123456', '$2b$12$nhzQS7Mu9Kp7gRKqehpL..tsobOsLh9PpXxiLN7vncuqNIV.9SVOu', '간단테스트', '테스트', 0, 1);

-- 확인
SELECT employee_id, username, branch, is_admin FROM users;