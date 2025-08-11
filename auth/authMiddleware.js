const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT 시크릿 키 (실제 인증 서버와 동일한 키 사용)
const JWT_SECRET = process.env.JWT_SECRET || 'synology_auth_jwt_secret_key_2024_very_secure';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'synology_auth_refresh_secret_key_2024_very_secure';

// JWT 설정
const JWT_ISSUER = process.env.JWT_ISSUER || 'synology-auth';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'synology-apps';

// LGEmart 인증 서버 설정
const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || 'https://auth.lgemart.com';

class AuthClient {
  constructor(authServerUrl = AUTH_SERVER_URL, jwtSecret = JWT_SECRET, jwtRefreshSecret = JWT_REFRESH_SECRET) {
    this.authServerUrl = authServerUrl;
    this.jwtSecret = jwtSecret;
    this.jwtRefreshSecret = jwtRefreshSecret;
    this.issuer = JWT_ISSUER;
    this.audience = JWT_AUDIENCE;
  }

  // JWT Access Token 검증
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: this.issuer,
        audience: this.audience
      });
      
      // 사용자 정보 매핑 (가이드 문서와 일치)
      const user = {
        id: decoded.sub,  // 사용자 ID는 sub 필드에 저장
        employee_id: decoded.employee_id || decoded.sub,
        username: decoded.username,
        email: decoded.email,
        company: decoded.company,
        team: decoded.team,
        branch: decoded.branch,
        position: decoded.position,
        distribution: decoded.distribution,
        is_admin: decoded.isAdmin === true || decoded.is_admin === true,
        isAdmin: decoded.isAdmin === true || decoded.is_admin === true,
        is_active: decoded.is_active !== false, // 기본값 true
        apps: decoded.apps || [],
        permissions: decoded.permissions || {}
      };
      return { success: true, user, decoded };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return { success: false, error: 'TOKEN_EXPIRED', message: '토큰이 만료되었습니다.' };
      } else if (error.name === 'JsonWebTokenError') {
        return { success: false, error: 'INVALID_TOKEN', message: '유효하지 않은 토큰입니다.' };
      }
      return { success: false, error: 'VERIFY_FAILED', message: '토큰 검증에 실패했습니다.' };
    }
  }

  // JWT Refresh Token 검증
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtRefreshSecret, {
        issuer: this.issuer,
        audience: this.audience
      });
      return { success: true, payload: decoded };
    } catch (error) {
      return { success: false, error: 'INVALID_REFRESH_TOKEN', message: '유효하지 않은 리프레시 토큰입니다.' };
    }
  }

  // Bearer 토큰 추출
  extractBearerToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  // 토큰 해시 생성 (세션 검증용)
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
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
  return async (req, res, next) => {
    const token = authClient.extractBearerToken(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({ error: '토큰이 필요합니다.' });
    }

    const result = authClient.verifyToken(token);
    
    if (!result.success) {
      if (result.error === 'TOKEN_EXPIRED') {
        return res.status(401).json({ 
          error: result.message,
          code: result.error 
        });
      }
      return res.status(403).json({ 
        error: result.message,
        code: result.error 
      });
    }

    // 선택사항: 세션 검증 (서버에서 세션 유효성 확인)
    // 현재는 로컬 검증만 수행, 필요시 아래 주석 해제
    /*
    try {
      const currentUser = await authClient.getCurrentUser(token);
      if (!currentUser) {
        return res.status(401).json({ error: '세션이 만료되었습니다.' });
      }
      req.user = currentUser;
    } catch (error) {
      // 세션 검증 실패 시 로컬 토큰 정보 사용
      req.user = result.user;
    }
    */
    
    req.user = result.user;
    req.token = token;
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