const jwt = require('jsonwebtoken');

// JWT 시크릿 키 (실제 인증 서버와 동일한 키 사용)
const JWT_SECRET = process.env.JWT_SECRET || 'synology-auth-secret-key';

// LGEmart 인증 서버 설정 (운영 서버 사용)
const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || 'https://auth.lgemart.com';

class AuthClient {
  constructor(authServerUrl = AUTH_SERVER_URL, jwtSecret = JWT_SECRET) {
    this.authServerUrl = authServerUrl;
    this.jwtSecret = jwtSecret;
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

      const decoded = jwt.verify(token, this.jwtSecret);
      // isAdmin을 is_admin으로 매핑, 숫자 1도 true로 변환
      const user = {
        ...decoded,
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

  // 사용자 정보 조회 (인증 서버에서)
  async getCurrentUser(accessToken) {
    try {
      const response = await fetch(`${this.authServerUrl}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.status === 401) {
        throw new Error('토큰이 만료되었습니다.');
      }

      if (!response.ok) {
        throw new Error('사용자 정보 조회 실패');
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      throw new Error(`사용자 정보 조회 실패: ${error.message}`);
    }
  }

  // 토큰 갱신
  async refreshAccessToken(refreshToken) {
    try {
      const response = await fetch(`${this.authServerUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: refreshToken
        })
      });

      if (!response.ok) {
        throw new Error('토큰 갱신 실패');
      }

      const data = await response.json();
      return data.tokens;
    } catch (error) {
      throw new Error(`토큰 갱신 실패: ${error.message}`);
    }
  }
}

// 인증 미들웨어
function authenticateToken(authClient) {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: '토큰이 필요합니다.' });
    }

    const result = authClient.verifyToken(token);
    if (!result.success) {
      return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
    }

    req.user = result.user;
    next();
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
  if (!req.user || !req.user.is_active) {
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