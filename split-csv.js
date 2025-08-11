const fs = require('fs');
const path = require('path');

// CSV 파일을 작은 단위로 분할
function splitCSV() {
  const csvPath = 'D:\\SynologyDrive\\web\\docker\\auth-system\\user.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n');
  
  const header = lines[0]; // 첫 번째 행 (헤더)
  const dataLines = lines.slice(1).filter(line => line.trim()); // 데이터 행들
  
  const chunkSize = 50; // 50개씩 분할
  const chunks = [];
  
  for (let i = 0; i < dataLines.length; i += chunkSize) {
    chunks.push(dataLines.slice(i, i + chunkSize));
  }
  
  console.log(`총 ${dataLines.length}개 데이터를 ${chunks.length}개 파일로 분할합니다.`);
  
  // 분할된 파일들 생성
  chunks.forEach((chunk, index) => {
    const fileName = `user_part_${index + 1}.csv`;
    const content = header + '\n' + chunk.join('\n');
    fs.writeFileSync(fileName, content, 'utf8');
    console.log(`${fileName} 생성 완료 (${chunk.length}개 행)`);
  });
  
  console.log('\n분할 완료! 각 파일을 순서대로 업로드하세요.');
}

splitCSV();