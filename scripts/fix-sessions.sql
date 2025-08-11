-- 세션 시간 수정 (임시)
USE auth_db;

-- 모든 세션을 현재 시간 기준으로 1시간 연장
UPDATE sessions 
SET 
  expires_at = DATE_ADD(NOW(), INTERVAL 1 HOUR),
  refresh_expires_at = DATE_ADD(NOW(), INTERVAL 7 DAY)
WHERE user_id IN (SELECT id FROM users WHERE employee_id = '1017701');

-- 확인
SELECT 
  id,
  expires_at,
  NOW() as current_time,
  CASE WHEN expires_at > NOW() THEN '유효' ELSE '만료' END as status
FROM sessions
WHERE user_id IN (SELECT id FROM users WHERE employee_id = '1017701')
ORDER BY id DESC
LIMIT 5;