const express = require('express');
const mariadb = require('mariadb');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3008;

// 미들웨어
app.use(cors());
app.use(express.json());

// 채널별 라우팅 설정
app.use('/em', express.static('public/em'));        // 이마트
app.use('/hp', express.static('public/hp'));        // 홈플러스  
app.use('/et', express.static('public/et'));        // 전자랜드
app.use('/', express.static('public'));             // 기본 정적 파일

// 기본 루트는 채널 선택 페이지 표시
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'channel-select.html'));
});

// 채널 감지 함수
function getChannelFromRequest(req) {
    const referer = req.get('referer') || '';
    if (referer.includes('/hp')) return 'hp';
    if (referer.includes('/et')) return 'et';
    return 'em'; // 기본값: 이마트
}

// 채널 설정 (향후 hp, et 테이블 추가 시 수정)
const channelConfigs = {
    em: { name: '이마트', dataTable: 'products' },
    hp: { name: '홈플러스', dataTable: 'products' },    // 나중에 products_hp로 변경
    et: { name: '전자랜드', dataTable: 'products' }     // 나중에 products_et로 변경
};

// MariaDB 연결
const pool = mariadb.createPool({
  host: 'idvvbi.com',
  port: 3307,
  user: 'app_user',
  password: 'AppUser2024!@#',
  database: 'subscription_db',
  connectionLimit: 10
});

// API 라우트
// 모든 제품 조회
app.get('/api/products', async (req, res) => {
  let conn;
  try {
    const { category, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    // 채널 감지 및 테이블 선택
    const channel = getChannelFromRequest(req);
    const tableName = channelConfigs[channel].dataTable;
    
    conn = await pool.getConnection();
    
    let query = `SELECT * FROM ${tableName} WHERE 1=1`;
    let params = [];
    
    if (category && category !== 'all') {
      query += ' AND 제품군 = ?';
      params.push(category);
    }
    
    if (search) {
      query += ' AND (모델명 LIKE ? OR 제품군 LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY 모델명 LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);
    
    const rows = await conn.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// 제품 카테고리 목록
app.get('/api/categories', async (req, res) => {
  let conn;
  try {
    // 채널 감지 및 테이블 선택
    const channel = getChannelFromRequest(req);
    const tableName = channelConfigs[channel].dataTable;
    
    conn = await pool.getConnection();
    const rows = await conn.query(`SELECT DISTINCT 제품군 FROM ${tableName} ORDER BY 제품군`);
    res.json(rows.map(row => row.제품군).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// 정확한 조건으로 제품 찾기 (먼저 배치)
app.get('/api/products/find-exact', async (req, res) => {
  let conn;
  try {
    const filters = req.query;
    console.log('받은 필터:', filters);
    
    // 채널 감지 및 테이블 선택
    const channel = getChannelFromRequest(req);
    const tableName = channelConfigs[channel].dataTable;
    
    conn = await pool.getConnection();
    
    let query = `SELECT * FROM ${tableName} WHERE 1=1`;
    let params = [];
    
    const allowedFields = ['제품군', '모델명', '결합유형', '계약기간', '관리유형', '방문주기', '선납'];
    
    Object.keys(filters).forEach(key => {
      if (allowedFields.includes(key) && filters[key]) {
        // 특별한 값들을 빈 값으로 변환해서 검색
        let searchValue = filters[key];
        console.log(`필터 적용: ${key} = ${searchValue}`);
        
        if (searchValue === '방문없음' || searchValue === '선납없음' || searchValue === '관리없음' || searchValue === '정보없음') {
          query += ` AND (\`${key}\` = '' OR \`${key}\` IS NULL)`;
        } else {
          query += ` AND \`${key}\` = ?`;
          params.push(searchValue);
        }
      }
    });
    
    query += ' LIMIT 10';
    console.log('실행 쿼리:', query);
    console.log('파라미터:', params);
    
    const rows = await conn.query(query, params);
    console.log('검색 결과 개수:', rows.length);
    
    if (rows.length > 0) {
      console.log('첫 번째 결과:', rows[0]);
    }
    
    res.json(rows);
  } catch (err) {
    console.error('API 에러:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// 특정 제품 상세 조회
app.get('/api/products/:id', async (req, res) => {
  let conn;
  try {
    const { id } = req.params;
    
    // 채널 감지 및 테이블 선택
    const channel = getChannelFromRequest(req);
    const tableName = channelConfigs[channel].dataTable;
    
    conn = await pool.getConnection();
    const rows = await conn.query(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
    
    if (rows.length === 0) {
      res.status(404).json({ error: '제품을 찾을 수 없습니다.' });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// 단계별 제품 옵션 조회
app.get('/api/product-options/:field', async (req, res) => {
  let conn;
  try {
    // URL 디코딩을 통해 한글 필드명 처리
    const field = decodeURIComponent(req.params.field);
    const filters = req.query;
    
    console.log('요청된 필드:', field);
    
    conn = await pool.getConnection();
    
    // 허용된 필드만 쿼리 가능
    const allowedFields = ['제품군', '모델명', '결합유형', '계약기간', '관리유형', '방문주기', '선납'];
    if (!allowedFields.includes(field)) {
      return res.status(400).json({ error: '잘못된 필드입니다.' });
    }
    
    // 채널 감지 및 테이블 선택
    const channel = getChannelFromRequest(req);
    const tableName = channelConfigs[channel].dataTable;
    
    let query = `SELECT DISTINCT \`${field}\` FROM ${tableName} WHERE 1=1`;
    let params = [];
    
    // 필터 조건 추가
    Object.keys(filters).forEach(key => {
      if (allowedFields.includes(key) && filters[key]) {
        // 특별한 값들을 빈 값으로 변환해서 검색
        let searchValue = filters[key];
        if (searchValue === '방문없음' || searchValue === '선납없음' || searchValue === '관리없음' || searchValue === '정보없음') {
          query += ` AND (\`${key}\` = '' OR \`${key}\` IS NULL)`;
        } else {
          query += ` AND \`${key}\` = ?`;
          params.push(searchValue);
        }
      }
    });
    
    query += ` ORDER BY \`${field}\``;
    
    const rows = await conn.query(query, params);
    let options = rows.map(row => row[field]);
    
    // 빈 값이나 null 값을 적절한 기본값으로 변경
    options = options.map(option => {
      if (!option || option.trim() === '') {
        switch(field) {
          case '관리유형':
            return '관리없음';
          case '방문주기':
            return '방문없음';
          case '선납':
            return '선납없음';
          default:
            return '정보없음';
        }
      }
      return option;
    });
    
    // 중복 제거
    const uniqueOptions = [...new Set(options)];
    
    res.json(uniqueOptions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});


// 제휴카드 목록 조회
app.get('/api/partner-cards', async (req, res) => {
  let conn;
  try {
    // 채널 감지 및 필터 조건 설정
    const channel = getChannelFromRequest(req);
    
    conn = await pool.getConnection();
    let query = `
      SELECT id, 카드, 사용금액, 카드혜택, 기본혜택, 프로모션혜택, 프로모션개월, 비고
      FROM partner_cards 
      WHERE 카드 != '사용안함'
    `;
    
    // 채널별 추가 필터 조건
    if (channel === 'em') {
      // 이마트: 교원열이 비어있는 카드만
      query += ` AND (교원 IS NULL OR 교원 = '')`;
    } else if (channel === 'hp') {
      // 홈플러스: 향후 추가 조건 설정 가능
      // query += ` AND (홈플러스 조건)`;
    } else if (channel === 'et') {
      // 전자랜드: 향후 추가 조건 설정 가능  
      // query += ` AND (전자랜드 조건)`;
    }
    
    query += ` ORDER BY 카드, 사용금액`;
    
    const rows = await conn.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// 모델명으로 이미지 URL 조회
app.get('/api/image/:model_name', async (req, res) => {
  let conn;
  try {
    const { model_name } = req.params;
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT image_url FROM model_images WHERE model_name = ? LIMIT 1', [model_name]);
    
    if (rows.length > 0) {
      res.json({ imageUrl: rows[0].image_url });
    } else {
      res.json({ imageUrl: null });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// 메인 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT}에서 실행 중입니다.`);
});