// 워터마크 표시 함수
async function displayWatermark() {
    try {
        const token = localStorage.getItem('access_token');
        console.log('토큰:', token ? '있음' : '없음');
        
        const response = await fetch('/api/user-info', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('API 응답 상태:', response.status);
        
        let userInfoText = '사용자 정보 없음 / KTCS';
        let ipText = '정보 없음';
        
        if (response.ok) {
            const userInfo = await response.json();
            console.log('받은 사용자 정보:', userInfo);
            
            // 사용자 정보 구성
            userInfoText = userInfo.name || '사용자';
            if (userInfo.position) userInfoText += ` / ${userInfo.position}`;
            if (userInfo.branch) userInfoText += ` / ${userInfo.branch}`;
            userInfoText += ` / ${userInfo.company || 'KTCS'}`;
            
            // IP 정보 (realIp만 사용)
            ipText = userInfo.realIp || 'IP 정보 없음';
        }
        
        // 기존 워터마크 컨테이너 제거
        const existingContainer = document.querySelector('.watermark-container');
        if (existingContainer) {
            existingContainer.remove();
        }
        
        // 워터마크 컨테이너 생성
        const container = document.createElement('div');
        container.className = 'watermark-container';
        
        // 화면 크기 계산
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // 워터마크 간격 (픽셀)
        const spacing = 450; // 워터마크 간의 간격 (더 넓게)
        
        // 헤더 영역 높이 (상단 120px 정도는 워터마크 제외)
        const headerOffset = 120;
        
        // 필요한 워터마크 개수 계산 (여유 있게)
        const cols = Math.ceil(screenWidth / spacing) + 2;
        const rows = Math.ceil((screenHeight - headerOffset) / spacing) + 2;
        
        // 워터마크 생성
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const watermark = document.createElement('div');
                watermark.className = 'watermark';
                
                // 위치 계산 (헤더 영역 아래부터 시작)
                const x = col * spacing - spacing;
                const y = row * spacing - spacing + headerOffset;
                
                watermark.style.left = `${x}px`;
                watermark.style.top = `${y}px`;
                watermark.style.transform = 'rotate(-45deg)'; // 6시 30분에서 12시 30분 방향 (약 -45도)
                
                watermark.innerHTML = `
                    <div class="user-info">${userInfoText}</div>
                    <div class="ip-info">${ipText}</div>
                `;
                
                container.appendChild(watermark);
            }
        }
        
        document.body.appendChild(container);
        
    } catch (error) {
        console.error('워터마크 표시 오류:', error);
        // 오류 시에도 기본 워터마크 표시
        createDefaultWatermarks();
    }
}

// 기본 워터마크 생성 함수
function createDefaultWatermarks() {
    const existingContainer = document.querySelector('.watermark-container');
    if (existingContainer) {
        existingContainer.remove();
    }
    
    const container = document.createElement('div');
    container.className = 'watermark-container';
    
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const spacing = 450; // 더 넓은 간격
    const headerOffset = 120; // 헤더 영역 제외
    const cols = Math.ceil(screenWidth / spacing) + 2;
    const rows = Math.ceil((screenHeight - headerOffset) / spacing) + 2;
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const watermark = document.createElement('div');
            watermark.className = 'watermark';
            
            const x = col * spacing - spacing;
            const y = row * spacing - spacing + headerOffset;
            
            watermark.style.left = `${x}px`;
            watermark.style.top = `${y}px`;
            watermark.style.transform = 'rotate(-45deg)'; // 더 경사진 각도
            
            watermark.innerHTML = `
                <div class="user-info">사용자 정보 없음 / KTCS</div>
                <div class="ip-info">정보 없음</div>
            `;
            
            container.appendChild(watermark);
        }
    }
    
    document.body.appendChild(container);
}

// DOM이 준비되었을 때 워터마크 표시
document.addEventListener('DOMContentLoaded', () => {
    console.log('워터마크 초기화');
    displayWatermark();
});

// 화면 크기 변경 시 워터마크 재생성
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        console.log('화면 크기 변경 - 워터마크 재생성');
        displayWatermark();
    }, 250); // 250ms 디바운싱
});

// 전역 함수로 노출
window.displayWatermark = displayWatermark;