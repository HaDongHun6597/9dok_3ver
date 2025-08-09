const mariadb = require('mariadb');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// MariaDB 연결 (database.js와 동일한 설정)
const pool = mariadb.createPool({
  host: '192.168.0.200',
  port: 3307,
  user: 'subscription_user',
  password: 'Subscription123!@#',
  database: 'subscription_db',
  connectionLimit: 10
});

async function importCSV() {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('MariaDB 연결 성공!');
    
    console.log('CSV 파일 임포트 시작...');
    
    let rowCount = 0;
    const products = [];
    
    // CSV 파일 읽기
    await new Promise((resolve, reject) => {
      fs.createReadStream(path.join(__dirname, '../구독간편조회_이마트2 - 이마트raw.csv'))
        .pipe(csv())
        .on('data', (row) => {
          products.push({
            model_name: row['모델명'],
            combination_type: row['결합유형'],
            contract_period: row['계약기간'],
            management_type: row['관리유형'],
            visit_cycle: row['방문주기'],
            prepayment: row['선납'],
            prepayment_amount: row['선납금액'],
            price: row['요금'],
            discount_amount: row['할인금액'],
            monthly_fee: row['월요금'],
            management_type_id: row['관리유형구분자'],
            company_benefit: row['전사혜택'],
            company_amount: row['전사금액'],
            sell_in_benefit: row['셀인혜택'],
            sell_in_amount: row['셀인금액'],
            sell_in_period: row['셀인기간'],
            etc: row['기타'],
            identifier: row['구분자'],
            benefit_identifier: row['혜택구분자'],
            date: row['날짜'],
            product_group: row['제품군'],
            base_price: row['기준가']
          });
          
          rowCount++;
          if (rowCount % 1000 === 0) {
            console.log(`${rowCount}개 행 읽음...`);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`총 ${rowCount}개 데이터 읽기 완료. DB 삽입 시작...`);
    
    // 배치 삽입
    const batchSize = 100;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      
      const query = `INSERT INTO products (
        model_name, combination_type, contract_period, management_type,
        visit_cycle, prepayment, prepayment_amount, price, discount_amount,
        monthly_fee, management_type_id, company_benefit, company_amount,
        sell_in_benefit, sell_in_amount, sell_in_period, etc, identifier,
        benefit_identifier, date, product_group, base_price
      ) VALUES ${batch.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',')}`;
      
      const values = batch.flatMap(product => Object.values(product));
      
      await conn.query(query, values);
      console.log(`${i + batch.length}/${products.length} 삽입 완료...`);
    }
    
    console.log(`총 ${rowCount}개 제품 데이터 임포트 완료!`);
    
  } catch (err) {
    console.error('오류 발생:', err);
  } finally {
    if (conn) conn.release();
    pool.end();
  }
}

importCSV();