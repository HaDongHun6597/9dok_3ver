-- auth_db의 사용자 비밀번호 업데이트
USE auth_db;

-- 기존 사용자 삭제 (있으면)
DELETE FROM users WHERE employee_id = '1017701';

-- 새로운 비밀번호로 사용자 추가
-- 사번: 1017701, 비밀번호: 1017701aA!@
INSERT INTO users (employee_id, password, username, branch, is_admin, is_active) VALUES
('1017701', '$2b$12$kWGysNRRAuEp0k2VZDznD.KgjwD3w4J3h4UQZzHEVA2XQ3bD9UGGC', '하동훈', 'Staff', 1, 1);

-- 테스트용 일반 사용자 추가
-- 사번: test123, 비밀번호: test123!
INSERT INTO users (employee_id, password, username, branch, is_admin, is_active) VALUES
('test123', '$2b$12$YrHJaEV4kJW0iZfHJvGZo.syiFLjH8NU.p9kKScSRBLSlAaPqKXm.', '테스트', '테스트지점', 0, 1)
ON DUPLICATE KEY UPDATE password = VALUES(password);

-- 확인
SELECT employee_id, username, is_admin FROM users;