class AuthClient {
  constructor(authServerUrl = '/auth') {
    // 항상 루트 경로의 /auth를 사용하도록 수정
    this.authServerUrl = window.location.origin + '/auth';
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
    console.log('🏗️ AuthClient constructor - tokens loaded:', {
      accessToken: !!this.accessToken,
      refreshToken: !!this.refreshToken,
      path: window.location.pathname,
      authServerUrl: this.authServerUrl
    });
  }

  async login(employeeId, password) {
    try {
      const response = await fetch(`${this.authServerUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: employeeId,
          password: password
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '로그인 실패' }));
        throw new Error(errorData.error || '로그인 실패');
      }

      const data = await response.json();
      console.log('Login response data:', data); // 디버깅용
      
      // 토큰 저장 (실제 서버 응답 구조에 맞춤)
      if (data.access_token) {
        this.accessToken = data.access_token;
        this.refreshToken = data.refresh_token;
      } else if (data.tokens) {
        this.accessToken = data.tokens.access_token;
        this.refreshToken = data.tokens.refresh_token;
      } else {
        throw new Error('응답에서 토큰을 찾을 수 없습니다.');
      }
      
      localStorage.setItem('access_token', this.accessToken);
      localStorage.setItem('refresh_token', this.refreshToken);
      localStorage.setItem('user_info', JSON.stringify(data.user));

      return { user: data.user, must_change_password: data.must_change_password };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async getCurrentUser(retryCount = 0) {
    if (!this.accessToken) {
      throw new Error('토큰이 없습니다.');
    }

    // 무한 루프 방지
    if (retryCount > 2) {
      console.log('Too many retries, logging out...');
      this.logout();
      throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
    }

    try {
      const response = await fetch(`${this.authServerUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        console.log(`Token expired or invalid (attempt ${retryCount + 1}), trying to refresh...`);
        
        // 토큰 만료, 갱신 시도
        try {
          await this.refreshAccessToken();
          return this.getCurrentUser(retryCount + 1); // 재시도 (카운트 증가)
        } catch (refreshError) {
          console.log('Token refresh failed, logging out...');
          // 갱신 실패 시 완전히 로그아웃
          this.logout();
          throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
        }
      }

      if (!response.ok) {
        throw new Error('사용자 정보 조회 실패');
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Get current user error:', error);
      // 네트워크 오류나 기타 에러의 경우도 로그아웃
      if (retryCount === 0) {
        console.log('Network or other error, logging out...');
        this.logout();
      }
      throw error;
    }
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('리프레시 토큰이 없습니다.');
    }

    try {
      const response = await fetch(`${this.authServerUrl}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: this.refreshToken
        })
      });

      if (!response.ok) {
        // 리프레시 토큰도 만료됨
        this.logout();
        throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
      }

      const data = await response.json();
      
      // 새 토큰으로 업데이트 (실제 서버 응답 구조에 맞춤)
      if (data.access_token) {
        this.accessToken = data.access_token;
        this.refreshToken = data.refresh_token;
      } else if (data.tokens) {
        this.accessToken = data.tokens.access_token;
        this.refreshToken = data.tokens.refresh_token;
      }
      
      if (!this.accessToken) {
        throw new Error('응답에서 토큰을 찾을 수 없습니다.');
      }
      localStorage.setItem('access_token', this.accessToken);
      localStorage.setItem('refresh_token', this.refreshToken);
    } catch (error) {
      console.error('Refresh token error:', error);
      throw error;
    }
  }

  async changePassword(currentPassword, newPassword) {
    if (!this.accessToken) {
      throw new Error('인증이 필요합니다.');
    }

    try {
      const response = await fetch(`${this.authServerUrl}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '비밀번호 변경 실패' }));
        throw new Error(errorData.error || '비밀번호 변경 실패');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  async logout() {
    if (this.accessToken) {
      try {
        await fetch(`${this.authServerUrl}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    // 토큰 삭제
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  // API 요청에 자동으로 토큰 포함
  async apiRequest(url, options = {}) {
    if (!this.accessToken) {
      throw new Error('인증이 필요합니다.');
    }

    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (response.status === 401 || response.status === 403) {
        // 토큰 만료, 갱신 시도
        await this.refreshAccessToken();
        // 재시도
        return fetch(url, {
          ...options,
          headers: {
            ...headers,
            'Authorization': `Bearer ${this.accessToken}`
          }
        });
      }

      return response;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }
}

// 전역 인스턴스
const authClient = new AuthClient();

// 로그인 폼 처리
function initializeAuth() {
  // 이미 인증된 경우 사용자 정보 표시
  if (authClient.isAuthenticated()) {
    // localStorage에서 사용자 정보 가져오기
    const storedUser = localStorage.getItem('user_info');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        showAuthenticatedState(user);
        
        // 채널 선택 페이지인 경우 채널 활성화
        if (window.location.pathname === '/' || window.location.pathname === '/channel-select.html') {
          const subtitle = document.getElementById('subtitle');
          const channels = document.getElementById('channels');
          if (subtitle) subtitle.textContent = '이용하실 채널을 선택해주세요';
          if (channels) {
            channels.style.opacity = '1';
            channels.style.pointerEvents = 'auto';
          }
        }
        return;
      } catch (e) {
        console.error('Failed to parse stored user info:', e);
      }
    }
    
    // 저장된 사용자 정보가 없으면 서버에서 가져오기
    authClient.getCurrentUser()
      .then(user => {
        localStorage.setItem('user_info', JSON.stringify(user));
        showAuthenticatedState(user);
        
        // 채널 선택 페이지인 경우 채널 활성화
        if (window.location.pathname === '/' || window.location.pathname === '/channel-select.html') {
          const subtitle = document.getElementById('subtitle');
          const channels = document.getElementById('channels');
          if (subtitle) subtitle.textContent = '이용하실 채널을 선택해주세요';
          if (channels) {
            channels.style.opacity = '1';
            channels.style.pointerEvents = 'auto';
          }
        }
      })
      .catch(error => {
        console.error('Failed to get user info:', error);
        // localStorage에 사용자 정보가 있으면 그것을 사용
        const storedUser = localStorage.getItem('user_info');
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            showAuthenticatedState(user);
            return;
          } catch (e) {
            console.error('Failed to parse stored user info:', e);
          }
        }
        // 사용자 정보가 전혀 없는 경우에만 메인으로 리다이렉트
        if (window.location.pathname.startsWith('/em') || 
            window.location.pathname.startsWith('/hp') || 
            window.location.pathname.startsWith('/et')) {
          window.location.href = '/';
        }
      });
    return;
  }
  
  // 인증되지 않은 경우
  // 채널 페이지에서는 메인으로 리다이렉트
  if (window.location.pathname.startsWith('/em') || 
      window.location.pathname.startsWith('/hp') || 
      window.location.pathname.startsWith('/et')) {
    window.location.href = '/';
  } else {
    // 메인 페이지에서는 로그인 폼 표시
    showLoginForm();
  }
}

// 로그인 폼 표시
function showLoginForm() {
  const loginHtml = `
    <style>
      @font-face {
        font-family: 'Dalmoori';
        src: url('/fonts/dalmoori.woff2') format('woff2');
        font-weight: normal;
        font-style: normal;
        font-display: swap;
      }
    </style>
    <div id="login-modal" class="modal" style="display: flex; align-items: center; justify-content: center; background: #f4f4f8; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1000; font-family: 'Pretendard', sans-serif;">
      <p style="font-family: 'Dalmoori', sans-serif; position: absolute; top: 30px; left: 30px; font-size: 18px; color: rgba(0, 0, 0, 0.15); margin: 0; padding: 0; z-index: 1001;">Designed by 하동훈</p>
      <img src="/ktcs_logo_black.png" alt="ktcs Logo" style="position: absolute; top: 25px; right: 30px; width: 60px; height: auto; opacity: 0.6; z-index: 1001;">
      <div class="modal-content" style="background: white; padding: 40px; width: 400px; max-width: 90vw; border-radius: 12px; border: 1px solid #dddddd; box-shadow: 3px 3px 8px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 45px;">
          <h2 style="font-family: 'Dalmoori', 'Pretendard', sans-serif; color: rgba(0, 0, 0, 0.8); font-weight: normal; font-size: 32px; margin: 0; letter-spacing: 2px;">구독 간편조회</h2>
        </div>
        <form id="login-form">
          <div style="margin-bottom: 20px;">
            <input type="text" id="employee_id" name="employee_id" required style="width: 100%; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; transition: border-color 0.2s; font-family: 'Pretendard', sans-serif; text-align: center;" placeholder="사번">
          </div>
          <div style="margin-bottom: 25px;">
            <input type="password" id="password" name="password" required style="width: 100%; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; transition: border-color 0.2s; font-family: 'Pretendard', sans-serif; text-align: center;" placeholder="비밀번호">
          </div>
          <button type="submit" style="width: 100%; padding: 14px; background: #333333; color: white; border: 1px solid #dddddd; border-radius: 8px; font-size: 18px; font-weight: normal; cursor: pointer; transition: all 0.3s ease; font-family: 'Dalmoori', sans-serif; box-shadow: 3px 3px 8px rgba(0,0,0,0.1);" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='6px 6px 12px rgba(0,0,0,0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='3px 3px 8px rgba(0,0,0,0.1)'" onmousedown="this.style.transform='translateY(1px)'; this.style.boxShadow='2px 2px 5px rgba(0,0,0,0.1)'">로그인</button>
        </form>
        <div id="login-error" style="color: #e91e63; background: rgba(233,30,99,0.1); padding: 10px; border-radius: 6px; margin-top: 15px; display: none; font-size: 14px; border-left: 3px solid #e91e63;"></div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', loginHtml);

  // 로그인 폼 이벤트 리스너
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const employeeId = document.getElementById('employee_id').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');

    try {
      const result = await authClient.login(employeeId, password);
      console.log('로그인 성공:', result);
      
      // 로그인 모달 제거
      document.getElementById('login-modal').remove();
      
      // 비밀번호 변경이 필요한 경우
      if (result.must_change_password) {
        showPasswordChangeModal();
      } else {
        showAuthenticatedState(result.user);
        
        // 채널 선택 페이지인 경우 채널 선택을 활성화
        if (window.location.pathname === '/' || window.location.pathname === '/channel-select.html') {
          document.getElementById('subtitle').textContent = '이용하실 채널을 선택해주세요';
          document.getElementById('channels').style.opacity = '1';
          document.getElementById('channels').style.pointerEvents = 'auto';
        } else {
          // 다른 페이지에서는 새로고침
          window.location.reload();
        }
      }
    } catch (error) {
      errorDiv.textContent = error.message;
      errorDiv.style.display = 'block';
    }
  });
}

// 인증된 상태 표시
function showAuthenticatedState(user) {
  // 사용자 정보 표시
  const userInfoHtml = `
    <div id="user-info" style="position: fixed; top: 15px; right: 100px; background: white; padding: 12px 16px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-family: 'Pretendard', sans-serif; border: 1px solid rgba(233,30,99,0.1);">
      <span style="font-size: 14px; font-weight: 500; color: #333;">👋 ${user.username}님 <span style="color: #888; font-weight: 400;">(${user.company})</span></span>
      <button onclick="handleLogout()" style="margin-left: 12px; padding: 6px 12px; background: linear-gradient(135deg, #e91e63, #ad1457); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; transition: transform 0.2s; font-family: 'Pretendard', sans-serif;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">로그아웃</button>
    </div>
  `;

  // 기존 사용자 정보 제거 후 추가
  const existingUserInfo = document.getElementById('user-info');
  if (existingUserInfo) {
    existingUserInfo.remove();
  }
  document.body.insertAdjacentHTML('beforeend', userInfoHtml);
}

// 로그아웃 처리
async function handleLogout() {
  try {
    await authClient.logout();
    document.getElementById('user-info').remove();
    showLoginForm();
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// 비밀번호 변경 모달 표시
function showPasswordChangeModal() {
  const changePasswordHtml = `
    <div id="change-password-modal" class="modal" style="display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.7); position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1000; font-family: 'Pretendard', sans-serif;">
      <div class="modal-content" style="background: white; padding: 30px; width: 460px; max-width: 90vw; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        <div style="text-align: center; margin-bottom: 25px;">
          <h2 style="background: linear-gradient(135deg, #e91e63, #ad1457); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; color: transparent; font-weight: 700; font-size: 22px; margin-bottom: 8px;">비밀번호 변경 필요</h2>
        </div>
        <div style="background: linear-gradient(135deg, rgba(233,30,99,0.1), rgba(173,20,87,0.1)); border: 1px solid rgba(233,30,99,0.2); border-radius: 8px; padding: 16px; margin-bottom: 25px; border-left: 4px solid #e91e63;">
          <p style="color: #ad1457; font-size: 14px; font-weight: 500; margin: 0;">
            🔒 <strong>최초 로그인</strong>입니다. 보안을 위해 새로운 비밀번호를 설정해주세요.
          </p>
        </div>
        <form id="change-password-form">
          <div style="margin-bottom: 18px;">
            <label for="current_password" style="display: block; font-weight: 500; color: #333; margin-bottom: 6px; font-size: 14px;">현재 비밀번호</label>
            <input type="password" id="current_password" name="current_password" required style="width: 100%; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; transition: border-color 0.2s; font-family: 'Pretendard', sans-serif;" placeholder="현재 비밀번호를 입력하세요">
          </div>
          <div style="margin-bottom: 18px;">
            <label for="new_password" style="display: block; font-weight: 500; color: #333; margin-bottom: 6px; font-size: 14px;">새 비밀번호</label>
            <input type="password" id="new_password" name="new_password" required style="width: 100%; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; transition: border-color 0.2s; font-family: 'Pretendard', sans-serif;" placeholder="새 비밀번호를 입력하세요">
            <small style="color: #888; font-size: 12px; display: block; margin-top: 4px;">💡 최소 8자리, 영문 대소문자, 숫자, 특수문자 포함</small>
          </div>
          <div style="margin-bottom: 25px;">
            <label for="confirm_password" style="display: block; font-weight: 500; color: #333; margin-bottom: 6px; font-size: 14px;">새 비밀번호 확인</label>
            <input type="password" id="confirm_password" name="confirm_password" required style="width: 100%; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; transition: border-color 0.2s; font-family: 'Pretendard', sans-serif;" placeholder="새 비밀번호를 다시 입력하세요">
          </div>
          <button type="submit" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #e91e63, #ad1457); color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; font-family: 'Pretendard', sans-serif;" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(233,30,99,0.3)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">비밀번호 변경</button>
        </form>
        <div id="change-password-error" style="color: #e91e63; background: rgba(233,30,99,0.1); padding: 12px; border-radius: 6px; margin-top: 15px; display: none; font-size: 14px; border-left: 3px solid #e91e63;"></div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', changePasswordHtml);

  // 비밀번호 변경 폼 이벤트 리스너
  document.getElementById('change-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPassword = document.getElementById('current_password').value;
    const newPassword = document.getElementById('new_password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    const errorDiv = document.getElementById('change-password-error');

    // 비밀번호 확인
    if (newPassword !== confirmPassword) {
      errorDiv.textContent = '새 비밀번호가 일치하지 않습니다.';
      errorDiv.style.display = 'block';
      return;
    }

    // 비밀번호 강도 검증
    if (newPassword.length < 8) {
      errorDiv.textContent = '비밀번호는 최소 8자리 이상이어야 합니다.';
      errorDiv.style.display = 'block';
      return;
    }

    try {
      await authClient.changePassword(currentPassword, newPassword);
      console.log('비밀번호 변경 성공');
      
      // 비밀번호 변경 모달 제거
      document.getElementById('change-password-modal').remove();
      
      // 비밀번호 변경 완료 후 처리
      alert('비밀번호가 성공적으로 변경되었습니다. 다시 로그인해주세요.');
      authClient.logout();
      
      // 채널 선택 페이지인 경우 로그인 모달만 다시 표시
      if (window.location.pathname === '/' || window.location.pathname === '/channel-select.html') {
        document.getElementById('subtitle').textContent = '먼저 로그인해주세요';
        document.getElementById('channels').style.opacity = '0.3';
        document.getElementById('channels').style.pointerEvents = 'none';
        showLoginForm();
      } else {
        window.location.reload();
      }
    } catch (error) {
      errorDiv.textContent = error.message;
      errorDiv.style.display = 'block';
    }
  });
}

// 강제 로그아웃 및 로그인 폼 표시 (테스트용)
function forceShowLogin() {
  console.log('Forcing logout and clearing all auth data...');
  
  // localStorage 완전 정리
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  
  // AuthClient 인스턴스도 정리
  authClient.accessToken = null;
  authClient.refreshToken = null;
  
  // 기존 사용자 정보 UI 제거
  const existingUserInfo = document.getElementById('user-info');
  if (existingUserInfo) {
    existingUserInfo.remove();
  }
  
  // 기존 로그인 모달 제거
  const existingModal = document.getElementById('login-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // 새 로그인 폼 표시
  showLoginForm();
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', initializeAuth);

// 전역 함수로 노출 (디버깅용)
window.authClient = authClient;
window.forceShowLogin = forceShowLogin;
window.initializeAuth = initializeAuth;