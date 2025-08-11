const mariadb = require('mariadb');

async function testConnection() {
  try {
    console.log('auth_db 연결 테스트 시작...');
    
    const connection = await mariadb.createConnection({
      host: 'idvvbi.com',
      port: 3307,
      user: 'app_user',
      password: 'AppUser2024!@#',
      database: 'auth_db'
    });
    
    console.log('✅ auth_db 연결 성공!');
    
    // 테이블 확인
    const tables = await connection.query('SHOW TABLES');
    console.log('\n📋 auth_db 테이블 목록:');
    tables.forEach(table => {
      console.log(`  - ${Object.values(table)[0]}`);
    });
    
    // users 테이블 데이터 확인
    const users = await connection.query('SELECT * FROM users');
    console.log(`\n👤 users 테이블 레코드 수: ${users.length}`);
    
    if (users.length > 0) {
      console.log('첫 번째 사용자:', {
        employee_id: users[0].employee_id,
        username: users[0].username,
        is_admin: users[0].is_admin
      });
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ 연결 실패:', error.message);
    console.error('에러 상세:', error);
  }
}

testConnection();