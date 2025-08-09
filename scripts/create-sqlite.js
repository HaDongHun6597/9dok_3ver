const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const csv = require('csv-parser');

// SQLite 데이터베이스 생성
const db = new sqlite3.Database('./products.db');

db.serialize(() => {
  // 테이블 생성
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name TEXT,
    combination_type TEXT,
    contract_period TEXT,
    monthly_fee TEXT,
    product_group TEXT,
    price TEXT,
    discount_amount TEXT
  )`);

  console.log('CSV 파일에서 데이터 읽는 중...');
  
  let rowCount = 0;
  const products = [];
  
  // CSV 파일 읽기
  fs.createReadStream('구독간편조회_이마트2 - 이마트raw.csv')
    .pipe(csv())
    .on('data', (row) => {
      // 필요한 데이터만 추출
      products.push([
        row['모델명'] || '',
        row['결합유형'] || '',
        row['계약기간'] || '',
        row['월요금'] || '',
        row['제품군'] || '',
        row['요금'] || '',
        row['할인금액'] || ''
      ]);
      
      rowCount++;
      if (rowCount % 1000 === 0) {
        console.log(`${rowCount}개 행 읽음...`);
      }
    })
    .on('end', () => {
      console.log(`총 ${rowCount}개 데이터 읽기 완료. SQLite에 삽입 중...`);
      
      // 배치 삽입
      const stmt = db.prepare(`INSERT INTO products (
        model_name, combination_type, contract_period, 
        monthly_fee, product_group, price, discount_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      
      products.forEach((product, index) => {
        stmt.run(product);
        if ((index + 1) % 1000 === 0) {
          console.log(`${index + 1}/${products.length} 삽입 완료...`);
        }
      });
      
      stmt.finalize();
      
      console.log(`총 ${products.length}개 제품 데이터 SQLite 임포트 완료!`);
      db.close();
    });
});