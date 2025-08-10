// 채널별 설정 정보
const CHANNEL_CONFIGS = {
    em: {
        name: '이마트',
        displayName: '구독간편조회',
        colors: {
            primary: '#4CAF50',
            primaryHover: '#45a049'
        }
    },
    hp: {
        name: '홈플러스',
        displayName: '구독간편조회 - 홈플러스',
        colors: {
            primary: '#ff5722',
            primaryHover: '#d84315'
        }
    },
    et: {
        name: '전자랜드',
        displayName: '구독간편조회 - 전자랜드',
        colors: {
            primary: '#2196F3',
            primaryHover: '#0D47A1'
        }
    }
};

// 현재 경로에서 채널 감지
function getCurrentChannel() {
    const path = window.location.pathname;
    if (path.includes('/hp')) return 'hp';
    if (path.includes('/et')) return 'et';
    return 'em'; // 기본값
}

// 채널별 스타일 적용
function applyChannelStyles() {
    const channel = getCurrentChannel();
    const config = CHANNEL_CONFIGS[channel];
    
    if (!config) return;
    
    // 제목 설정
    document.title = config.displayName;
    const headerTitle = document.getElementById('headerTitle');
    if (headerTitle) {
        headerTitle.textContent = config.displayName;
    }
    
    // 채널별 색상 스타일 적용
    const style = document.createElement('style');
    style.textContent = `
        .header {
            background: linear-gradient(135deg, ${config.colors.primary}, ${config.colors.primaryHover}) !important;
        }
        .benefit-item.active {
            border-color: ${config.colors.primary} !important;
        }
        .final-total {
            background: linear-gradient(135deg, ${config.colors.primary}, ${config.colors.primaryHover}) !important;
        }
        .btn-primary {
            background: ${config.colors.primary} !important;
        }
        .btn-primary:hover:not(:disabled) {
            background: ${config.colors.primaryHover} !important;
        }
        .calculator-header {
            background: linear-gradient(135deg, ${config.colors.primary}, ${config.colors.primaryHover}) !important;
        }
    `;
    document.head.appendChild(style);
    
    // 전역 채널 변수 설정
    window.CHANNEL = channel;
}

// DOM이 로드되면 채널 설정 적용
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyChannelStyles);
} else {
    applyChannelStyles();
}