const fs = require('fs');
const csv = require('csv-parser');
const mariadb = require('mariadb');

(async () => {
  const pool = mariadb.createPool({
    host: 'idvvbi.com', 
    port: 3307, 
    user: 'app_user', 
    password: 'AppUser2024!@#', 
    database: 'subscription_db', 
    connectionLimit: 10
  });
  const conn = await pool.getConnection();
  
  console.log('기존 products 데이터 삭제...');
  await conn.query('DELETE FROM products');
  console.log('기존 데이터 삭제 완료');
  
  const results = [];
  
  console.log('새로운 CSV 파일 읽기 시작...');
  fs.createReadStream('구독간편조회_이마트2 - 이마트raw.csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log('CSV 파일 읽기 완료, 총 레코드 수:', results.length);
      
      if (results.length === 0) {
        console.log('데이터가 없습니다.');
        conn.release();
        pool.end();
        return;
      }
      
      console.log('데이터베이스에 삽입 시작...');
      let insertCount = 0;
      
      for (const row of results) {
        try {
          await conn.query(`
            INSERT INTO products (
              모델명, 결합유형, 계약기간, 관리유형, 방문주기, 선납, 선납금액, 
              요금, 할인금액, 월요금, 관리유형구분자, 전사혜택, 전사금액, 
              셀인혜택, 셀인금액, 셀인기간, 기타, 구분자, 혜택구분자, 
              날짜, 제품군, 기준가, 활성화
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            row.모델명, row.결합유형, row.계약기간, row.관리유형, row.방문주기, 
            row.선납, row.선납금액, row.요금, row.할인금액, row.월요금, 
            row.관리유형구분자, row.전사혜택, row.전사금액, row.셀인혜택, 
            row.셀인금액, row.셀인기간, row.기타, row.구분자, row.혜택구분자, 
            row.날짜, row.제품군, row.기준가, 
            // 활성화 값: 빈값이면 0, 아니면 원본 숫자값 사용
            row.활성화 || '0'
          ]);
          insertCount++;
          
          if (insertCount % 1000 === 0) {
            console.log(`진행 상황: ${insertCount}/${results.length} 완료`);
          }
        } catch (error) {
          console.error(`행 삽입 실패 (${insertCount + 1}번째):`, error.message);
        }
      }
      
      console.log(`데이터 삽입 완료: ${insertCount}개 레코드`);
      
      // 활성화 상태 확인
      const activeCount = await conn.query('SELECT COUNT(*) as count FROM products WHERE 활성화 = 1');
      const inactiveCount = await conn.query('SELECT COUNT(*) as count FROM products WHERE 활성화 = 0');
      
      console.log(`활성화된 제품: ${activeCount[0].count}개`);
      console.log(`비활성화된 제품: ${inactiveCount[0].count}개`);
      
      conn.release();
      pool.end();
    });
})().catch(console.error);