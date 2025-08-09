const fs = require('fs');
const csv = require('csv-parser');

// CSV 파일 읽고 처리
const results = [];
let headerProcessed = false;

fs.createReadStream('구독간편조회_이마트2 - 이마트raw.csv')
  .pipe(csv())
  .on('data', (data) => {
    // 필요한 컬럼만 선택
    const row = {
      model_name: data['모델명'] || '',
      combination_type: data['결합유형'] || '',
      contract_period: data['계약기간'] || '',
      monthly_fee: data['월요금'] || '',
      product_group: data['제품군'] || '',
      price: data['요금'] || '',
      discount_amount: data['할인금액'] || ''
    };
    results.push(row);
  })
  .on('end', () => {
    // 새로운 CSV 파일 생성
    const header = 'model_name,combination_type,contract_period,monthly_fee,product_group,price,discount_amount\n';
    const csvContent = header + results.map(row => 
      `"${row.model_name}","${row.combination_type}","${row.contract_period}","${row.monthly_fee}","${row.product_group}","${row.price}","${row.discount_amount}"`
    ).join('\n');
    
    fs.writeFileSync('products_simple.csv', csvContent);
    console.log(`${results.length}개 행이 처리되어 products_simple.csv로 저장되었습니다.`);
  });