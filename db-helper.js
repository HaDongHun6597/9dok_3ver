const mariadb = require('mariadb');

// 데이터베이스 연결 헬퍼
async function getConnection() {
  try {
    // 비밀번호 문자열을 명확히 처리
    const password = process.env.DB_PASSWORD || 'AppUser2024!@#';
    
    const conn = await mariadb.createConnection({
      host: process.env.DB_HOST || 'idvvbi.com',
      port: parseInt(process.env.DB_PORT || 3307),
      user: process.env.DB_USER || 'app_user',
      password: password,
      database: process.env.DB_NAME || 'subscription_db',
      connectTimeout: 20000,
      trace: true  // 디버깅을 위한 추가
    });
    
    console.log('Database connection successful via db-helper');
    return conn;
  } catch (err) {
    console.error('Database connection error in db-helper:', err.message);
    console.error('Connection details:', {
      host: process.env.DB_HOST || 'idvvbi.com',
      port: process.env.DB_PORT || 3307,
      user: process.env.DB_USER || 'app_user',
      database: process.env.DB_NAME || 'subscription_db'
    });
    throw err;
  }
}

module.exports = { getConnection };