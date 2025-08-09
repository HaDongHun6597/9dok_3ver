const mariadb = require('mariadb');

async function testConnection() {
  console.log('MariaDB 연결 테스트 시작...');
  
  const config = {
    host: 'idvvbi.com',
    port: 3307,
    user: 'app_user',
    password: 'AppUser2024!@#',
    database: 'subscription_db',
    timeout: 5000,
    acquireTimeout: 10000,
    connectionLimit: 1
  };
  
  console.log('연결 설정:', {
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database
  });

  let conn;
  try {
    console.log('연결 시도 중...');
    const pool = mariadb.createPool(config);
    conn = await pool.getConnection();
    console.log('✅ 연결 성공!');
    
    console.log('테스트 쿼리 실행...');
    const result = await conn.query('SELECT COUNT(*) as count FROM products LIMIT 1');
    console.log('✅ 쿼리 성공:', result);
    
    pool.end();
    
  } catch (err) {
    console.error('❌ 연결 실패:');
    console.error('에러 코드:', err.code);
    console.error('에러 메시지:', err.message);
    console.error('SQL 상태:', err.sqlState);
    
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 해결방법: 사용자 권한 문제입니다.');
      console.log('- phpMyAdmin에서 사용자 권한을 확인하세요.');
    } else if (err.code === 'ECONNREFUSED') {
      console.log('\n💡 해결방법: 연결이 거부되었습니다.');
      console.log('- MariaDB가 실행 중인지 확인하세요.');
      console.log('- 포트 번호가 정확한지 확인하세요.');
    } else if (err.code === 'ENOTFOUND') {
      console.log('\n💡 해결방법: 호스트를 찾을 수 없습니다.');
      console.log('- IP 주소가 정확한지 확인하세요.');
    }
  } finally {
    if (conn) conn.release();
  }
}

testConnection();