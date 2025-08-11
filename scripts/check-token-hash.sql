-- 최근 세션의 token_hash 확인
USE auth_db;

SELECT 
  id,
  user_id,
  LEFT(token_hash, 20) as token_hash_prefix,
  expires_at,
  is_active,
  created_at
FROM sessions 
WHERE user_id = 4
ORDER BY id DESC 
LIMIT 5;