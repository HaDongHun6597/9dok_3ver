// 워터마크 표시 함수
async function displayWatermark() {
    try {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        console.log('토큰:', token ? '있음' : '없음');
        
        const response = await fetch('/api/user-info', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('API 응답 상태:', response.status);
        
        if (response.ok) {
            const userInfo = await response.json();
            console.log('받은 사용자 정보:', userInfo);
            
            // 기존 워터마크 제거
            const existingWatermark = document.querySelector('.watermark');
            if (existingWatermark) {
                existingWatermark.remove();
            }
            
            // 워터마크 요소 생성
            const watermark = document.createElement('div');
            watermark.className = 'watermark';
            
            // 사용자 정보 구성
            let userInfoText = userInfo.name || '사용자';
            if (userInfo.position) userInfoText += ` / ${userInfo.position}`;
            if (userInfo.branch) userInfoText += ` / ${userInfo.branch}`;
            userInfoText += ` / ${userInfo.company || 'KTCS'}`;
            
            // IP 정보 (realIp만 사용)
            const ipText = userInfo.realIp || 'IP 정보 없음';
            
            watermark.innerHTML = `
                <div class="user-info">${userInfoText}</div>
                <div class="ip-info">${ipText}</div>
            `;
            
            document.body.appendChild(watermark);
        } else {
            // 인증 없이도 기본 워터마크 표시
            const watermark = document.createElement('div');
            watermark.className = 'watermark';
            watermark.innerHTML = `
                <div class="user-info">미인증 사용자 / KTCS</div>
                <div class="ip-info">정보 없음</div>
            `;
            document.body.appendChild(watermark);
        }
    } catch (error) {
        console.error('워터마크 표시 오류:', error);
        // 오류 시에도 기본 워터마크 표시
        const watermark = document.createElement('div');
        watermark.className = 'watermark';
        watermark.innerHTML = `
            <div class="user-info">사용자 정보 없음 / KTCS</div>
            <div class="ip-info">정보 없음</div>
        `;
        document.body.appendChild(watermark);
    }
}

// DOM이 준비되었을 때 워터마크 표시
document.addEventListener('DOMContentLoaded', () => {
    console.log('워터마크 초기화');
    displayWatermark();
});

// 전역 함수로 노출
window.displayWatermark = displayWatermark;