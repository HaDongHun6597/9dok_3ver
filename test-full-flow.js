// 전체 플로우 테스트
const fetch = require('node-fetch');

async function testFullFlow() {
  try {
    console.log('=== 전체 플로우 테스트 시작 ===\n');

    // 1. 로그인
    console.log('1. 로그인 시도...');
    const loginResponse = await fetch('https://auth.lgemart.com/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        employee_id: '1017701',
        password: '1017701aA!@'
      })
    });
    
    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      console.error('❌ 로그인 실패:', error);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ 로그인 성공:', {
      user: loginData.user.username,
      employee_id: loginData.user.employee_id,
      is_admin: loginData.user.is_admin
    });
    
    const accessToken = loginData.access_token;
    
    // 2. Admin stats API 호출
    console.log('\n2. Admin Stats API 호출...');
    const statsResponse = await fetch('https://auth.lgemart.com/admin/stats', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Stats 응답 상태:', statsResponse.status);
    console.log('Stats 응답 헤더:', statsResponse.headers.get('content-type'));
    
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('✅ Stats 성공:', {
        overview: stats.overview,
        branch_stats_count: stats.branch_stats ? stats.branch_stats.length : 0,
        recent_activity_count: stats.recent_activity ? stats.recent_activity.length : 0
      });
    } else {
      const errorText = await statsResponse.text();
      console.error('❌ Stats 실패:', errorText);
      
      // 상태 코드별 분석
      if (statsResponse.status === 401) {
        console.log('🔍 인증 실패 - 토큰 또는 세션 문제');
      } else if (statsResponse.status === 403) {
        console.log('🔍 권한 없음 - 관리자 권한 필요');
      } else if (statsResponse.status === 500) {
        console.log('🔍 서버 에러 - DB 쿼리 또는 코드 문제');
      }
    }
    
    // 3. 로그아웃
    console.log('\n3. 로그아웃 시도...');
    const logoutResponse = await fetch('https://auth.lgemart.com/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('로그아웃 상태:', logoutResponse.status);
    if (logoutResponse.ok) {
      console.log('✅ 로그아웃 성공');
    } else {
      const logoutError = await logoutResponse.text();
      console.log('❌ 로그아웃 실패:', logoutError);
    }
    
  } catch (error) {
    console.error('🚨 테스트 중 예외 발생:', error.message);
  }
}

testFullFlow();