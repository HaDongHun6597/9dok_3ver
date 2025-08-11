const bcrypt = require('bcryptjs');

async function generateHash() {
  // 테스트할 비밀번호들
  const passwords = [
    { password: '1017701aA!@', desc: '관리자 비밀번호' },
    { password: 'test123!', desc: '테스트 비밀번호' },
    { password: '123456789', desc: '간단한 비밀번호' }
  ];

  for (const item of passwords) {
    const hash = await bcrypt.hash(item.password, 12);
    console.log(`\n${item.desc}: ${item.password}`);
    console.log(`Hash: ${hash}`);
    
    // 검증
    const isValid = await bcrypt.compare(item.password, hash);
    console.log(`검증 결과: ${isValid ? '✅ 성공' : '❌ 실패'}`);
  }
}

generateHash();