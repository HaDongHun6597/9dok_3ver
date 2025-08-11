const jwt = require('jsonwebtoken');

// JWT 시크릿 키 (실제 인증 서버와 동일한 키 사용)
const JWT_SECRET = process.env.JWT_SECRET || 'synology_auth_jwt_secret_key_2024_very_secure';
const JWT_ISSUER = 'synology-auth';
const JWT_AUDIENCE = 'synology-apps';

// LGEmart 인증 서버 설정 (운영 서버 사용)
const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || 'https://auth.lgemart.com';

class AuthClient {
  constructor(authServerUrl = AUTH_SERVER_URL, jwtSecret = JWT_SECRET, jwtRefreshSecret = null) {
    this.authServerUrl = authServerUrl;
    this.jwtSecret = jwtSecret;
    this.jwtRefreshSecret = jwtRefreshSecret;
  }

  // JWT 토큰 검증
  verifyToken(token) {
    try {
      // 테스트 토큰인 경우 (mock 토큰)
      if (token.startsWith('mock-access-token-')) {
        return {
          success: true,
          user: {
            id: 1,
            employee_id: token.includes('1017701') ? '1017701' : 'test',
            username: token.includes('1017701') ? '하동훈' : '테스트 사용자',
            company: 'KTcs',
            team: 'IT팀',
            is_admin: true,
            is_active: true
          }
        };
      }

      // issuer와 audience 검증 포함
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE
      });
      
      // isAdmin을 is_admin으로 매핑, 숫자 1도 true로 변환
      const user = {
        ...decoded,
        id: decoded.sub || decoded.id, // sub 필드가 실제 사용자 ID
        is_admin: decoded.isAdmin === 1 || decoded.isAdmin === true || decoded.is_admin === 1 || decoded.is_admin === true || false,
        isAdmin: decoded.isAdmin === 1 || decoded.isAdmin === true || decoded.is_admin === 1 || decoded.is_admin === true || false,
        employee_id: decoded.employee_id || decoded.sub,
        username: decoded.username || decoded.name,
        is_active: decoded.is_active !== false // 기본값 true
      };
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 사용자 정보 조회 (인증 서버에서) - server.js와 완전히 동일하게
  async getCurrentUser(accessToken) {
    const axios = require('axios');
    try {
      console.log('[getCurrentUser] 요청 시작:', `${this.authServerUrl}/user/profile`);
      console.log('[getCurrentUser] 토큰 길이:', accessToken.length);
      console.log('[getCurrentUser] 토큰 앞부분:', accessToken.substring(0, 50));
      
      const response = await axios.get(`${this.authServerUrl}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 5000
      });
      
      if (response.data && response.data.user) {
        console.log('[getCurrentUser] 응답 성공:', response.data.user.username);
        return response.data.user;
      }
      throw new Error('사용자 정보가 없습니다.');
    } catch (error) {
      console.error('[getCurrentUser] axios 에러:', error.response?.status, error.message);
      if (error.response) {
        console.error('[getCurrentUser] 에러 상세:', JSON.stringify(error.response.data));
      }
      console.error('[getCurrentUser] 사용된 URL:', `${this.authServerUrl}/user/profile`);
      console.error('[getCurrentUser] 사용된 토큰:', accessToken.substring(0, 30) + '...');
      
      if (error.response && error.response.status === 401) {
        throw new Error('토큰이 만료되었습니다.');
      }
      throw new Error(`사용자 정보 조회 실패: ${error.message}`);
    }
  }

  // 토큰 갱신
  async refreshAccessToken(refreshToken) {
    const axios = require('axios');
    try {
      const response = await axios.post(`${this.authServerUrl}/auth/refresh`, {
        refresh_token: refreshToken
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000
      });

      return response.data.tokens;
    } catch (error) {
      throw new Error(`토큰 갱신 실패: ${error.message}`);
    }
  }
}

// 인증 미들웨어 - auth-system에 완전히 위임 (pass-through)
function authenticateToken(authClient) {
  return async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: '토큰이 필요합니다.' });
    }

    // auth-system에 토큰 검증 요청 (pass-through)
    try {
      console.log('토큰 검증 시작:', token.substring(0, 20) + '...');
      console.log('authenticateToken - 토큰 길이:', token.length);
      console.log('authenticateToken - 토큰 첫 50자:', token.substring(0, 50));
      console.log('authenticateToken - 토큰 마지막 20자:', token.substring(token.length - 20));
      const user = await authClient.getCurrentUser(token);
      console.log('토큰 검증 성공, 사용자:', user.username);
      req.user = user;
      next();
    } catch (error) {
      console.error('Auth system 검증 실패:', error.message);
      console.error('Auth URL:', authClient.authServerUrl);
      return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
    }
  };
}

// 관리자 권한 확인 미들웨어
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }
  next();
}

// 활성 사용자 확인 미들웨어
function requireActiveUser(req, res, next) {
  console.log('[requireActiveUser] 사용자 상태:', {
    user: req.user ? '있음' : '없음',
    is_active: req.user?.is_active,
    username: req.user?.username
  });
  
  if (!req.user || !req.user.is_active) {
    console.log('[requireActiveUser] 비활성 사용자로 차단됨');
    return res.status(403).json({ error: '비활성 사용자입니다.' });
  }
  next();
}

module.exports = {
  AuthClient,
  authenticateToken,
  requireAdmin,
  requireActiveUser
};