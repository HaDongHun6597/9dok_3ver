// auth 서버 테스트
async function testAuthServer() {
  try {
    console.log('1. Auth 서버 상태 확인...');
    const healthResponse = await fetch('https://auth.lgemart.com/health');
    console.log('Health check 응답:', healthResponse.status);
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('서버 상태:', health);
    }

    console.log('\n2. 로그인 테스트...');
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
    
    console.log('로그인 응답:', loginResponse.status);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('로그인 성공:', {
        user: loginData.user.username,
        hasToken: !!loginData.access_token
      });
      
      // 토큰으로 admin/stats 테스트
      if (loginData.access_token) {
        console.log('\n3. Admin stats API 테스트...');
        const statsResponse = await fetch('https://auth.lgemart.com/admin/stats', {
          headers: {
            'Authorization': `Bearer ${loginData.access_token}`
          }
        });
        
        console.log('Stats API 응답:', statsResponse.status);
        
        if (statsResponse.ok) {
          const stats = await statsResponse.json();
          console.log('Stats 데이터:', {
            hasOverview: !!stats.overview,
            overviewKeys: stats.overview ? Object.keys(stats.overview) : 'undefined',
            hasBranchStats: !!stats.branch_stats,
            hasRecentActivity: !!stats.recent_activity
          });
        } else {
          const error = await statsResponse.text();
          console.error('Stats API 에러:', error);
        }
      }
    } else {
      const error = await loginResponse.text();
      console.error('로그인 실패:', error);
    }
    
  } catch (error) {
    console.error('테스트 실패:', error.message);
  }
}

// Node.js fetch polyfill
const fetch = require('node-fetch');
testAuthServer();