-- 시간대 확인
USE auth_db;

-- 현재 DB 시간 확인
SELECT 
  NOW() as db_time,
  UTC_TIMESTAMP() as utc_time,
  TIMEDIFF(NOW(), UTC_TIMESTAMP()) as timezone_offset;

-- 세션 상세 확인
SELECT 
  id,
  user_id,
  expires_at,
  created_at,
  NOW() as current_time,
  CASE 
    WHEN expires_at > NOW() THEN '유효'
    ELSE '만료'
  END as status,
  TIMESTAMPDIFF(HOUR, created_at, expires_at) as valid_hours,
  TIMESTAMPDIFF(HOUR, NOW(), expires_at) as remaining_hours
FROM sessions
ORDER BY created_at DESC
LIMIT 5;