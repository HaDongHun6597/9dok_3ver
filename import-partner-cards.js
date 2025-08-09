const mariadb = require('mariadb');
const fs = require('fs');
const csv = require('csv-parser');

async function importPartnerCards() {
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
    
    // 기존 데이터 삭제
    await conn.query('DELETE FROM partner_cards');
    console.log('기존 제휴카드 데이터 삭제 완료');

    const cards = [];
    
    // CSV 파일 읽기
    fs.createReadStream('구독카드_RAW - 카드구분.csv')
      .pipe(csv())
      .on('data', (data) => {
        // 숫자 값들을 정수로 변환 (빈 값은 0으로)
        const parseIntValue = (value) => {
          const cleaned = String(value || '').replace(/[,\s]/g, '');
          return cleaned === '' ? 0 : parseInt(cleaned) || 0;
        };

        const card = {
          카드: data['카드'] || '',
          사용금액: data['사용금액'] || '',
          카드혜택: data['카드 혜택'] || '',
          혜택: parseIntValue(data['혜택']),
          기본혜택: parseIntValue(data['기본 혜택']),
          프로모션혜택: parseIntValue(data['프로모션 혜택']),
          프로모션개월: parseIntValue(data['프로모션_개월']),
          프로모션기간: data['프로모션 기간'] || '',
          비고: data['비고'] || '',
          '3년': parseIntValue(data['3년']),
          '3년p': parseIntValue(data['3년p']),
          '4년': parseIntValue(data['4년']),
          '4년p': parseIntValue(data['4년p']),
          '5년': parseIntValue(data['5년']),
          '5년p': parseIntValue(data['5년p']),
          '6년': parseIntValue(data['6년']),
          '6년p': parseIntValue(data['6년p']),
          환급금액: data['환급금액'] || '',
          교원: data['교원'] || ''
        };
        
        cards.push(card);
      })
      .on('end', async () => {
        console.log(`CSV 파일 읽기 완료: ${cards.length}개 레코드`);
        
        if (cards.length > 0) {
          // 데이터 삽입
          for (const card of cards) {
            const insertQuery = `
              INSERT INTO partner_cards (
                카드, 사용금액, 카드혜택, 혜택, 기본혜택, 프로모션혜택, 프로모션개월, 프로모션기간, 비고,
                \`3년\`, \`3년p\`, \`4년\`, \`4년p\`, \`5년\`, \`5년p\`, \`6년\`, \`6년p\`, 환급금액, 교원
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const values = [
              card.카드, card.사용금액, card.카드혜택, card.혜택, card.기본혜택, card.프로모션혜택,
              card.프로모션개월, card.프로모션기간, card.비고, card['3년'], card['3년p'], card['4년'],
              card['4년p'], card['5년'], card['5년p'], card['6년'], card['6년p'], card.환급금액, card.교원
            ];
            
            try {
              await conn.query(insertQuery, values);
            } catch (error) {
              console.error('삽입 오류:', error);
              console.error('데이터:', card);
            }
          }
          
          console.log(`${cards.length}개의 제휴카드 데이터 임포트 완료`);
          
          // 결과 확인
          const result = await conn.query('SELECT 카드, 사용금액, 혜택, 기본혜택 FROM partner_cards LIMIT 10');
          console.log('\n임포트된 데이터 샘플:');
          result.forEach(card => {
            console.log(`- ${card.카드}: ${card.사용금액} (기본혜택: ${card.기본혜택}원)`);
          });
        }
        
        conn.release();
        await pool.end();
      });

  } catch (error) {
    console.error('에러:', error);
  }
}

importPartnerCards();