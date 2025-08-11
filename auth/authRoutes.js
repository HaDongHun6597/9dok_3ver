const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { AuthClient } = require('./authMiddleware');

const router = express.Router();
const authClient = new AuthClient();

// Axios 인스턴스 생성
const apiClient = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': '9dok_3-Client/1.0'
  },
  // HTTPS 연결을 위한 설정
  validateStatus: function (status) {
    return status < 500; // 500 미만의 상태 코드는 성공으로 처리
  }
});

// 로그인 처리 (프록시 역할)
router.post('/login', async (req, res) => {
  try {
    const { employee_id, password } = req.body;
    
    if (!employee_id || !password) {
      return res.status(400).json({ error: '사번과 비밀번호가 필요합니다.' });
    }

    // 개발/테스트용 Mock 계정 처리
    if (process.env.NODE_ENV === 'development' && employee_id === 'test' && password === 'test123') {
      // Mock JWT 토큰 생성 (실제 형식과 동일하게)
      const mockUser = {
        sub: '999',  // 사용자 ID
        employee_id: 'test',
        username: '테스트 사용자',
        email: 'test@ktcs.com',
        company: 'KTCS',
        team: 'IT팀',
        branch: '테스트',
        position: '개발자',
        distribution: '유통',
        isAdmin: true,
        is_active: true,
        apps: [],
        permissions: {}
      };
      
      const accessToken = jwt.sign(
        mockUser,
        process.env.JWT_SECRET || 'synology_auth_jwt_secret_key_2024_very_secure',
        {
          expiresIn: '1h',
          issuer: process.env.JWT_ISSUER || 'synology-auth',
          audience: process.env.JWT_AUDIENCE || 'synology-apps'
        }
      );
      
      const refreshToken = jwt.sign(
        { sub: mockUser.sub, employee_id: mockUser.employee_id },
        process.env.JWT_REFRESH_SECRET || 'synology_auth_refresh_secret_key_2024_very_secure',
        {
          expiresIn: '7d',
          issuer: process.env.JWT_ISSUER || 'synology-auth',
          audience: process.env.JWT_AUDIENCE || 'synology-apps'
        }
      );
      
      return res.json({
        message: '로그인 성공',
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken
        },
        user: {
          id: 999,
          employee_id: 'test',
          username: '테스트 사용자',
          email: 'test@ktcs.com',
          company: 'KTCS',
          team: 'IT팀',
          branch: '테스트',
          position: '개발자',
          is_admin: true,
          is_active: true,
          must_change_password: false
        }
      });
    }

    // 실제 인증 서버에 로그인 요청
    console.log(`Attempting login to: ${authClient.authServerUrl}/auth/login`);
    console.log(`Employee ID: ${employee_id}`);
    
    try {
      const response = await apiClient.post(`${authClient.authServerUrl}/auth/login`, {
        employee_id,
        password
      });

      console.log(`Auth server response status: ${response.status}`);
      
      // 인증 서버 응답 형식 확인 및 표준화
      const authData = response.data;
      
      // tokens 객체가 없으면 access_token, refresh_token을 tokens로 묶기
      if (!authData.tokens && authData.access_token) {
        authData.tokens = {
          access_token: authData.access_token,
          refresh_token: authData.refresh_token
        };
        delete authData.access_token;
        delete authData.refresh_token;
      }
      
      res.json(authData);
    } catch (axiosError) {
      console.error('Auth server connection error:', axiosError.message);
      
      if (axiosError.response) {
        // 서버에서 응답을 받았지만 오류 상태코드
        console.log('Auth server error response:', axiosError.response.data);
        console.log('Status:', axiosError.response.status);
        return res.status(axiosError.response.status).json(axiosError.response.data);
      } else if (axiosError.request) {
        // 요청이 전송되었지만 응답을 받지 못함
        console.error('No response received:', axiosError.request);
        return res.status(500).json({ error: '인증 서버가 응답하지 않습니다.' });
      } else {
        // 요청 설정 중 오류 발생
        console.error('Request setup error:', axiosError.message);
        return res.status(500).json({ error: '요청 처리 중 오류가 발생했습니다.' });
      }
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 토큰 갱신
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({ error: '리프레시 토큰이 필요합니다.' });
    }

    // 리프레시 토큰 검증
    const refreshResult = authClient.verifyRefreshToken(refresh_token);
    
    // 개발 환경 Mock 토큰 처리
    if (process.env.NODE_ENV === 'development' && refreshResult.success && refreshResult.payload.employee_id === 'test') {
      const mockUser = {
        sub: refreshResult.payload.sub,
        employee_id: 'test',
        username: '테스트 사용자',
        email: 'test@ktcs.com',
        company: 'KTCS',
        team: 'IT팀',
        branch: '테스트',
        position: '개발자',
        distribution: '유통',
        isAdmin: true,
        is_active: true,
        apps: [],
        permissions: {}
      };
      
      const newAccessToken = jwt.sign(
        mockUser,
        process.env.JWT_SECRET || 'synology_auth_jwt_secret_key_2024_very_secure',
        {
          expiresIn: '1h',
          issuer: process.env.JWT_ISSUER || 'synology-auth',
          audience: process.env.JWT_AUDIENCE || 'synology-apps'
        }
      );
      
      const newRefreshToken = jwt.sign(
        { sub: mockUser.sub, employee_id: mockUser.employee_id },
        process.env.JWT_REFRESH_SECRET || 'synology_auth_refresh_secret_key_2024_very_secure',
        {
          expiresIn: '7d',
          issuer: process.env.JWT_ISSUER || 'synology-auth',
          audience: process.env.JWT_AUDIENCE || 'synology-apps'
        }
      );
      
      return res.json({
        tokens: {
          access_token: newAccessToken,
          refresh_token: newRefreshToken
        }
      });
    }

    // 실제 인증 서버에 토큰 갱신 요청
    try {
      const response = await apiClient.post(`${authClient.authServerUrl}/auth/refresh`, {
        refresh_token
      });
      
      const data = response.data;
      
      // 응답 형식 표준화
      if (!data.tokens && data.access_token) {
        data.tokens = {
          access_token: data.access_token,
          refresh_token: data.refresh_token
        };
        delete data.access_token;
        delete data.refresh_token;
      }
      
      res.json(data);
    } catch (error) {
      console.error('Token refresh error:', error.message);
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      res.status(401).json({ error: '토큰 갱신에 실패했습니다.' });
    }
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: error.message });
  }
});

// 로그아웃
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // 인증 서버에 로그아웃 요청
      await fetch(`${authClient.authServerUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(err => console.error('Logout server error:', err));
    }

    res.json({ message: '로그아웃되었습니다.' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: '로그아웃 중 오류가 발생했습니다.' });
  }
});

// 현재 사용자 정보 조회
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: '토큰이 필요합니다.' });
    }

    // 토큰 검증
    const result = authClient.verifyToken(token);
    
    // 개발 환경 Mock 토큰 처리
    if (process.env.NODE_ENV === 'development' && result.success && result.user.employee_id === 'test') {
      return res.json({ 
        user: {
          id: result.user.id,
          employee_id: result.user.employee_id,
          username: result.user.username,
          email: result.user.email,
          company: result.user.company,
          team: result.user.team,
          branch: result.user.branch,
          position: result.user.position,
          distribution: result.user.distribution,
          is_admin: result.user.is_admin,
          is_active: result.user.is_active,
          last_login: new Date().toISOString()
        }
      });
    }
    
    if (!result.success) {
      // 토큰이 유효하지 않으면 인증 서버에 직접 요청
    } else {
      // 토큰이 유효하면 서버에서 최신 사용자 정보 가져오기 (선택사항)
    }
    
    // 인증 서버에 사용자 정보 요청
    try {
      const response = await apiClient.get(`${authClient.authServerUrl}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      res.json(response.data);
    } catch (fetchError) {
      console.error('Auth server fetch error:', fetchError.message);
      if (fetchError.response) {
        if (fetchError.response.status === 401) {
          return res.status(401).json({ error: '토큰이 만료되었습니다.' });
        }
        return res.status(fetchError.response.status).json(fetchError.response.data);
      }
      return res.status(500).json({ error: '인증 서버 연결 실패' });
    }
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ error: '사용자 정보 조회 실패' });
  }
});

// 비밀번호 변경
router.post('/change-password', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const { current_password, new_password } = req.body;

    if (!token) {
      return res.status(401).json({ error: '토큰이 필요합니다.' });
    }

    if (!current_password || !new_password) {
      return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호가 필요합니다.' });
    }

    try {
      const response = await apiClient.post(`${authClient.authServerUrl}/auth/change-password`, {
        current_password,
        new_password
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Password change response:', response.data);
      res.json(response.data);
    } catch (axiosError) {
      console.error('Password change error:', axiosError.message);
      
      if (axiosError.response) {
        console.log('Password change error response:', axiosError.response.data);
        return res.status(axiosError.response.status).json(axiosError.response.data);
      } else if (axiosError.request) {
        return res.status(500).json({ error: '인증 서버가 응답하지 않습니다.' });
      } else {
        return res.status(500).json({ error: '요청 처리 중 오류가 발생했습니다.' });
      }
    }
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;