-- auth_db 세션 확인
USE auth_db;

-- 현재 세션 확인
SELECT 
  s.id,
  s.user_id,
  u.username,
  u.employee_id,
  s.is_active,
  s.expires_at,
  s.created_at,
  CASE 
    WHEN s.expires_at > NOW() THEN '유효'
    ELSE '만료'
  END as status
FROM sessions s
JOIN users u ON s.user_id = u.id
ORDER BY s.created_at DESC
LIMIT 10;

-- 활성 세션 수
SELECT COUNT(*) as active_sessions 
FROM sessions 
WHERE is_active = 1 AND expires_at > NOW();

-- 로그인 이력 확인
SELECT 
  lh.id,
  u.username,
  u.employee_id,
  lh.login_type,
  lh.success,
  lh.failure_reason,
  lh.created_at
FROM login_history lh
JOIN users u ON lh.user_id = u.id
ORDER BY lh.created_at DESC
LIMIT 10;