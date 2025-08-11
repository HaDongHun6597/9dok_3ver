const mariadb = require('mariadb');

async function testConnection() {
  const pool = mariadb.createPool({
    host: 'idvvbi.com',
    port: 3307,
    user: 'app_user',
    password: 'AppUser2024!@#',
    database: 'subscription_db',
    connectionLimit: 1,
    connectTimeout: 5000
  });

  try {
    console.log('데이터베이스 연결 테스트 시작...');
    const conn = await pool.getConnection();
    console.log('✅ 연결 성공!');
    
    // 테이블 목록 확인
    const tables = await conn.query('SHOW TABLES');
    console.log('테이블 목록:', tables);
    
    // products 테이블 구조 확인
    const columns = await conn.query('SHOW COLUMNS FROM products');
    console.log('\nproducts 테이블 컬럼:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });
    
    // channel 컬럼이 있는지 확인
    const hasChannel = columns.some(col => col.Field === 'channel');
    console.log(`\nchannel 컬럼 존재: ${hasChannel}`);
    
    // 제품군 조회 테스트
    if (hasChannel) {
      const categories = await conn.query("SELECT DISTINCT 제품군 FROM products WHERE channel = 'em' ORDER BY 제품군");
      console.log('\n이마트 제품군:', categories.map(c => c.제품군));
    } else {
      const categories = await conn.query("SELECT DISTINCT 제품군 FROM products ORDER BY 제품군");
      console.log('\n전체 제품군:', categories.map(c => c.제품군));
    }
    
    await conn.release();
    await pool.end();
    console.log('\n✅ 테스트 완료!');
  } catch (err) {
    console.error('❌ 데이터베이스 연결 실패:', err.message);
    console.error('에러 코드:', err.code);
    console.error('SQL State:', err.sqlState);
    await pool.end();
  }
}

testConnection();