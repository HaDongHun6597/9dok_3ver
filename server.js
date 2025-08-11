// 환경 변수 로드 (가장 먼저 실행)
require('dotenv').config();

const express = require('express');
const mariadb = require('mariadb');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const unzipper = require('unzipper');

// 인증 관련 모듈 추가
const authRoutes = require('./auth/authRoutes');
const { AuthClient, authenticateToken, requireAdmin, requireActiveUser } = require('./auth/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3008;

// AuthClient 인스턴스 생성
const authClient = new AuthClient(
  process.env.AUTH_SERVER_URL,
  process.env.JWT_SECRET,
  process.env.JWT_REFRESH_SECRET
);



// 미들웨어
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 채널별 라우팅 설정
app.use('/em', express.static('public/em'));        // 이마트
app.use('/hp', express.static('public/hp'));        // 홈플러스  
app.use('/et', express.static('public/et'));        // 전자랜드

// 공통 리소스 (폰트, 이미지 등)
app.use('/fonts', express.static('public/fonts'));
app.use('/html', express.static('public/html'));
app.use('/shared', express.static('public/shared'));
app.use('/style.css', express.static('public/style.css'));
app.use('/script.js', express.static('public/script.js'));
app.use('/product-modal.js', express.static('public/product-modal.js'));
app.use('/auth.js', express.static('public/auth.js'));
app.use('/ktcs_logo_black.png', express.static('public/ktcs_logo_black.png'));
app.use('/ktcs_logo_white.png', express.static('public/ktcs_logo_white.png'));
app.use('/favicon.ico', express.static('public/favicon.ico'));

// 관리자 페이지 라우트
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// 관리자 페이지 정적 파일 서빙
app.use('/admin', express.static('public/admin'));

// 인증 라우트 추가
app.use('/auth', authRoutes);

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

// 채널 접근 권한 검증 미들웨어
function validateChannelAccess(req, res, next) {
    // 사용자 정보가 없으면 통과 (인증 미들웨어에서 처리)
    if (!req.user) {
        return next();
    }
    
    // 사용자의 distribution 정보 가져오기
    const userDistribution = req.user.distribution ? req.user.distribution.trim().toLowerCase() : '';
    
    // distribution이 없으면 모든 채널 접근 가능
    if (!userDistribution) {
        console.log('[validateChannelAccess] 유통 정보 없음 - 모든 채널 접근 허용');
        return next();
    }
    
    // 현재 요청된 채널 확인
    const requestedChannel = getChannelFromRequest(req);
    
    console.log('[validateChannelAccess] 사용자 유통:', userDistribution, '/ 요청 채널:', requestedChannel);
    
    // 채널 접근 권한 검증
    if (userDistribution !== requestedChannel) {
        const channelNames = {
            'em': '이마트',
            'hp': '홈플러스',
            'et': '전자랜드'
        };
        
        console.log(`[validateChannelAccess] 접근 거부: ${channelNames[requestedChannel]} 채널 (사용자는 ${channelNames[userDistribution]}만 가능)`);
        return res.status(403).json({ 
            error: `${channelNames[requestedChannel]} 채널에 접근 권한이 없습니다. ${channelNames[userDistribution]} 채널만 이용 가능합니다.`
        });
    }
    
    console.log('[validateChannelAccess] 채널 접근 허용');
    next();
}

// 채널 설정 (향후 hp, et 테이블 추가 시 수정)
const channelConfigs = {
    em: { name: '이마트', dataTable: 'products' },
    hp: { name: '홈플러스', dataTable: 'products' },    // 나중에 products_hp로 변경
    et: { name: '전자랜드', dataTable: 'products' }     // 나중에 products_et로 변경
};

// MariaDB 연결
console.log('데이터베이스 연결 정보:', {
  host: process.env.DB_HOST || 'idvvbi.com',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER || 'app_user',
  database: process.env.DB_NAME || 'subscription_db'
});

// MariaDB pool - test-db.js와 동일한 설정 사용
const pool = mariadb.createPool({
  host: 'idvvbi.com',
  port: 3307,
  user: 'app_user',
  password: 'AppUser2024!@#',
  database: 'subscription_db',
  connectionLimit: 1,  // test-db.js와 동일
  connectTimeout: 5000  // test-db.js와 동일
});

// API 라우트 (인증 필요)
// 모든 제품 조회
app.get('/api/products', authenticateToken(authClient), requireActiveUser, validateChannelAccess, async (req, res) => {
  let conn;
  try {
    const { category, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    // 채널 감지 및 테이블 선택
    const channel = getChannelFromRequest(req);
    const tableName = channelConfigs[channel].dataTable;
    
    conn = await pool.getConnection();
    
    let query = `SELECT * FROM ${tableName} WHERE channel = ?`;
    let params = [channel];
    
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

// 제품 카테고리 목록 - 임시로 user-info와 동일한 방식으로
app.get('/api/categories', async (req, res) => {
  // user-info API와 동일한 인증 방식
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: '토큰이 필요합니다.' });
  }
  
  // user-info와 동일하게 직접 axios로 검증 (재시도 로직 포함)
  const axios = require('axios');
  let retryCount = 0;
  const maxRetries = 2;
  
  while (retryCount <= maxRetries) {
    try {
      console.log(`[categories] 인증 서버 요청 (시도 ${retryCount + 1}/${maxRetries + 1})`);
      const response = await axios.get(`${authClient.authServerUrl}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 5000
      });
      
      if (response.data && response.data.user) {
        req.user = response.data.user;
        console.log('[categories] 인증 성공:', req.user.username);
        break; // 성공하면 루프 종료
      }
    } catch (error) {
      console.error(`[categories] 인증 실패 (시도 ${retryCount + 1}):`, error.response?.status);
      retryCount++;
      
      if (retryCount > maxRetries) {
        return res.status(403).json({ error: '인증 실패' });
      }
      
      // 재시도 전 짧은 대기
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  // 채널 접근 권한 검증
  const userDistribution = req.user.distribution ? req.user.distribution.trim().toLowerCase() : '';
  const requestedChannel = getChannelFromRequest(req);
  
  if (userDistribution && userDistribution !== requestedChannel) {
    const channelNames = {
      'em': '이마트',
      'hp': '홈플러스',
      'et': '전자랜드'
    };
    
    console.log(`[categories] 채널 접근 거부: ${channelNames[requestedChannel]} (사용자: ${channelNames[userDistribution]})`);
    return res.status(403).json({ 
      error: `${channelNames[requestedChannel]} 채널에 접근 권한이 없습니다.`
    });
  }
  
  // 원래 로직
  let conn;
  try {
    // 채널 감지 및 테이블 선택
    const channel = getChannelFromRequest(req);
    const tableName = channelConfigs[channel].dataTable;
    
    console.log(`Categories API - Channel: ${channel}, Table: ${tableName}`);
    
    conn = await pool.getConnection();
    
    // channel 컬럼이 없을 수도 있으므로 조건부로 처리
    let query;
    let params;
    
    // 먼저 테이블 구조 확인
    const columns = await conn.query(`SHOW COLUMNS FROM ${tableName}`);
    const hasChannelColumn = columns.some(col => col.Field === 'channel');
    
    if (hasChannelColumn) {
      query = `SELECT DISTINCT 제품군 FROM ${tableName} WHERE channel = ? ORDER BY 제품군`;
      params = [channel];
    } else {
      // channel 컬럼이 없으면 전체 제품군 조회
      query = `SELECT DISTINCT 제품군 FROM ${tableName} ORDER BY 제품군`;
      params = [];
    }
    
    console.log(`Executing query: ${query}`, params);
    const rows = await conn.query(query, params);
    console.log(`Found ${rows.length} categories`);
    
    res.json(rows.map(row => row.제품군).filter(Boolean));
  } catch (err) {
    console.error('Categories API Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// 정확한 조건으로 제품 찾기 (먼저 배치)
app.get('/api/products/find-exact', authenticateToken(authClient), requireActiveUser, validateChannelAccess, async (req, res) => {
  let conn;
  try {
    const filters = req.query;
    console.log('받은 필터:', filters);
    
    // 채널 감지 및 테이블 선택
    const channel = getChannelFromRequest(req);
    const tableName = channelConfigs[channel].dataTable;
    
    conn = await pool.getConnection();
    
    let query = `SELECT * FROM ${tableName} WHERE channel = ?`;
    let params = [channel];
    
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
app.get('/api/products/:id', authenticateToken(authClient), requireActiveUser, validateChannelAccess, async (req, res) => {
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
app.get('/api/product-options/:field', authenticateToken(authClient), requireActiveUser, async (req, res) => {
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
    
    // 모델명 필드인 경우 활성화 정보도 함께 가져오기
    let query;
    let params = [];
    
    if (field === '모델명') {
      query = `SELECT DISTINCT \`${field}\`, 활성화 FROM ${tableName} WHERE channel = ?`;
      params.push(channel);
    } else {
      query = `SELECT DISTINCT \`${field}\` FROM ${tableName} WHERE channel = ?`;
      params.push(channel);
    }
    
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
    
    // 모델명인 경우 활성화가 있는 것을 우선 정렬 (1 이하는 활성화 없는 것으로 처리)
    if (field === '모델명') {
      query += ` ORDER BY CASE WHEN 활성화 IS NOT NULL AND 활성화 != '' AND 활성화 != '0' AND CAST(활성화 AS SIGNED) > 1 THEN 0 ELSE 1 END, \`${field}\``;
    } else {
      query += ` ORDER BY \`${field}\``;
    }
    
    const rows = await conn.query(query, params);
    let options;
    
    // 모델명인 경우 활성화 정보와 함께 반환
    if (field === '모델명') {
      options = rows;  // 객체 배열로 반환 {모델명, 활성화}
    } else {
      options = rows.map(row => row[field]);
    }
    
    // 빈 값이나 null 값을 적절한 기본값으로 변경 (모델명이 아닌 경우에만)
    if (field !== '모델명') {
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
    } else {
      // 모델명인 경우 중복 제거 및 활성화 정보 유지
      const modelMap = new Map();
      rows.forEach(row => {
        if (!modelMap.has(row['모델명'])) {
          modelMap.set(row['모델명'], row['활성화']);
        }
      });
      
      const uniqueModels = Array.from(modelMap, ([model, activation]) => ({
        model: model,
        activation: activation
      }));
      
      res.json(uniqueModels);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});


// 제휴카드 목록 조회
app.get('/api/partner-cards', authenticateToken(authClient), requireActiveUser, async (req, res) => {
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
      // 홈플러스: 교원열이 비어있는 카드 + 교원값이 "교원"인 카드
      query += ` AND (교원 IS NULL OR 교원 = '' OR 교원 = '교원')`;
    } else if (channel === 'et') {
      // 전자랜드: 교원열이 비어있는 카드 + 교원값이 "더피플"인 카드
      query += ` AND (교원 IS NULL OR 교원 = '' OR 교원 = '더피플')`;
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

// 구독 혜택 정보 조회
app.get('/api/subscription-benefits', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`
      SELECT id, name, management_type, search_keyword, icon_url, 
             vertical_image_url, horizontal_image_url, video_url, html_url 
      FROM subscription_benefits 
      ORDER BY id
    `);
    res.json(rows);
  } catch (err) {
    console.error('구독 혜택 조회 오류:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// 특정 제품의 구독 혜택 조회 (제품군 기반)
app.get('/api/subscription-benefits/:productCategory', async (req, res) => {
  let conn;
  try {
    const productCategory = req.params.productCategory;
    conn = await pool.getConnection();
    
    const rows = await conn.query(`
      SELECT id, name, management_type, search_keyword, icon_url, 
             vertical_image_url, horizontal_image_url, video_url, html_url 
      FROM subscription_benefits 
      WHERE search_keyword = ? OR name LIKE ?
      ORDER BY id
    `, [productCategory, `%${productCategory}%`]);
    
    res.json(rows);
  } catch (err) {
    console.error('제품별 구독 혜택 조회 오류:', err);
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

// 사용자 정보 조회 API
app.get('/api/user-info', async (req, res) => {
  try {
    // IP 주소 가져오기 (우선순위: x-real-ip > x-forwarded-for > 연결 주소)
    let clientIp = req.headers['x-real-ip'] || 
                   req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress ||
                   req.socket.remoteAddress ||
                   req.ip || '127.0.0.1';
    
    // IPv6 형식 처리 및 실제 IP 추출
    if (clientIp.includes(',')) {
      // x-forwarded-for에 여러 IP가 있는 경우 첫 번째 것 사용
      clientIp = clientIp.split(',')[0].trim();
    }
    
    // ::ffff: 프리픽스 제거 (IPv4-mapped IPv6 주소)
    clientIp = clientIp.replace('::ffff:', '');
    
    // ::1은 IPv6 localhost이므로 127.0.0.1로 변환
    if (clientIp === '::1') {
      clientIp = '127.0.0.1';
    }
    
    // 실제 공인 IP 가져오기 (로컬 환경이 아닌 경우)
    let realPublicIp = clientIp;
    
    // 로컬 IP인지 확인
    const isLocalIp = clientIp === '127.0.0.1' || 
                      clientIp === 'localhost' || 
                      clientIp.startsWith('192.168.') || 
                      clientIp.startsWith('10.') || 
                      clientIp.startsWith('172.');
    
    console.log('클라이언트 IP:', clientIp, '로컬 IP 여부:', isLocalIp);
    
    // 로컬 환경에서는 외부 서비스를 통해 실제 공인 IP 가져오기
    if (isLocalIp) {
      try {
        const axios = require('axios');
        const ipResponse = await axios.get('https://api.ipify.org?format=json', { timeout: 3000 });
        if (ipResponse.data && ipResponse.data.ip) {
          realPublicIp = ipResponse.data.ip;
          console.log('공인 IP (ipify):', realPublicIp);
        }
      } catch (ipError) {
        console.log('공인 IP 조회 실패:', ipError.message);
        // 실패 시 클라이언트 IP 그대로 사용
      }
    }
    
    // 기본 사용자 정보
    let userInfo = {
      name: '사용자',
      position: '',
      branch: '',
      company: 'KTCS',
      team: '',
      employee_id: '',
      distribution: '',
      is_admin: false,
      email: '',
      phone: '',
      realIp: realPublicIp  // 실제 공인 IP 사용
    };
    
    // 토큰이 있으면 파싱 시도
    const authHeader = req.headers.authorization;
    console.log('인증 헤더:', authHeader ? '있음' : '없음');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      console.log('토큰 추출됨:', token ? token.substring(0, 20) + '...' : '없음');
      console.log('user-info API - 토큰 길이:', token.length);
      console.log('user-info API - 토큰 첫 50자:', token.substring(0, 50));
      console.log('user-info API - 토큰 마지막 20자:', token.substring(token.length - 20));
      
      try {
        // 먼저 인증 서버에서 최신 사용자 정보 가져오기 시도
        const axios = require('axios');
        try {
          console.log('인증 서버에 사용자 정보 요청:', `${authClient.authServerUrl}/user/profile`);
          const response = await axios.get(`${authClient.authServerUrl}/user/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            timeout: 5000
          });
          
          if (response.data && response.data.user) {
            const serverUser = response.data.user;
            console.log('인증 서버에서 가져온 사용자 정보:', serverUser);
            
            // 서버에서 받은 모든 정보 매핑
            userInfo.name = serverUser.username || serverUser.name || '사용자';
            userInfo.position = serverUser.position || '';
            userInfo.branch = serverUser.branch || '';
            userInfo.company = serverUser.company || 'KTCS';
            userInfo.team = serverUser.team || '';
            userInfo.employee_id = serverUser.employee_id || '';
            userInfo.distribution = serverUser.distribution || '';
            userInfo.is_admin = serverUser.is_admin || false;
            userInfo.email = serverUser.email || '';
            userInfo.phone = serverUser.phone || '';
            
            console.log('인증 서버 정보로 업데이트된 사용자 정보:', userInfo);
            res.json(userInfo);
            return;
          }
        } catch (authServerErr) {
          console.log('인증 서버 조회 실패:', authServerErr.message);
          // 인증 서버 실패 시 로컬 토큰 검증으로 계속
        }
        
        // 로컬 토큰 검증
        const result = authClient.verifyToken(token);
        console.log('로컬 토큰 검증 결과:', result);
        
        if (result && result.success && result.user) {
          const user = result.user;
          
          // 실제 토큰에서 정보 추출 (가이드 문서와 일치하도록)
          userInfo.name = user.username || user.name || '사용자';
          userInfo.position = user.position || '';
          userInfo.branch = user.branch || '';
          userInfo.company = user.company || 'KTCS';
          userInfo.team = user.team || '';
          userInfo.employee_id = user.employee_id || user.id || '';
          userInfo.distribution = user.distribution || '';
          userInfo.is_admin = user.is_admin || user.isAdmin || false;
          userInfo.email = user.email || '';
          
          console.log('로컬 토큰에서 추출된 사용자 정보:', userInfo);
        } else {
          // 직접 JWT 디코드 시도 (검증 없이)
          const jwt = require('jsonwebtoken');
          const decoded = jwt.decode(token);
          console.log('JWT 디코드 결과:', decoded);
          
          if (decoded) {
            userInfo.name = decoded.username || decoded.name || decoded.employee_id || decoded.sub || '사용자';
            userInfo.position = decoded.position || decoded.team || '';
            userInfo.branch = decoded.branch || '';
            userInfo.company = decoded.company || 'KTCS';
            userInfo.team = decoded.team || '';
            userInfo.employee_id = decoded.employee_id || decoded.sub || '';
            userInfo.distribution = decoded.distribution || '';
            userInfo.is_admin = decoded.isAdmin || decoded.is_admin || false;
            userInfo.email = decoded.email || '';
          }
        }
      } catch (tokenErr) {
        console.log('토큰 처리 오류:', tokenErr.message);
        
        // 마지막 시도: JWT 디코드만 (검증 없이)
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.decode(token);
          if (decoded) {
            userInfo.name = decoded.username || decoded.name || decoded.employee_id || decoded.sub || '사용자';
            userInfo.position = decoded.position || decoded.team || '';
            userInfo.branch = decoded.branch || '';
            userInfo.company = decoded.company || 'KTCS';
            userInfo.team = decoded.team || '';
            userInfo.employee_id = decoded.employee_id || decoded.sub || '';
            userInfo.distribution = decoded.distribution || '';
            userInfo.is_admin = decoded.isAdmin || decoded.is_admin || false;
            userInfo.email = decoded.email || '';
          }
        } catch (decodeErr) {
          console.log('JWT 디코드 실패:', decodeErr.message);
        }
      }
    }
    
    console.log('최종 사용자 정보:', userInfo);
    res.json(userInfo);
  } catch (err) {
    console.error('사용자 정보 조회 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============= 관리자 API 시작 =============

// multer 설정
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB 제한
});

// 관리자 권한 체크 미들웨어
function checkAdminAuth(req, res, next) {
  // authenticateToken과 requireAdmin을 함께 사용
  authenticateToken(authClient)(req, res, (err) => {
    if (err) {
      console.log('Admin auth failed - no token');
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }
    
    console.log('Admin auth check - user:', {
      employee_id: req.user.employee_id,
      position: req.user.position,
      is_admin: req.user.is_admin,
      isAdmin: req.user.isAdmin,
      username: req.user.username
    });
    
    // 관리자 권한 체크 - is_admin이 true이면 무조건 관리자로 인정
    if (req.user.is_admin === true || req.user.isAdmin === true) {
      // 관리자 권한 있음
      console.log('Admin auth success - is_admin is true');
    } else if (req.user.employee_id === '1017701' || req.user.employee_id === 'admin') {
      // employee_id로도 관리자 확인
      console.log('Admin auth success - admin employee_id');
    } else {
      console.log('Admin auth failed - not admin');
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }
    next();
  });
}

// 현재 데이터 정보 조회
app.get('/api/admin/data-info/subscription', checkAdminAuth, async (req, res) => {
  const { channel } = req.query;
  let conn;
  try {
    conn = await pool.getConnection();
    
    // 채널별 테이블과 이름 설정
    const selectedChannel = channel || 'em';
    const tableName = channelConfigs[selectedChannel].dataTable;
    const channelName = channelConfigs[selectedChannel].name;
    
    const [count] = await conn.query(`SELECT COUNT(*) as count FROM ${tableName} WHERE channel = ?`, [selectedChannel]);
    
    // 업로드 시간 조회 (upload_logs 테이블이 있다면)
    let uploadTime = null;
    try {
      const [lastUpload] = await conn.query(
        'SELECT MAX(upload_time) as last_upload FROM upload_logs WHERE data_type = ? AND (channel = ? OR channel IS NULL) ORDER BY upload_time DESC LIMIT 1',
        ['subscription', selectedChannel]
      );
      uploadTime = lastUpload?.last_upload;
    } catch (e) {
      // 테이블이 없을 수 있음
      console.log('No upload_logs table');
    }
    
    res.json({ 
      message: `${channelName}: ${count.count}개 제품`,
      lastUpload: uploadTime
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/admin/data-info/images', checkAdminAuth, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const [count] = await conn.query('SELECT COUNT(*) as count FROM model_images');
    
    // 업로드 시간 조회
    let uploadTime = null;
    try {
      const [lastUpload] = await conn.query(
        'SELECT MAX(upload_time) as last_upload FROM upload_logs WHERE data_type = ? ORDER BY upload_time DESC LIMIT 1',
        ['images']
      );
      uploadTime = lastUpload?.last_upload;
    } catch (e) {
      console.log('No upload_logs table');
    }
    
    res.json({ 
      message: `${count.count}개 모델 이미지`,
      lastUpload: uploadTime
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/admin/data-info/cards', checkAdminAuth, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const [count] = await conn.query('SELECT COUNT(*) as count FROM partner_cards');
    
    // 업로드 시간 조회
    let uploadTime = null;
    try {
      const [lastUpload] = await conn.query(
        'SELECT MAX(upload_time) as last_upload FROM upload_logs WHERE data_type = ? ORDER BY upload_time DESC LIMIT 1',
        ['cards']
      );
      uploadTime = lastUpload?.last_upload;
    } catch (e) {
      console.log('No upload_logs table');
    }
    
    res.json({ 
      message: `${count.count}개 카드 데이터`,
      lastUpload: uploadTime
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// 구독 데이터 업로드
app.post('/api/admin/upload/subscription', checkAdminAuth, upload.single('file'), async (req, res) => {
  const { channel } = req.body;
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({ error: '파일이 없습니다.' });
  }
  
  let conn;
  try {
    conn = await pool.getConnection();
    
    // CSV 파일 읽기를 Promise로 변환
    const parseCSV = () => {
      return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(file.path)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve(results))
          .on('error', reject);
      });
    };
    
    try {
      const results = await parseCSV();
      
      // 테이블 선택 (현재는 모두 products 사용)
      const tableName = channelConfigs[channel || 'em'].dataTable;
      
      console.log(`Uploading ${results.length} rows to ${tableName}`);
      
      // channel 컬럼이 없으면 추가
      try {
        await conn.query(`ALTER TABLE ${tableName} ADD COLUMN channel VARCHAR(10) DEFAULT 'em'`);
        console.log('Added channel column to table');
      } catch (e) {
        // 이미 컬럼이 있으면 무시
        console.log('Channel column already exists');
      }
      
      // 기존 데이터 삭제 (해당 채널만)
      console.log(`Deleting existing data for channel ${channel || 'em'} from ${tableName}...`);
      await conn.query(`DELETE FROM ${tableName} WHERE channel = ?`, [channel || 'em']);
      
      // 새 데이터 삽입 (배치 처리로 성능 개선)
      console.log(`Inserting ${results.length} rows for channel ${channel || 'em'}...`);
      const batchSize = 100; // 한 번에 처리할 행 수
      
      for (let i = 0; i < results.length; i += batchSize) {
        const batch = results.slice(i, Math.min(i + batchSize, results.length));
        
        // 트랜잭션 시작
        await conn.beginTransaction();
        
        try {
          for (const row of batch) {
            // id 컬럼 제거 (자동 생성되도록)
            delete row.id;
            
            // channel 정보 추가
            row.channel = channel || 'em';
            
            // 컬럼명과 값 분리
            const columns = Object.keys(row);
            const values = columns.map(column => {
              const value = row[column];
              
              // 활성화 필드 특별 처리 - 빈 값은 0으로
              if (column === '활성화' && (value === '' || value === null || value === undefined)) {
                return 0;
              }
              
              // 다른 필드들은 빈 문자열을 NULL로 변환
              if (value === '' || value === null || value === undefined) {
                return null;
              }
              
              // 숫자 필드인 경우 숫자로 변환 시도
              if (!isNaN(value) && value !== '') {
                return value;
              }
              return value;
            });
            const placeholders = columns.map(() => '?').join(',');
            
            const query = `INSERT INTO ${tableName} (${columns.map(col => `\`${col}\``).join(',')}) VALUES (${placeholders})`;
            await conn.query(query, values);
          }
          
          await conn.commit();
          console.log(`Processed ${Math.min(i + batchSize, results.length)} / ${results.length} rows`);
        } catch (batchErr) {
          await conn.rollback();
          throw batchErr;
        }
      }
      
      // 업로드 로그 저장 (테이블이 없으면 생성)
      try {
        await conn.query(`
          CREATE TABLE IF NOT EXISTS upload_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            data_type VARCHAR(50),
            channel VARCHAR(20),
            record_count INT,
            upload_time DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        await conn.query(
          'INSERT INTO upload_logs (data_type, channel, record_count) VALUES (?, ?, ?)',
          ['subscription', channel || 'em', results.length]
        );
      } catch (logErr) {
        console.log('Failed to save upload log:', logErr);
      }
      
      // 임시 파일 삭제
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      
      res.json({ 
        message: `${results.length}개 제품 데이터가 업로드되었습니다.`,
        channel: channelConfigs[channel || 'em'].name 
      });
    } catch (err) {
      console.error('Upload error:', err);
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      res.status(500).json({ error: err.message });
    }
  } catch (err) {
    console.error('Connection error:', err);
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// 이미지 업로드 (CSV 방식)
app.post('/api/admin/upload/images', checkAdminAuth, upload.single('file'), async (req, res) => {
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({ error: '파일이 없습니다.' });
  }
  
  let conn;
  try {
    conn = await pool.getConnection();
    
    // CSV 파일 읽기를 Promise로 변환
    const parseCSV = () => {
      return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(file.path)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve(results))
          .on('error', reject);
      });
    };
    
    try {
      const results = await parseCSV();
      
      console.log(`Processing ${results.length} image records...`);
      
      // 기존 데이터 삭제
      await conn.query('DELETE FROM model_images');
      
      let uploadedCount = 0;
      let currentNo = 1; // no 값을 1부터 시작
      
      // 새 데이터 삽입
      for (const row of results) {
        // 모델명과 링크 필드만 사용
        const modelName = row['모델명'];
        const imageUrl = row['링크'];
        
        if (modelName && imageUrl) {
          // no 필드에 명시적으로 순차적인 값 할당
          await conn.query(
            'INSERT INTO model_images (no, model_name, image_url) VALUES (?, ?, ?)',
            [currentNo, modelName, imageUrl]
          );
          currentNo++; // 다음 레코드를 위해 증가
          uploadedCount++;
        }
      }
      
      // 업로드 로그 저장
      try {
        await conn.query(
          'INSERT INTO upload_logs (data_type, record_count) VALUES (?, ?)',
          ['images', uploadedCount]
        );
      } catch (logErr) {
        console.log('Failed to save upload log:', logErr);
      }
      
      // 임시 파일 삭제
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      
      res.json({ 
        message: `${uploadedCount}개 모델 이미지 정보가 업로드되었습니다.` 
      });
    } catch (err) {
      console.error('Upload error:', err);
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      res.status(500).json({ error: err.message });
    }
  } catch (err) {
    console.error('Connection error:', err);
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// 카드 데이터 업로드
app.post('/api/admin/upload/cards', checkAdminAuth, upload.single('file'), async (req, res) => {
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({ error: '파일이 없습니다.' });
  }
  
  let conn;
  try {
    conn = await pool.getConnection();
    
    // CSV 파일 읽기
    const results = [];
    fs.createReadStream(file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          // 기존 데이터 삭제 (모든 partner_cards 데이터)
          await conn.query('DELETE FROM partner_cards');
          
          // 새 데이터 삽입
          for (const row of results) {
            // 컬럼명 매핑 (CSV의 띄어쓰기 있는 컬럼명을 DB 컬럼명으로 변환)
            const columnMapping = {
              '카드': '카드',
              '사용금액': '사용금액',
              '카드 혜택': '카드혜택',  // 띄어쓰기 제거
              '혜택': '혜택',
              '기본 혜택': '기본혜택',  // 띄어쓰기 제거
              '프로모션 혜택': '프로모션혜택',  // 띄어쓰기 제거
              '프로모션_개월': '프로모션개월',  // 언더스코어 제거
              '프로모션 기간': '프로모션기간',  // 띄어쓰기 제거
              '비고': '비고',
              '3년': '3년',
              '3년p': '3년p',
              '4년': '4년',
              '4년p': '4년p',
              '5년': '5년',
              '5년p': '5년p',
              '6년': '6년',
              '6년p': '6년p',
              '환급금액': '환급금액',
              '교원': '교원'
            };
            
            // 매핑된 컬럼명과 값 준비
            const mappedData = {};
            for (const [csvCol, value] of Object.entries(row)) {
              const dbCol = columnMapping[csvCol] || csvCol;
              mappedData[dbCol] = value;
            }
            
            const columns = Object.keys(mappedData);
            const values = Object.values(mappedData).map(value => {
              // 빈 문자열을 NULL로 변환
              if (value === '' || value === null || value === undefined) {
                return null;
              }
              // 숫자 필드인 경우 숫자로 변환 시도
              if (!isNaN(value) && value !== '') {
                return value;
              }
              return value;
            });
            const placeholders = columns.map(() => '?').join(',');
            
            const query = `INSERT INTO partner_cards (${columns.map(col => `\`${col}\``).join(',')}) VALUES (${placeholders})`;
            await conn.query(query, values);
          }
          
          // 임시 파일 삭제
          fs.unlinkSync(file.path);
          
          res.json({ 
            message: `${results.length}개 카드 데이터가 업로드되었습니다.`
          });
        } catch (err) {
          fs.unlinkSync(file.path);
          res.status(500).json({ error: err.message });
        }
      });
  } catch (err) {
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// 구독 데이터 그리드 조회 (관리자용)
app.get('/api/admin/subscriptions/grid', checkAdminAuth, async (req, res) => {
  const { channel, product_group } = req.query;
  
  let conn;
  try {
    conn = await pool.getConnection();
    
    // 쿼리 생성
    let query = 'SELECT * FROM subscriptions WHERE 1=1';
    const params = [];
    
    if (channel) {
      query += ' AND 채널 = ?';
      params.push(channel);
    }
    
    if (product_group) {
      query += ' AND 제품군 = ?';
      params.push(product_group);
    }
    
    query += ' ORDER BY id';
    
    const rows = await conn.query(query, params);
    
    // 컬럼 정보 추출
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    
    res.json({
      data: rows,
      columns: columns,
      total: rows.length
    });
  } catch (err) {
    console.error('Grid data error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// 구독 데이터 일괄 수정 (관리자용)
app.post('/api/admin/subscriptions/update', checkAdminAuth, async (req, res) => {
  const { changes } = req.body;
  
  if (!changes || !Array.isArray(changes)) {
    return res.status(400).json({ error: '변경사항이 없습니다.' });
  }
  
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    
    let updated = 0;
    for (const change of changes) {
      const { id, column, value } = change;
      
      // SQL 인젝션 방지를 위해 컬럼명 검증
      const allowedColumns = ['제품군', '모델명', '결합유형', '계약기간', '관리유형', 
                            '방문주기', '선납', '월요금', '정상가격', '프로모션할인', 
                            '결합할인', '제휴카드', '혜택', '채널'];
      
      if (!allowedColumns.includes(column)) {
        console.warn(`Invalid column: ${column}`);
        continue;
      }
      
      const query = `UPDATE subscriptions SET \`${column}\` = ? WHERE id = ?`;
      await conn.query(query, [value || null, id]);
      updated++;
    }
    
    await conn.commit();
    res.json({ 
      message: '데이터가 수정되었습니다.',
      updated: updated 
    });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Update error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// 구독 혜택 조회 (관리자용)
app.get('/api/benefits', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT id, name, management_type, search_keyword, icon_url, vertical_image_url, horizontal_image_url, video_url, html_url, service_before, service_after, payment_value FROM subscription_benefits ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// 구독 혜택 추가
app.post('/api/admin/benefits', checkAdminAuth, async (req, res) => {
  const { 
    name, 
    management_type, 
    search_keyword, 
    icon_url, 
    vertical_image_url, 
    horizontal_image_url, 
    video_url, 
    html_url,
    service_before,
    service_after,
    payment_value 
  } = req.body;
  
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `INSERT INTO subscription_benefits 
       (name, management_type, search_keyword, icon_url, vertical_image_url, horizontal_image_url, video_url, html_url, service_before, service_after, payment_value) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, management_type, search_keyword, icon_url, vertical_image_url, horizontal_image_url, video_url, html_url, service_before, service_after, payment_value]
    );
    
    res.json({ 
      message: '혜택이 추가되었습니다.',
      id: result.insertId 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// 구독 혜택 수정
app.put('/api/admin/benefits/:id', checkAdminAuth, async (req, res) => {
  const { id } = req.params;
  const { 
    name, 
    management_type, 
    search_keyword, 
    icon_url, 
    vertical_image_url, 
    horizontal_image_url, 
    video_url, 
    html_url,
    service_before,
    service_after,
    payment_value 
  } = req.body;
  
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query(
      `UPDATE subscription_benefits 
       SET name = ?, management_type = ?, search_keyword = ?, icon_url = ?, 
           vertical_image_url = ?, horizontal_image_url = ?, video_url = ?, html_url = ?,
           service_before = ?, service_after = ?, payment_value = ? 
       WHERE id = ?`,
      [name, management_type, search_keyword, icon_url, vertical_image_url, horizontal_image_url, video_url, html_url, service_before, service_after, payment_value, id]
    );
    
    res.json({ message: '혜택이 수정되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// 구독 혜택 삭제
app.delete('/api/admin/benefits/:id', checkAdminAuth, async (req, res) => {
  const { id } = req.params;
  
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('DELETE FROM subscription_benefits WHERE id = ?', [id]);
    
    res.json({ message: '혜택이 삭제되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// 현재 데이터 다운로드
app.get('/api/admin/download/subscription', checkAdminAuth, async (req, res) => {
  const { channel } = req.query;
  
  let conn;
  try {
    conn = await pool.getConnection();
    const selectedChannel = channel || 'em';
    const tableName = channelConfigs[selectedChannel].dataTable;
    const rows = await conn.query(`SELECT * FROM ${tableName} WHERE channel = ?`, [selectedChannel]);
    
    // CSV 변환
    const Parser = require('json2csv').Parser;
    const fields = Object.keys(rows[0] || {});
    const opts = { fields, withBOM: true };
    const parser = new Parser(opts);
    const csv = parser.parse(rows);
    
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment(`subscription_${channel}_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/admin/download/cards', checkAdminAuth, async (req, res) => {
  const { channel } = req.query;
  
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM partner_cards');
    
    // CSV 변환
    const Parser = require('json2csv').Parser;
    const fields = Object.keys(rows[0] || {});
    const opts = { fields, withBOM: true };
    const parser = new Parser(opts);
    const csv = parser.parse(rows);
    
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment(`cards_${channel}_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// 이미지 데이터 다운로드
app.get('/api/admin/download/images', checkAdminAuth, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT model_name as 모델명, image_url as 링크 FROM model_images ORDER BY model_name');
    
    // CSV 변환
    const Parser = require('json2csv').Parser;
    const fields = ['모델명', '링크'];
    const opts = { fields, withBOM: true };
    const parser = new Parser(opts);
    const csv = parser.parse(rows);
    
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment(`모델별이미지_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// ============= 관리자 API 끝 =============

// 메인 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 이미지 정적 파일 서빙
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT}에서 실행 중입니다.`);
});