const mariadb = require('mariadb');

async function createPartnerCardTable() {
  const pool = mariadb.createPool({
    host: 'idvvbi.com',
    port: 3307,
    user: 'app_user',
    password: 'AppUser2024!@#',
    database: 'subscription_db',
    connectionLimit: 5
  });
  
  try {
    const conn = await pool.getConnection();
    
    // 제휴카드 테이블 생성
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS partner_cards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        카드 VARCHAR(50) NOT NULL,
        사용금액 VARCHAR(100),
        카드혜택 TEXT,
        혜택 INT,
        기본혜택 INT,
        프로모션혜택 INT,
        프로모션개월 INT,
        프로모션기간 VARCHAR(50),
        비고 TEXT,
        \`3년\` INT,
        \`3년p\` INT,
        \`4년\` INT,
        \`4년p\` INT,
        \`5년\` INT,
        \`5년p\` INT,
        \`6년\` INT,
        \`6년p\` INT,
        환급금액 VARCHAR(50),
        교원 VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await conn.query(createTableQuery);
    console.log('제휴카드 테이블 생성 완료');
    
    conn.release();
    await pool.end();
  } catch (error) {
    console.error('에러:', error);
  }
}

createPartnerCardTable();