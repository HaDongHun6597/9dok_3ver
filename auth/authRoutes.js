const express = require('express');
const axios = require('axios');
const https = require('https');
const { AuthClient } = require('./authMiddleware');

const router = express.Router();
const authClient = new AuthClient();

// HTTPS 에이전트 설정 (SSL 인증서 검증 우회)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false // 개발환경에서만 사용
});

// Axios 인스턴스 생성
const apiClient = axios.create({
  httpsAgent: httpsAgent,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'LGEmart-Client/1.0'
  }
});

// 로그인 처리 (프록시 역할)
router.post('/login', async (req, res) => {
  try {
    const { employee_id, password } = req.body;
    
    if (!employee_id || !password) {
      return res.status(400).json({ error: '사번과 비밀번호가 필요합니다.' });
    }

    // Mock 계정 (특정 비밀번호가 일치할 때만)
    if ((employee_id === '1017701' || employee_id === 'test') && password === 'mock123') {
      const mockResponse = {
        message: '로그인 성공',
        access_token: 'mock-access-token-' + Date.now(),
        refresh_token: 'mock-refresh-token-' + Date.now(),
        user: {
          id: 1,
          employee_id: employee_id,
          username: employee_id === '1017701' ? '하동훈' : '테스트 사용자',
          company: 'KTcs',
          team: 'IT팀',
          branch: '서울본점',
          position: 'Staff',
          is_admin: true,
          is_active: true
        }
      };
      return res.json(mockResponse);
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
      console.log('Auth server response:', response.data);
      
      res.json(response.data);
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

    // Mock 리프레시 토큰 처리
    if (refresh_token.startsWith('mock-refresh-token-')) {
      const mockResponse = {
        access_token: 'mock-access-token-' + Date.now(),
        refresh_token: 'mock-refresh-token-' + Date.now(),
      };
      return res.json(mockResponse);
    }

    // 실제 토큰의 경우만 authClient 사용
    try {
      const tokens = await authClient.refreshAccessToken(refresh_token);
      res.json({ tokens });
    } catch (error) {
      console.error('Real token refresh error:', error);
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

    // 먼저 mock 토큰인지 확인
    const result = authClient.verifyToken(token);
    if (result.success) {
      return res.json({ user: result.user });
    }

    // mock 토큰이 아니면 인증 서버에 직접 사용자 정보 요청
    try {
      const response = await fetch(`${authClient.authServerUrl}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        return res.status(401).json({ error: '토큰이 만료되었습니다.' });
      }

      if (!response.ok) {
        return res.status(response.status).json({ error: '사용자 정보 조회 실패' });
      }

      const data = await response.json();
      res.json(data);
    } catch (fetchError) {
      console.error('Auth server fetch error:', fetchError);
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