// admin/users API 직접 테스트
const fetch = require('node-fetch');

async function testAdminUsers() {
  try {
    // 1. 로그인
    console.log('1. 로그인...');
    const loginResponse = await fetch('https://auth.lgemart.com/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: '1017701',
        password: '1017701aA!@'
      })
    });
    
    if (!loginResponse.ok) {
      console.error('로그인 실패:', await loginResponse.text());
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ 로그인 성공');
    
    // 2. Admin users API 호출
    console.log('\n2. Admin users API 호출...');
    const usersResponse = await fetch('https://auth.lgemart.com/admin/users?page=1&limit=20&search=&branch=', {
      headers: {
        'Authorization': `Bearer ${loginData.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Users API 상태:', usersResponse.status);
    console.log('Content-Type:', usersResponse.headers.get('content-type'));
    
    if (usersResponse.ok) {
      const users = await usersResponse.json();
      console.log('✅ Users API 성공:', {
        userCount: users.users ? users.users.length : 0,
        hasPagination: !!users.pagination,
        totalUsers: users.pagination ? users.pagination.total : 'unknown'
      });
    } else {
      const errorText = await usersResponse.text();
      console.error('❌ Users API 실패:', errorText);
    }
    
  } catch (error) {
    console.error('🚨 테스트 실패:', error.message);
  }
}

testAdminUsers();