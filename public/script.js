class SubscriptionCalculator {
    constructor() {
        this.selectedProducts = [];
        this.categories = [];
        this.modal = null;
        
        this.init();
    }
    
    async init() {
        console.log('SubscriptionCalculator 초기화 시작');
        
        // DOM이 완전히 로드될 때까지 대기
        if (document.readyState !== 'complete') {
            await new Promise(resolve => {
                window.addEventListener('load', resolve);
            });
        }
        
        await this.loadCategories();
        this.setupEventListeners();
        
        // 모달 초기화는 DOM 요소들이 확실히 존재한 후에 실행
        this.initModal();
        
        console.log('SubscriptionCalculator 초기화 완료');
    }
    
    initModal() {
        try {
            // ProductSelectionModal이 정의되어 있는지 확인
            if (typeof ProductSelectionModal === 'undefined') {
                console.error('ProductSelectionModal이 정의되지 않음');
                // window 객체에서 시도
                if (typeof window.ProductSelectionModal !== 'undefined') {
                    console.log('window.ProductSelectionModal 사용');
                    this.modal = new window.ProductSelectionModal(this);
                } else {
                    console.error('ProductSelectionModal을 찾을 수 없음');
                    return;
                }
            } else {
                this.modal = new ProductSelectionModal(this);
            }
            console.log('ProductSelectionModal 초기화 완료', this.modal);
        } catch (error) {
            console.error('ProductSelectionModal 초기화 실패:', error);
        }
    }
    
    toggleTotalCostDisplay(show) {
        const totalCostSections = document.querySelectorAll('.total-cost-section');
        totalCostSections.forEach(section => {
            if (show) {
                section.style.maxHeight = '500px';
            } else {
                section.style.maxHeight = '0';
            }
        });
        
        // 총금액 합산 표시도 체크박스에 따라 제어
        const totalCostSummary = document.getElementById('totalCostSummary');
        if (totalCostSummary) {
            totalCostSummary.style.display = show ? 'block' : 'none';
        }
    }
    
    async loadCategories() {
        try {
            // authClient가 정의되어 있는지 확인
            if (typeof authClient === 'undefined') {
                console.error('authClient가 정의되지 않음');
                // authClient 없이 직접 fetch 사용
                const token = localStorage.getItem('access_token');
                const response = await fetch('/api/categories', {
                    headers: {
                        'Authorization': token ? `Bearer ${token}` : ''
                    }
                });
                if (response.ok) {
                    this.categories = await response.json();
                    console.log('카테고리 로드 완료 (fetch):', this.categories.length, '개');
                } else {
                    console.error('카테고리 로딩 실패 (fetch):', response.status);
                }
            } else {
                // authClient 사용
                const response = await authClient.apiRequest('/api/categories');
                if (response.ok) {
                    this.categories = await response.json();
                    console.log('카테고리 로드 완료 (authClient):', this.categories.length, '개');
                } else {
                    console.error('카테고리 로딩 실패 (authClient):', response.status);
                }
            }
        } catch (error) {
            console.error('카테고리 로딩 실패:', error);
        }
    }
    
    setupEventListeners() {
        console.log('EventListener 설정 시작');
        
        // 총혜택 보기 체크박스
        const showTotalCostCheckbox = document.getElementById('showTotalCost');
        if (showTotalCostCheckbox) {
            showTotalCostCheckbox.addEventListener('change', (e) => {
                this.toggleTotalCostDisplay(e.target.checked);
            });
        }
        
        // 제품 추가 버튼
        const addProductCard = document.getElementById('addProductCard');
        if (addProductCard) {
            // 기존 이벤트 리스너 제거
            const newAddProductCard = addProductCard.cloneNode(true);
            addProductCard.parentNode.replaceChild(newAddProductCard, addProductCard);
            
            newAddProductCard.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('제품 추가 버튼 클릭됨');
                console.log('모달 상태:', this.modal);
                
                if (this.modal && typeof this.modal.openModal === 'function') {
                    console.log('모달 열기 시도');
                    this.modal.openModal();
                } else {
                    console.error('모달이 초기화되지 않음 또는 openModal 메서드가 없음');
                    // 다시 초기화 시도
                    this.initModal();
                    if (this.modal && typeof this.modal.openModal === 'function') {
                        this.modal.openModal();
                    }
                }
            });
            console.log('제품 추가 버튼 이벤트 리스너 등록됨');
        } else {
            console.error('addProductCard 요소를 찾을 수 없음');
        }
        
        // 초기 렌더링
        this.renderProductsGrid();
        this.updateCalculator();
        
        console.log('EventListener 설정 완료');
    }
    
    async renderProductsGrid() {
        // 체크박스 상태 저장
        const showTotalCostCheckbox = document.getElementById('showTotalCost');
        const wasChecked = showTotalCostCheckbox ? showTotalCostCheckbox.checked : false;
        
        const productsGrid = document.getElementById('productsGrid');
        const welcomeMessage = document.getElementById('welcomeMessage');
        const addProductCard = document.getElementById('addProductCard');
        
        console.log('제품 개수:', this.selectedProducts.length);
        
        // 기존 제품 카드 제거 (추가 버튼 제외)
        const existingProducts = productsGrid.querySelectorAll('.product-card');
        existingProducts.forEach(card => card.remove());
        
        // 제품이 있으면 웰컴 메시지 숨기고, 없으면 웰컴 메시지 표시
        if (this.selectedProducts.length > 0) {
            if (welcomeMessage) welcomeMessage.style.display = 'none';
            if (productsGrid) productsGrid.style.display = 'grid';
        } else {
            if (welcomeMessage) welcomeMessage.style.display = 'block';
            if (productsGrid) productsGrid.style.display = 'grid';
        }
        
        // 선택된 제품들을 각각 개별 카드로 표시 (같은 제품이라도 각각 다른 제휴카드 적용 가능)
        for (const [index, product] of this.selectedProducts.entries()) {
            const productCard = await this.createProductCard(product, index);
            productsGrid.appendChild(productCard); // 일단 맨 뒤에 추가
            
            // 폰트 크기 조정
            const productTitleElement = productCard.querySelector('.product-title');
            if (productTitleElement) {
                this.adjustFontSizeToFit(productTitleElement);
            }
        }
        
        // 제품 추가 버튼 위치 동적 조정
        this.repositionAddButton();
        
        // 제품 추가 버튼이 항상 보이도록 확인
        if (addProductCard) {
            addProductCard.style.display = 'flex';
            console.log('제품 추가 버튼 표시됨');
        } else {
            console.error('제품 추가 버튼을 찾을 수 없음');
        }
        
        // 체크박스 상태 복원 및 적용
        if (showTotalCostCheckbox && wasChecked) {
            showTotalCostCheckbox.checked = true;
            this.toggleTotalCostDisplay(true);
        }
    }
    
    async createProductCard(product, index) {
        const card = document.createElement('div');
        card.className = 'product-card clickable-card';
        
        // 카드 클릭 시 편집 모드로 진입
        card.addEventListener('click', (e) => {
            // 버튼 클릭은 제외
            if (!e.target.closest('button')) {
                this.editProduct(index);
            }
        });
        
        const monthlyFee = this.parsePrice(product['월요금']);
        const productGroup = product['제품군'] || '가전제품';
        
        // 제품군에 따른 폴백 아이콘
        const getProductIcon = (group) => {
            if (group.includes('TV')) return '📺';
            if (group.includes('냉장고')) return '🧊';
            if (group.includes('세탁기')) return '👕';
            if (group.includes('에어컨')) return '❄️';
            if (group.includes('건조기')) return '🌀';
            return '⚡';
        };
        
        // 선납 표시 로직
        const prepayment = product['선납'] || '선납없음';
        const prepaymentDisplay = (prepayment === '선납없음' || prepayment === '') ? '' : `<br>${prepayment}`;
        
        // 제휴카드 혜택 표시
        const partnerCard = product.partnerCard || null;
        const partnerCardDisplay = partnerCard ? 
            `<div class="partner-card-info">
                <div class="card-header">
                    <div class="card-title">💳 ${partnerCard.name}</div>
                    <button class="partner-card-btn small" onclick="calculator.openPartnerCardModal(${index})">${partnerCard ? '변경' : '연동'}</button>
                </div>
                <div class="card-benefit">${partnerCard.benefit || ''}</div>
            </div>` : '';
        
        // 초기 HTML 구조 (폴백 아이콘으로 먼저 표시)
        card.innerHTML = `
            <button class="product-remove-top" onclick="calculator.confirmRemoveProduct(${index})">×</button>
            <div class="product-header-content">
                <div class="product-image">${getProductIcon(productGroup)}</div>
                <div class="product-text-container">
                    <div class="product-title-row">
                        <div class="product-title">${product['모델명'] || '제품명 없음'}</div>
                    </div>
                    ${product['기준가'] ? `<div style="font-size: 12px; color: #666; margin: 2px 0; text-align: center; font-weight: bold;">기준가: ${parseInt(product['기준가']).toLocaleString()}원</div>` : ''}
                    <div class="product-specs">
                        ${product['결합유형'] || '-'} | ${product['계약기간'] || '-'}<br>
                        ${product['관리유형'] || '관리없음'} | ${product['방문주기'] || '방문없음'}${prepaymentDisplay}
                    </div>
                    <div class="care-service-section">
                        <button class="care-service-btn" onclick="calculator.openCareService(${index})">🛠️ 케어서비스</button>
                    </div>
                </div>
            </div>
            ${partnerCardDisplay}
            ${!partnerCard ? `<div class="product-actions">
                <button class="partner-card-btn" onclick="calculator.openPartnerCardModal(${index})">제휴카드 연동</button>
            </div>` : ''}
            <div class="product-price" style="display: block;">
                <div class="price-breakdown">
                    <div class="price-item monthly-fee">
                        <span class="price-label">월 구독료</span>
                        <span class="price-value">${this.formatPrice(monthlyFee)}</span>
                    </div>
                    ${partnerCard ? this.generatePeriodBasedPricing(product, monthlyFee) : ''}
                </div>
                ${this.generateTotalCostSection(product, monthlyFee, partnerCard)}
            </div>
        `;

        // 모델명 길이에 따른 폰트 크기 자동 조정
        const productTitleElement = card.querySelector('.product-title');
        const modelName = product['모델명'] || '제품명 없음';
        const textLength = modelName.length;
        
        let fontSize;
        if (textLength <= 10) {
            fontSize = '16px';
        } else if (textLength <= 15) {
            fontSize = '14px';
        } else if (textLength <= 20) {
            fontSize = '12px';
        } else if (textLength <= 30) {
            fontSize = '10px';
        } else if (textLength <= 40) {
            fontSize = '9px';
        } else {
            fontSize = '8px';
        }
        
        productTitleElement.style.fontSize = fontSize;

        // 비동기적으로 이미지 URL을 가져와서 업데이트
        try {
            const modelName = product['모델명'];
            if (modelName) {
                const response = await fetch(`/api/image/${encodeURIComponent(modelName)}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.imageUrl) {
                        const imageContainer = card.querySelector('.product-image');
                        imageContainer.innerHTML = `<img src="${data.imageUrl}" alt="${modelName}" style="width:100%; height:100%; object-fit:cover; border-radius: 8px;">`;
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching product image:', error);
        }
        
        return card;
    }
    
    generateTotalCostSection(product, monthlyFee, partnerCard) {
        const contractPeriod = product['계약기간'];
        if (!contractPeriod) return '';
        
        // 계약기간을 월 단위로 변환
        const contractMonths = parseInt(contractPeriod.replace('년', '')) * 12;
        
        // 총 월구독료 계산
        const totalMonthlyFee = monthlyFee * contractMonths;
        
        // 카드 혜택 계산
        let totalCardBenefit = 0;
        let promotionBenefit = 0;
        let basicBenefit = 0;
        
        if (partnerCard) {
            const periodInfo = this.calculatePeriodBasedDiscount(contractPeriod, partnerCard);
            
            // 프로모션 기간 혜택
            if (periodInfo.promotionPeriod > 0) {
                promotionBenefit = Math.min(partnerCard.promotionDiscount, monthlyFee) * periodInfo.promotionPeriod;
            }
            
            // 기본 혜택 기간
            if (periodInfo.basicPeriod > 0) {
                basicBenefit = Math.min(partnerCard.basicDiscount, monthlyFee) * periodInfo.basicPeriod;
            }
            
            totalCardBenefit = promotionBenefit + basicBenefit;
        }
        
        // 활성화(프로모션 할인) 혜택 계산
        const activationDiscount = this.parsePrice(product['활성화']) || 0;
        const promotionMonths = parseInt(product['프로모션할인종료월'] || '0');
        const totalActivationBenefit = activationDiscount * promotionMonths;
        
        // 결합할인 혜택 계산
        const combinationDiscount = this.parsePrice(product['할인금액']) || 0;
        const totalCombinationBenefit = combinationDiscount * contractMonths;
        
        // 총 혜택금액
        const totalBenefit = totalCardBenefit + totalActivationBenefit + totalCombinationBenefit;
        
        // 실제 지불 총액
        const actualTotalCost = totalMonthlyFee - totalBenefit;
        
        return `
            <div class="total-cost-section" style="border-top: 2px solid #e0e0e0; margin-top: 15px; padding-top: 15px; clear: both; width: 100%; max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
                <div style="background: #f8f8fc; padding: 12px; border-radius: 8px;">
                    <div style="font-size: 13px; font-weight: bold; color: #333; margin-bottom: 10px; text-align: center;">
                        계약기간(${contractPeriod}) 총 비용
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="font-size: 12px; color: #666;">총 월구독료:</span>
                        <span style="font-size: 12px; font-weight: bold; color: #333;">${this.formatPrice(totalMonthlyFee)}</span>
                    </div>
                    ${totalCardBenefit > 0 ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="font-size: 12px; color: #666;">총 카드혜택:</span>
                        <span style="font-size: 12px; font-weight: bold; color: #666;">-${this.formatPrice(totalCardBenefit)}</span>
                    </div>` : ''}
                    ${totalActivationBenefit > 0 ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="font-size: 12px; color: #666;">프로모션할인:</span>
                        <span style="font-size: 12px; font-weight: bold; color: #666;">-${this.formatPrice(totalActivationBenefit)}</span>
                    </div>` : ''}
                    ${totalCombinationBenefit > 0 ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="font-size: 12px; color: #666;">결합할인:</span>
                        <span style="font-size: 12px; font-weight: bold; color: #666;">-${this.formatPrice(totalCombinationBenefit)}</span>
                    </div>` : ''}
                    <div style="border-top: 1px solid #ddd; margin-top: 8px; padding-top: 8px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                            <span style="font-size: 12px; color: #666;">총 혜택금액:</span>
                            <span style="font-size: 12px; font-weight: bold; color: #666;">-${this.formatPrice(totalBenefit)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="font-size: 13px; font-weight: bold; color: #333;">실 지불총액:</span>
                            <span style="font-size: 14px; font-weight: bold; color: #A50034;">${this.formatPrice(actualTotalCost)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    generatePeriodBasedPricing(product, monthlyFee) {
        const partnerCard = product.partnerCard;
        const contractPeriod = product['계약기간'];
        
        console.log('generatePeriodBasedPricing 호출됨:', {
            partnerCard,
            contractPeriod,
            monthlyFee
        });
        
        if (!partnerCard || !contractPeriod) {
            console.log('partnerCard 또는 contractPeriod 없음');
            return '';
        }
        
        const periodInfo = this.calculatePeriodBasedDiscount(contractPeriod, partnerCard);
        console.log('계산된 기간 정보:', periodInfo);
        
        let pricingHTML = '';
        
        // 프로모션 기간이 있는 경우
        if (periodInfo.promotionPeriod > 0) {
            pricingHTML += `
                <div class="price-item discount promotion-period">
                    <span class="price-label">월 카드혜택 (${periodInfo.promotionPeriod}개월간)</span>
                    <span class="price-value discount-value">-${this.formatPrice(Math.min(partnerCard.promotionDiscount, monthlyFee))}</span>
                </div>
                <div class="price-item final-price promotion-final">
                    <span class="price-label">월 혜택가격 (${periodInfo.promotionPeriod}개월간)</span>
                    <span class="price-value final-value">${this.formatPrice(Math.max(0, monthlyFee - partnerCard.promotionDiscount))}</span>
                </div>
            `;
        }
        
        // 기본 혜택 기간이 있는 경우
        if (periodInfo.basicPeriod > 0) {
            const startMonth = periodInfo.promotionPeriod > 0 ? periodInfo.promotionPeriod + 1 : 1;
            const periodLabel = periodInfo.promotionPeriod > 0 
                ? `${startMonth}~${periodInfo.totalMonths}개월`
                : `${periodInfo.totalMonths}개월간`;
                
            pricingHTML += `
                <div class="price-item discount basic-period">
                    <span class="price-label">월 카드혜택 (${periodLabel})</span>
                    <span class="price-value discount-value">-${this.formatPrice(Math.min(partnerCard.basicDiscount, monthlyFee))}</span>
                </div>
                <div class="price-item final-price basic-final">
                    <span class="price-label">월 혜택가격 (${periodLabel})</span>
                    <span class="price-value final-value">${this.formatPrice(Math.max(0, monthlyFee - partnerCard.basicDiscount))}</span>
                </div>
            `;
        }
        
        return pricingHTML;
    }
    
    async addProductFromModal(product) {
        // 동일한 제품도 여러 대 구독 가능하므로 중복 체크 제거
        this.selectedProducts.push(product);
        
        // 제품이 2개 이상이 되면 모든 제품을 신규결합으로 변경
        await this.applyOptimalCombinationType();
        
        this.renderProductsGrid();
        this.updateCalculator();
        console.log('제품 추가됨:', product['모델명']);
    }
    
    confirmRemoveProduct(index) {
        const product = this.selectedProducts[index];
        const productName = product['모델명'] || '제품';
        
        const message = `"${productName}"을(를) 삭제하시겠습니까?\n\n삭제 후에는 되돌릴 수 없습니다.`;
        
        this.showConfirmDialog('제품 삭제', message, () => {
            this.removeProduct(index);
        });
    }

    async removeProduct(index) {
        console.log('제품 제거:', index);
        this.selectedProducts.splice(index, 1);
        
        // 제품 제거 후 결합유형 재적용
        await this.applyOptimalCombinationType();
        
        this.renderProductsGrid();
        this.updateCalculator();
    }
    
    editProduct(index) {
        console.log('제품 수정:', index);
        const product = this.selectedProducts[index];
        
        if (this.modal) {
            // 편집 모드로 모달 열기 (모델명 단계부터 시작)
            this.modal.openModalForEdit(product, index);
        } else {
            console.error('모달이 초기화되지 않음');
        }
    }

    // 케어서비스 열기 메서드
    async openCareService(productIndex) {
        try {
            const product = this.selectedProducts[productIndex];
            if (!product) {
                alert('제품 정보를 찾을 수 없습니다.');
                return;
            }

            const benefitCode = product['혜택구분자'];
            if (!benefitCode) {
                alert('이 제품의 케어서비스 정보가 없습니다.');
                return;
            }

            console.log('혜택구분자:', benefitCode);

            // 구독 혜택 정보 조회
            const response = await authClient.apiRequest('/api/subscription-benefits');
            const benefits = await response.ok ? await response.json() : [];
            
            // 혜택구분자와 검색용 필드 매칭
            const matchedBenefit = benefits.find(benefit => benefit.search_keyword === benefitCode);
            
            console.log('매칭된 혜택:', matchedBenefit);
            
            if (matchedBenefit && matchedBenefit.html_url) {
                // HTML URL로 새 창 열기
                window.open(matchedBenefit.html_url, '_blank');
            } else {
                alert('이 제품의 케어서비스 페이지를 찾을 수 없습니다.');
            }
        } catch (error) {
            console.error('케어서비스 조회 오류:', error);
            alert('케어서비스 정보를 불러오는 중 오류가 발생했습니다.');
        }
    }
    
    openPartnerCardModal(productIndex) {
        this.currentProductIndex = productIndex;
        const product = this.selectedProducts[productIndex];
        
        // 제휴카드 모달 열기
        document.getElementById('partnerCardModal').style.display = 'block';
        
        // 1단계: 카드 선택 화면으로 시작
        this.partnerCardStep = 1;
        this.selectedCard = null;
        this.selectedUsageAmount = null;
        
        // 현재 선택된 제휴카드 표시
        this.renderPartnerCardStep();
    }
    
    async renderPartnerCardStep() {
        if (this.partnerCardStep === 1) {
            await this.renderCardSelection();
        } else if (this.partnerCardStep === 2) {
            await this.renderUsageAmountSelection();
        }
    }
    
    async renderCardSelection() {
        const container = document.getElementById('partnerCardOptions');
        const modalHeader = document.querySelector('#partnerCardModal .modal-header h2');
        const product = this.selectedProducts[this.currentProductIndex];
        const hasPartnerCard = product && product.partnerCard;
        modalHeader.textContent = hasPartnerCard ? '제휴카드 변경 - 카드사 선택' : '제휴카드 선택 - 카드사 선택';
        
        try {
            const response = await authClient.apiRequest('/api/partner-cards');
            const cards = await response.ok ? await response.json() : [];
            
            // 카드사별로 그룹화
            const cardGroups = {};
            cards.forEach(card => {
                if (!cardGroups[card.카드]) {
                    cardGroups[card.카드] = [];
                }
                cardGroups[card.카드].push(card);
            });
            
            container.innerHTML = ''; // 1단계 문구 제거
            
            // 추천 카드 목록
            const recommendedCards = ['신한', '롯데', '우리', '국민'];
            
            // 카드사 정렬: 추천 카드 우선, 나머지는 가나다순
            const sortedCardNames = Object.keys(cardGroups).sort((a, b) => {
                const aIsRecommended = recommendedCards.includes(a);
                const bIsRecommended = recommendedCards.includes(b);
                
                if (aIsRecommended && !bIsRecommended) return -1;
                if (!aIsRecommended && bIsRecommended) return 1;
                if (aIsRecommended && bIsRecommended) {
                    return recommendedCards.indexOf(a) - recommendedCards.indexOf(b);
                }
                return a.localeCompare(b);
            });
            
            // 카드사 옵션들
            sortedCardNames.forEach(cardName => {
                const isRecommended = recommendedCards.includes(cardName);
                const cardElement = document.createElement('div');
                cardElement.className = 'partner-card-option';
                
                cardElement.innerHTML = `
                    <div class="card-info">
                        <div class="card-name">
                            ${isRecommended ? '<span class="recommended-icon">🌟</span> ' : ''}${cardName} 카드
                            ${isRecommended ? '<span class="recommended-badge">추천</span>' : ''}
                        </div>
                        <div class="card-discount">${cardGroups[cardName].length}개 옵션</div>
                    </div>
                `;
                
                if (isRecommended) {
                    cardElement.classList.add('recommended');
                }
                
                // 현재 선택된 제휴카드가 이 카드사인지 확인
                const product = this.selectedProducts[this.currentProductIndex];
                if (product && product.partnerCard && product.partnerCard.name && product.partnerCard.name.includes(cardName)) {
                    cardElement.classList.add('selected');
                }
                
                cardElement.addEventListener('click', () => {
                    this.selectedCard = cardName;
                    this.partnerCardStep = 2;
                    this.renderPartnerCardStep();
                });
                
                container.appendChild(cardElement);
            });
            
            // 제휴카드 없음 옵션을 가장 마지막에 추가
            const noneOption = document.createElement('div');
            noneOption.className = 'partner-card-option no-card-option';
            noneOption.innerHTML = `
                <div class="card-info">
                    <div class="card-name">제휴카드 없음</div>
                    <div class="card-discount">혜택없음</div>
                </div>
            `;
            noneOption.addEventListener('click', () => {
                this.applyNoPartnerCard();
            });
            container.appendChild(noneOption);
            
        } catch (error) {
            console.error('제휴카드 데이터 로딩 실패:', error);
            container.innerHTML = '<p>제휴카드 데이터를 불러올 수 없습니다.</p>';
        }
    }
    
    async renderUsageAmountSelection() {
        const container = document.getElementById('partnerCardOptions');
        const modalHeader = document.querySelector('#partnerCardModal .modal-header h2');
        const product = this.selectedProducts[this.currentProductIndex];
        const hasPartnerCard = product && product.partnerCard;
        const actionText = hasPartnerCard ? '제휴카드 변경' : '제휴카드 선택';
        modalHeader.textContent = `${actionText} - ${this.selectedCard} 사용금액 선택`;
        
        try {
            const response = await authClient.apiRequest('/api/partner-cards');
            const cards = await response.ok ? await response.json() : [];
            
            // 선택된 카드의 사용금액 옵션들
            const cardOptions = cards.filter(card => card.카드 === this.selectedCard);
            
            // 사용금액 기준으로 오름차순 정렬 (00만원 이상에서 숫자 추출)
            cardOptions.sort((a, b) => {
                const amountA = this.extractAmountFromUsage(a.사용금액);
                const amountB = this.extractAmountFromUsage(b.사용금액);
                return amountA - amountB;
            });
            
            container.innerHTML = `
                <div class="step-back">
                    <button class="btn-back" onclick="calculator.goBackToCardSelection()">← 카드사 선택으로 돌아가기</button>
                </div>
            `;
            
            cardOptions.forEach(card => {
                console.log('카드 데이터:', card); // 디버깅용
                const cardElement = document.createElement('div');
                cardElement.className = 'partner-card-option usage-option';
                
                // 서버에서 보내는 필드명 그대로 사용
                const promotionDiscount = parseInt(card.프로모션혜택) || 0;
                const basicDiscount = parseInt(card.기본혜택) || 0;
                const discountToShow = promotionDiscount > 0 ? promotionDiscount : basicDiscount;
                
                console.log(`카드: ${card.카드}, 사용금액: ${card.사용금액}, 프로모션혜택: ${card.프로모션혜택}, 기본혜택: ${card.기본혜택}`);
                
                // 비고 필드 처리
                const remarkHtml = card.비고 && card.비고.trim() !== '' ? 
                    `<div class="card-remark" style="font-size: 11px; color: #666; margin-top: 4px;">${card.비고}</div>` : '';
                
                cardElement.innerHTML = `
                    <div class="card-info">
                        <div class="card-name">${card.사용금액}</div>
                        <div class="card-benefit">${card.카드혜택 || '혜택 정보 없음'}</div>
                        <div class="card-discount">월 ${this.formatPrice(discountToShow)} 할인 적용</div>
                        ${remarkHtml}
                    </div>
                `;
                
                // 현재 선택된 제휴카드와 일치하는지 확인
                const product = this.selectedProducts[this.currentProductIndex];
                if (product && product.partnerCard && product.partnerCard.id === card.id) {
                    cardElement.classList.add('selected');
                    this.selectedUsageAmount = card; // 미리 선택
                }
                
                cardElement.addEventListener('click', () => {
                    // 기존 선택 해제
                    document.querySelectorAll('.usage-option').forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    
                    // 새 선택
                    cardElement.classList.add('selected');
                    this.selectedUsageAmount = card;
                    console.log('선택된 사용금액 카드:', card);
                    
                    // 마지막 단계이므로 바로 적용
                    setTimeout(() => {
                        this.applyPartnerCard();
                    }, 300);
                });
                
                container.appendChild(cardElement);
            });
            
        } catch (error) {
            console.error('제휴카드 데이터 로딩 실패:', error);
            container.innerHTML = '<p>제휴카드 데이터를 불러올 수 없습니다.</p>';
        }
    }
    
    goBackToCardSelection() {
        this.partnerCardStep = 1;
        this.selectedCard = null;
        this.renderPartnerCardStep();
    }

    
    applyPartnerCard() {
        if (this.currentProductIndex !== undefined && this.selectedUsageAmount) {
            const product = this.selectedProducts[this.currentProductIndex];
            
            // 제휴카드 정보 저장 (기간별 할인 계산을 위한 모든 정보 포함)
            console.log('제휴카드 데이터 저장:', this.selectedUsageAmount);
            
            // 서버에서 보내는 필드명 그대로 사용
            const promotionDiscount = parseInt(this.selectedUsageAmount.프로모션혜택) || 0;
            const basicDiscount = parseInt(this.selectedUsageAmount.기본혜택) || 0;
            const promotionMonths = parseInt(this.selectedUsageAmount.프로모션개월) || 0;
            
            product.partnerCard = {
                id: this.selectedUsageAmount.id,
                name: `${this.selectedUsageAmount.카드} ${this.selectedUsageAmount.사용금액}`,
                benefit: this.selectedUsageAmount.카드혜택,
                promotionDiscount: promotionDiscount,
                basicDiscount: basicDiscount,
                promotionMonths: promotionMonths,
                // 현재 할인액은 프로모션 혜택 사용 (기존 호환성 유지)
                discount: promotionDiscount
            };
            console.log('저장된 partnerCard:', product.partnerCard);
            
            this.renderProductsGrid();
            this.updateCalculator();
            this.closePartnerCardModal();
        } else {
            alert('사용금액을 선택해주세요.');
        }
    }
    
    applyNoPartnerCard() {
        if (this.currentProductIndex !== undefined) {
            const product = this.selectedProducts[this.currentProductIndex];
            
            // 제휴카드 제거
            product.partnerCard = null;
            
            this.renderProductsGrid();
            this.updateCalculator();
            this.closePartnerCardModal();
        }
    }
    
    closePartnerCardModal() {
        document.getElementById('partnerCardModal').style.display = 'none';
        this.currentProductIndex = undefined;
        this.selectedPartnerCard = null;
    }
    
    updateCalculator() {
        let total = 0;
        let normalPrice = 0;
        let promotionDiscount = 0; // 활성화(프로모션 할인)
        let combinationDiscount = 0; // 결합할인
        let partnerCardDiscount = 0;
        let totalMyPoint = 0; // 신한 마이포인트 총액
        
        // 각 제품의 월 요금 합산
        this.selectedProducts.forEach(product => {
            const monthlyFee = this.parsePrice(product['월요금']);
            const activationDiscount = this.parsePrice(product['활성화']) || 0; // 프로모션 할인액
            const discountAmount = this.parsePrice(product['할인금액']) || 0; // 결합할인액
            
            // 제휴카드 할인 적용
            const cardDiscount = product.partnerCard ? product.partnerCard.discount : 0;
            
            // 제품별 최종 금액이 0원 미만이 되지 않도록 보장
            const productFinalPrice = Math.max(0, monthlyFee - cardDiscount);
            
            // 실제 할인된 금액만 계산 (월요금보다 많이 할인할 수는 없음)
            const actualCardDiscount = monthlyFee - productFinalPrice;
            partnerCardDiscount += actualCardDiscount;
            
            // 정상 구독료 = 월 구독료 + 프로모션 할인액 + 결합할인액
            const productNormalPrice = monthlyFee + activationDiscount + discountAmount;
            
            // 신한카드 마이포인트 체크 (70만원 이상, 130만원 이상)
            if (product.partnerCard && product.partnerCard.name) {
                const cardName = product.partnerCard.name;
                if (cardName.includes('신한') && 
                    (cardName.includes('70만원 이상') || cardName.includes('130만원 이상'))) {
                    // 최종 월 구독료가 7만원 이상인 경우 마이포인트 1만원 지급
                    if (productFinalPrice >= 70000) {
                        totalMyPoint += 10000;
                        product.myPointBenefit = 10000; // 제품별로 저장
                    }
                }
            }
            
            total += productFinalPrice;
            normalPrice += productNormalPrice;
            promotionDiscount += activationDiscount;
            combinationDiscount += discountAmount;
        });
        
        const totalDiscount = promotionDiscount + combinationDiscount + partnerCardDiscount;
        
        // 계산기 UI 업데이트
        const normalPriceEl = document.getElementById('normalPrice');
        const promotionPriceEl = document.getElementById('promotionPrice');
        const finalPriceEl = document.getElementById('finalPrice');
        const promotionDiscountDetailEl = document.getElementById('promotionDiscountDetail');
        const combinationDiscountDetailEl = document.getElementById('combinationDiscountDetail');
        const partnerCardDetailEl = document.getElementById('partnerCardDetail');
        
        if (normalPriceEl) normalPriceEl.textContent = this.formatPrice(normalPrice);
        if (promotionPriceEl) promotionPriceEl.textContent = this.formatPrice(promotionDiscount + partnerCardDiscount);
        if (finalPriceEl) {
            finalPriceEl.textContent = this.formatPrice(total);
            
            // 총금액 합산 정보 추가
            this.updateTotalCostSummary();
        }
        
        // 추가혜택 세부사항 업데이트
        if (promotionDiscountDetailEl) {
            promotionDiscountDetailEl.innerHTML = `<span>• 프로모션할인</span><span>${this.formatPrice(promotionDiscount)}</span>`;
        }
        if (combinationDiscountDetailEl) {
            combinationDiscountDetailEl.innerHTML = `<span>• 결합할인</span><span>${this.formatPrice(combinationDiscount)}</span>`;
        }
        if (partnerCardDetailEl) {
            partnerCardDetailEl.innerHTML = `<span>• 제휴카드</span><span>${this.formatPrice(partnerCardDiscount)}</span>`;
        }
        
        // 신한 마이포인트 표시 추가
        if (totalMyPoint > 0) {
            // 추가혜택 섹션에 마이포인트 표시
            const benefitDetails = document.getElementById('benefitDetails');
            if (benefitDetails) {
                // 기존 마이포인트 요소가 있으면 제거
                const existingMyPoint = document.getElementById('myPointDetail');
                if (existingMyPoint) {
                    existingMyPoint.remove();
                }
                
                // 새로운 마이포인트 요소 추가
                const myPointDiv = document.createElement('div');
                myPointDiv.className = 'benefit-detail';
                myPointDiv.id = 'myPointDetail';
                myPointDiv.style.cssText = 'color: #0066cc; font-weight: 600;';
                myPointDiv.innerHTML = `<span>• 신한 마이포인트</span><span>${this.formatPrice(totalMyPoint)} 지급</span>`;
                benefitDetails.appendChild(myPointDiv);
            }
        } else {
            // 마이포인트가 없으면 요소 제거
            const existingMyPoint = document.getElementById('myPointDetail');
            if (existingMyPoint) {
                existingMyPoint.remove();
            }
        }
        
        // 선납금액 계산 및 표시
        this.updatePrepaymentSection();
        
        console.log('계산기 업데이트:', {
            총액: total,
            정상가: normalPrice,
            프로모션할인: promotionDiscount,
            제휴카드할인: partnerCardDiscount,
            총할인: totalDiscount
        });
    }
    
    updateTotalCostSummary() {
        // 모든 제품의 계약기간 총 비용 계산
        let totalContractCost = 0;
        let totalBenefits = 0;
        let actualTotalPayment = 0;
        let totalMyPointForContract = 0;
        
        this.selectedProducts.forEach(product => {
            const monthlyFee = this.parsePrice(product['월요금']);
            const contractPeriod = product['계약기간'];
            if (!contractPeriod) return;
            
            const contractMonths = parseInt(contractPeriod.replace('년', '')) * 12;
            const totalMonthlyFee = monthlyFee * contractMonths;
            
            // 카드 혜택 계산
            let totalCardBenefit = 0;
            if (product.partnerCard) {
                const periodInfo = this.calculatePeriodBasedDiscount(contractPeriod, product.partnerCard);
                if (periodInfo.promotionPeriod > 0) {
                    totalCardBenefit += Math.min(product.partnerCard.promotionDiscount, monthlyFee) * periodInfo.promotionPeriod;
                }
                if (periodInfo.basicPeriod > 0) {
                    totalCardBenefit += Math.min(product.partnerCard.basicDiscount, monthlyFee) * periodInfo.basicPeriod;
                }
            }
            
            // 활성화 혜택
            const activationDiscount = this.parsePrice(product['활성화']) || 0;
            const promotionMonths = parseInt(product['프로모션할인종료월'] || '0');
            const totalActivationBenefit = activationDiscount * promotionMonths;
            
            // 결합할인 혜택
            const combinationDiscount = this.parsePrice(product['할인금액']) || 0;
            const totalCombinationBenefit = combinationDiscount * contractMonths;
            
            // 신한 마이포인트 계산 (계약기간 전체)
            if (product.partnerCard && product.partnerCard.cardName) {
                const cardName = product.partnerCard.cardName;
                
                // 제휴카드 할인 고려한 최종 월요금
                const periodInfo = this.calculatePeriodBasedDiscount(contractPeriod, product.partnerCard);
                let monthlyCardDiscount = 0;
                
                // 현재 시점의 카드 할인 (프로모션 기간 우선, 없으면 기본 혜택)
                if (periodInfo.promotionPeriod > 0) {
                    monthlyCardDiscount = Math.min(product.partnerCard.promotionDiscount, monthlyFee);
                } else if (periodInfo.basicPeriod > 0) {
                    monthlyCardDiscount = Math.min(product.partnerCard.basicDiscount, monthlyFee);
                }
                
                const productFinalPrice = monthlyFee - monthlyCardDiscount - combinationDiscount - activationDiscount;
                
                // 신한카드 70만원/130만원 이상 && 월 7만원 이상일 때 월 10,000 포인트
                if (cardName.includes('신한') && 
                    (cardName.includes('70만원 이상') || cardName.includes('130만원 이상'))) {
                    if (productFinalPrice >= 70000) {
                        // 계약기간 동안 매월 10,000 포인트 지급
                        totalMyPointForContract += 10000 * contractMonths;
                    }
                }
            }
            
            const productTotalBenefit = totalCardBenefit + totalActivationBenefit + totalCombinationBenefit;
            const productActualCost = totalMonthlyFee - productTotalBenefit;
            
            totalContractCost += totalMonthlyFee;
            totalBenefits += productTotalBenefit;
            actualTotalPayment += productActualCost;
        });
        
        // 총금액 요약 섹션 업데이트 또는 생성
        let summaryEl = document.getElementById('totalCostSummary');
        const showTotalCostCheckbox = document.getElementById('showTotalCost');
        const shouldShow = showTotalCostCheckbox ? showTotalCostCheckbox.checked : false;
        
        if (!summaryEl) {
            summaryEl = document.createElement('div');
            summaryEl.id = 'totalCostSummary';
            summaryEl.style.cssText = `
                background: #f8f8fc;
                padding: 12px;
                margin-top: 15px;
                border-radius: 8px;
                font-size: 12px;
                border: 1px solid #e0e0e0;
            `;
            const finalTotal = document.querySelector('.final-total');
            if (finalTotal) {
                finalTotal.appendChild(summaryEl);
            }
        }
        
        if (this.selectedProducts.length > 0 && actualTotalPayment > 0) {
            // 신한 마이포인트가 있는 경우 별도 표시
            let myPointHTML = '';
            if (totalMyPointForContract > 0) {
                myPointHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: #0066cc; font-weight: 500;">신한 마이포인트 (현금성):</span>
                    <span style="color: #0066cc; font-weight: 600;">총 ${this.formatPrice(totalMyPointForContract)} 지급</span>
                </div>`;
            }
            
            // 실 지불총액에서 마이포인트 차감
            const finalPayment = actualTotalPayment - totalMyPointForContract;
            
            summaryEl.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 8px; color: #333;">전체 계약기간 총 비용</div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: #666;">정가 합계:</span>
                    <span style="color: #333;">${this.formatPrice(totalContractCost)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: #666;">총 혜택:</span>
                    <span style="color: #dc3545;">-${this.formatPrice(totalBenefits)}</span>
                </div>
                ${myPointHTML}
                <div style="border-top: 1px solid #ddd; margin-top: 6px; padding-top: 6px; display: flex; justify-content: space-between;">
                    <span style="font-weight: bold; color: #333;">실 지불총액:</span>
                    <span style="font-weight: bold; color: #1976d2; font-size: 14px;">${this.formatPrice(finalPayment)}</span>
                </div>
            `;
            summaryEl.style.display = shouldShow ? 'block' : 'none';
        } else {
            summaryEl.style.display = 'none';
        }
    }
    
    parsePrice(priceStr) {
        if (!priceStr) return 0;
        return parseInt(priceStr.toString().replace(/[^\d]/g, '')) || 0;
    }
    
    formatPrice(price) {
        if (typeof price !== 'number' || isNaN(price)) {
            return '0원';
        }
        return price.toLocaleString() + '원';
    }

    // 텍스트가 컨테이너에 맞게 글꼴 크기 조정
    adjustFontSizeToFit(element, maxAttempts = 20) { // Increased maxAttempts
        if (!element) return;

        let fontSize = parseFloat(window.getComputedStyle(element).fontSize);
        const initialFontSize = fontSize;
        let attempts = 0;

        console.log(`Adjusting font for: ${element.textContent}`);
        console.log(`Initial font size: ${initialFontSize}px`);
        console.log(`Initial scrollWidth: ${element.scrollWidth}, clientWidth: ${element.clientWidth}`);

        // 텍스트가 넘치는지 확인하고 글꼴 크기를 줄임
        while (element.scrollWidth > element.clientWidth && attempts < maxAttempts) {
            fontSize -= 1; // Increased reduction step to 1px
            element.style.fontSize = `${fontSize}px`;
            attempts++;
            console.log(`Attempt ${attempts}: fontSize=${fontSize}px, scrollWidth=${element.scrollWidth}, clientWidth=${element.clientWidth}`);
        }

        // 만약 텍스트가 여전히 넘치거나 너무 많이 줄어들었다면, 최소 크기 보장
        // 또는 다른 처리 (예: 말줄임표)를 고려할 수 있음
        if (element.scrollWidth > element.clientWidth) {
            console.log(`Font adjustment failed to fit: scrollWidth=${element.scrollWidth}, clientWidth=${element.clientWidth}`);
            // 최종적으로도 넘친다면, 텍스트를 자르고 말줄임표를 추가할 수 있음
            // element.style.whiteSpace = 'nowrap';
            // element.style.overflow = 'hidden';
            // element.style.textOverflow = 'ellipsis';
        } else {
            console.log(`Font adjustment successful: final fontSize=${fontSize}px`);
        }
    }
    
    // 계약기간과 프로모션 기간을 고려한 기간별 할인 계산
    calculatePeriodBasedDiscount(contractPeriod, partnerCard) {
        console.log('calculatePeriodBasedDiscount 호출됨:', {
            contractPeriod,
            partnerCard
        });
        
        if (!partnerCard) {
            console.log('제휴카드 정보 없음');
            return {
                promotionDiscount: 0,
                basicDiscount: 0,
                promotionPeriod: 0,
                basicPeriod: 0,
                totalMonths: 0
            };
        }
        
        // 계약기간을 개월로 변환
        const contractMonths = parseInt(contractPeriod.replace('년', '')) * 12;
        
        // 프로모션 기간이 없는 경우 전체 계약기간 동안 기본 할인 적용
        if (!partnerCard.promotionMonths || partnerCard.promotionMonths === 0) {
            console.log('프로모션 기간 없음, 전체 계약기간 동안 기본 할인 적용');
            return {
                promotionDiscount: partnerCard.promotionDiscount || 0,
                basicDiscount: partnerCard.basicDiscount || 0,
                promotionPeriod: 0,
                basicPeriod: contractMonths,
                totalMonths: contractMonths
            };
        }
        
        const promotionMonths = partnerCard.promotionMonths;
        
        let promotionPeriod = 0;
        let basicPeriod = 0;
        
        if (contractMonths <= promotionMonths) {
            // 계약기간이 프로모션 기간보다 짧거나 같음 - 전체 기간 프로모션 혜택
            promotionPeriod = contractMonths;
            basicPeriod = 0;
        } else {
            // 계약기간이 프로모션 기간보다 길음 - 일부는 프로모션, 일부는 기본
            promotionPeriod = promotionMonths;
            basicPeriod = contractMonths - promotionMonths;
        }
        
        return {
            promotionDiscount: partnerCard.promotionDiscount,
            basicDiscount: partnerCard.basicDiscount,
            promotionPeriod,
            basicPeriod,
            totalMonths: contractMonths
        };
    }
    
    async applyOptimalCombinationType() {
        if (this.selectedProducts.length >= 2) {
            const changedProductsInfo = [];
            
            for (let i = 0; i < this.selectedProducts.length; i++) {
                const product = this.selectedProducts[i];
                if (product['결합유형'] !== '신규결합') {
                    const oldPrice = this.parsePrice(product['월요금']);
                    
                    const newProduct = await this.findNewCombinationProduct(product);
                    if (newProduct) {
                        const newPrice = this.parsePrice(newProduct['월요금']);
                        const discount = oldPrice - newPrice;

                        if (discount > 0) {
                            changedProductsInfo.push({ name: newProduct['모델명'], discount: discount });
                        }
                        
                        this.selectedProducts[i] = newProduct;
                        if (product.partnerCard) {
                            this.selectedProducts[i].partnerCard = product.partnerCard;
                        }
                    }
                }
            }
            
            if (changedProductsInfo.length > 0) {
                this.showCombinationTypeChangeNotification(changedProductsInfo);
            }
        }
    }
    
    // 결합유형 최적화 적용
    async applyOptimalCombinationType() {
        if (this.selectedProducts.length >= 2) {
            const changedProductsInfo = [];
            
            for (let i = 0; i < this.selectedProducts.length; i++) {
                const product = this.selectedProducts[i];
                if (product['결합유형'] !== '신규결합') {
                    const oldPrice = this.parsePrice(product['월요금']);
                    
                    const newProduct = await this.findNewCombinationProduct(product);
                    
                    // findNewCombinationProduct가 유효한 제품을 반환했을 때만 처리
                    if (newProduct) {
                        const newPrice = this.parsePrice(newProduct['월요금']);
                        const discount = oldPrice - newPrice;

                        if (discount > 0) {
                            changedProductsInfo.push({ 
                                name: newProduct['모델명'], 
                                discount: discount 
                            });
                        }
                        
                        this.selectedProducts[i] = newProduct;
                        if (product.partnerCard) {
                            this.selectedProducts[i].partnerCard = product.partnerCard;
                        }
                    } else {
                        // 신규결합 제품을 찾지 못했으면, 다시 시도하지 않도록 결합유형만 변경
                        this.selectedProducts[i]['결합유형'] = '신규결합';
                    }
                }
            }
            
            if (changedProductsInfo.length > 0) {
                this.showCombinationTypeChangeNotification(changedProductsInfo);
            }
        }
    }
    
    // 신규결합 제품 데이터 조회 (더 안정적으로 수정)
    async findNewCombinationProduct(currentProduct) {
        try {
            const filters = {
                모델명: currentProduct['모델명'],
                계약기간: currentProduct['계약기간'],
                관리유형: currentProduct['관리유형'],
                방문주기: currentProduct['방문주기'],
                선납: currentProduct['선납'],
                결합유형: '신규결합'
            };
            
            const queryParams = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key]) {
                    queryParams.append(key, filters[key]);
                }
            });
            
            const response = await authClient.apiRequest(`/api/products/find-exact?${queryParams}`);
            if (!response.ok) {
                console.error(`API error: ${response.status} ${response.statusText}`);
                return null; // API 에러 시 null 반환
            }

            const products = await response.json();
            
            // 서버가 에러 객체 대신 배열을 반환했는지 확인
            if (Array.isArray(products) && products.length > 0) {
                console.log('신규결합 제품 찾음:', products[0]);
                return products[0];
            } else {
                console.warn('신규결합 제품을 찾을 수 없음:', currentProduct['모델명']);
                return null; // 제품을 찾지 못하면 null 반환
            }
        } catch (error) {
            console.error('신규결합 제품 검색 실패:', error);
            return null; // 그 외 모든 에러 발생 시 null 반환
        }
    }
    
    // 결합유형 변경 알림
    showCombinationTypeChangeNotification(changedProductsInfo) {
        const productDetails = changedProductsInfo.map(p => 
            `• ${p.name}: 월 ${this.formatPrice(p.discount)} 추가 할인`
        ).join('\n');

        const message = `제품이 2개 이상 선택되어 더 혜택이 좋은 신규결합으로 자동 변경되었습니다.\n\n[변경 내역]\n${productDetails}\n\n신규결합 할인이 적용되어 더 저렴한 가격으로 이용하실 수 있습니다.`;
        
        this.showCustomAlert('신규결합 자동 반영', message);
    }

    // 커스텀 알림 창
    showCustomAlert(title, message) {
        // 기존 알림창이 있으면 제거
        const existingAlert = document.getElementById('customAlert');
        if (existingAlert) existingAlert.remove();
        
        const alertModal = document.createElement('div');
        alertModal.id = 'customAlert';
        alertModal.className = 'modal custom-alert'; // 폰트 적용을 위한 클래스 추가
        alertModal.style.display = 'block';
        
        alertModal.innerHTML = `
            <div class="modal-content custom-alert-content" style="max-width: 450px; margin: 10% auto;">
                <div class="modal-header" style="background: linear-gradient(135deg, #A50034, #8A002A);">
                    <h2 style="margin: 0; color: white;">${title}</h2>
                </div>
                <div class="modal-body" style="padding: 20px 30px; white-space: pre-line; font-size: 14px; line-height: 1.6;">
                    ${message}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="document.getElementById('customAlert').remove()">확인</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(alertModal);
    }

    // 확인 대화상자
    showConfirmDialog(title, message, onConfirm) {
        // 기존 대화상자가 있으면 제거
        const existingDialog = document.getElementById('confirmDialog');
        if (existingDialog) existingDialog.remove();
        
        const dialogModal = document.createElement('div');
        dialogModal.id = 'confirmDialog';
        dialogModal.className = 'modal custom-alert';
        dialogModal.style.display = 'block';
        
        dialogModal.innerHTML = `
            <div class="modal-content custom-alert-content" style="max-width: 400px; margin: 15% auto;">
                <div class="modal-header" style="background: linear-gradient(135deg, #ff5252, #d32f2f);">
                    <h2 style="margin: 0; color: white;">${title}</h2>
                </div>
                <div class="modal-body" style="padding: 20px 30px; white-space: pre-line; font-size: 14px; line-height: 1.6;">
                    ${message}
                </div>
                <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn btn-secondary" onclick="document.getElementById('confirmDialog').remove()">취소</button>
                    <button class="btn btn-danger" onclick="calculator.executeConfirmedAction()">삭제</button>
                </div>
            </div>
        `;
        
        // 확인 콜백 저장
        this.pendingConfirmAction = onConfirm;
        
        document.body.appendChild(dialogModal);
    }

    executeConfirmedAction() {
        if (this.pendingConfirmAction) {
            this.pendingConfirmAction();
            this.pendingConfirmAction = null;
        }
        document.getElementById('confirmDialog').remove();
    }
    
    // 결합유형에 따른 옵션 필터링
    filterCombinationTypeOptions() {
        // 현재 선택된 제품 개수에 따라 결합유형 옵션 결정
        if (this.selectedProducts.length >= 1) {
            // 2개 이상 선택 예정이면 신규결합만 표시
            return ['신규결합'];
        } else {
            // 1개만 선택할 때는 모든 옵션 표시
            return null; // 모든 옵션 표시
        }
    }

    // 추가혜택 세부사항 토글 기능 (더 이상 사용하지 않음 - 항상 표시)
    toggleBenefitDetails() {
        // 더 이상 사용하지 않는 함수 (항상 펼침 상태 유지)
        console.log('추가혜택 토글 기능이 비활성화되었습니다.');
    }

    // 선납금액 섹션 업데이트
    updatePrepaymentSection() {
        const prepaymentSection = document.getElementById('prepaymentSection');
        const prepaymentPrice = document.getElementById('prepaymentPrice');
        const prepaymentDetail = document.getElementById('prepaymentDetail');
        
        // 선납 옵션이 있는 제품들 찾기
        const prepaidProducts = this.selectedProducts.filter(product => 
            product['선납'] && product['선납'] !== '선납없음'
        );
        
        if (prepaidProducts.length === 0) {
            prepaymentSection.style.display = 'none';
            return;
        }
        
        prepaymentSection.style.display = 'block';
        
        // 선납금액 계산 (선납금액 필드 값 사용)
        let totalPrepayment = 0;
        const prepaymentDetails = [];
        
        prepaidProducts.forEach(product => {
            const prepayAmount = this.parsePrice(product['선납금액']);
            const prepayOption = product['선납'];
            
            if (prepayAmount > 0) {
                totalPrepayment += prepayAmount;
                prepaymentDetails.push({
                    modelName: product['모델명'],
                    amount: this.formatPrice(prepayAmount),
                    option: prepayOption
                });
            }
        });
        
        prepaymentPrice.textContent = this.formatPrice(totalPrepayment);
        
        // 세부항목을 개별 div로 생성하고 폰트 크기 조정
        if (prepaymentDetails.length > 0) {
            prepaymentDetail.innerHTML = '';
            prepaymentDetails.forEach(detail => {
                const detailDiv = document.createElement('div');
                detailDiv.className = 'prepayment-detail-item';
                detailDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
                detailDiv.innerHTML = `<span style="text-align: left;">• ${detail.modelName}</span><span style="text-align: right;">${detail.amount}</span>`;
                
                // 모델명 길이에 따른 폰트 크기 조정
                const textLength = detail.modelName.length;
                let fontSize;
                
                if (textLength <= 10) {
                    fontSize = '12px';
                } else if (textLength <= 15) {
                    fontSize = '11px';
                } else if (textLength <= 20) {
                    fontSize = '10px';
                } else if (textLength <= 30) {
                    fontSize = '9px';
                } else if (textLength <= 40) {
                    fontSize = '8px';
                } else {
                    fontSize = '7px';
                }
                
                detailDiv.style.fontSize = fontSize;
                prepaymentDetail.appendChild(detailDiv);
            });
        } else {
            prepaymentDetail.innerHTML = '• 해당 제품 없음';
        }
    }

    // 사용금액에서 숫자 추출 (예: "30만원 이상" -> 30)
    extractAmountFromUsage(usageText) {
        if (!usageText) return 0;
        
        // "30만원 이상", "80만원 이상" 등에서 숫자 부분 추출
        const match = usageText.match(/(\d+)만원/);
        return match ? parseInt(match[1]) : 0;
    }

    // 제품 추가 버튼 위치 동적 조정
    repositionAddButton() {
        const productsGrid = document.getElementById('productsGrid');
        const addProductCard = document.getElementById('addProductCard');
        
        if (!productsGrid || !addProductCard) return;
        
        // 현재 제품 카드들의 개수 확인
        const productCards = productsGrid.querySelectorAll('.product-card:not(.add-product-card)');
        const totalCards = productCards.length;
        
        console.log(`제품 카드 수: ${totalCards}`);
        
        if (totalCards === 0) {
            // 제품이 없으면 기본 위치 (첫 번째)
            console.log('제품 없음 - 기본 위치');
            return;
        }
        
        // 컨테이너 너비 기반으로 한 줄에 들어갈 수 있는 카드 수 계산
        const gridWidth = productsGrid.offsetWidth;
        const cardWidth = 320; // 고정 카드 너비 + gap 고려
        const gap = 25;
        const effectiveCardWidth = cardWidth + gap;
        const cardsPerRow = Math.floor((gridWidth + gap) / effectiveCardWidth);
        
        console.log(`그리드 너비: ${gridWidth}px, 한 줄당 카드 수: ${cardsPerRow}`);
        
        // 실제 카드 크기 계산
        const sampleCard = productCards[0];
        const actualCardWidth = sampleCard ? sampleCard.offsetWidth : 400;
        const actualCardsPerRow = Math.floor(gridWidth / actualCardWidth);
        
        console.log(`실제 카드 너비: ${actualCardWidth}px, 실제 한 줄당 카드 수: ${actualCardsPerRow}`);
        
        // 현재 제품 수 + 추가버튼이 한 줄에 들어갈 수 있는지 확인
        const totalWithButton = totalCards + 1;
        
        if (totalWithButton <= actualCardsPerRow) {
            console.log(`${totalCards}개 제품 + 추가버튼 = ${totalWithButton}개가 ${actualCardsPerRow}개 자리에 들어감 - 우측 배치`);
            productsGrid.appendChild(addProductCard);
        } else {
            console.log(`${totalCards}개 제품 + 추가버튼 = ${totalWithButton}개가 ${actualCardsPerRow}개 자리에 못 들어감 - 새 줄 배치`);
            productsGrid.appendChild(addProductCard);
        }
    }
}

// 페이지 로드 시 초기화
let calculator;
// 구독 혜택 관련 기능
const subscriptionBenefits = {
    init() {
        const benefitsBtn = document.getElementById('subscriptionBenefitsBtn');
        if (benefitsBtn) {
            benefitsBtn.addEventListener('click', this.openBenefitsModal.bind(this));
        }
    },

    async openBenefitsModal() {
        try {
            const response = await authClient.apiRequest('/api/subscription-benefits');
            const benefits = await response.ok ? await response.json() : [];
            
            this.renderBenefitsGrid(benefits);
            
            const modal = document.getElementById('subscriptionBenefitsModal');
            modal.style.display = 'block';
        } catch (error) {
            console.error('구독 혜택 로드 오류:', error);
            alert('구독 혜택을 불러오는 중 오류가 발생했습니다.');
        }
    },

    renderBenefitsGrid(benefits) {
        const grid = document.getElementById('benefitsGrid');
        grid.innerHTML = '';

        benefits.forEach(benefit => {
            const benefitElement = document.createElement('div');
            benefitElement.className = 'benefit-item';
            benefitElement.onclick = () => this.openBenefitDetail(benefit);

            const img = benefit.icon_url ? `<img src="${benefit.icon_url}" alt="${benefit.name}" onerror="this.style.display='none'">` : '';
            
            benefitElement.innerHTML = `
                ${img}
                <div class="benefit-name">${benefit.name}</div>
            `;

            grid.appendChild(benefitElement);
        });
    },

    async openBenefitDetail(benefit) {
        try {
            const modal = document.getElementById('benefitDetailModal');
            const title = document.getElementById('benefitDetailTitle');
            const content = document.getElementById('benefitDetailContent');

            title.textContent = benefit.name + ' 혜택';
            
            if (benefit.html_url) {
                // HTML URL이 있으면 새 창으로 열기
                window.open(benefit.html_url, '_blank');
                closeBenefitDetailModal();
                return;
            } else {
                // HTML URL이 없으면 기본 정보 표시
                let detailHTML = `<h3>${benefit.name}</h3>`;
                
                if (benefit.vertical_image_url) {
                    detailHTML += `<img src="${benefit.vertical_image_url}" alt="${benefit.name}" style="max-width: 100%; height: auto; margin: 20px 0;">`;
                }
                
                if (benefit.video_url) {
                    detailHTML += `<div style="margin: 20px 0;"><iframe src="${benefit.video_url}" width="100%" height="315" frameborder="0" allowfullscreen></iframe></div>`;
                }
                
                detailHTML += `<p>구독 시 ${benefit.name}에 대한 전문 케어 서비스를 받으실 수 있습니다.</p>`;
                
                content.innerHTML = detailHTML;
            }

            modal.style.display = 'block';
        } catch (error) {
            console.error('혜택 상세 정보 로드 오류:', error);
            alert('혜택 상세 정보를 불러오는 중 오류가 발생했습니다.');
        }
    }
};

// 모달 닫기 함수들
function closeBenefitsModal() {
    document.getElementById('subscriptionBenefitsModal').style.display = 'none';
}

function closeBenefitDetailModal() {
    document.getElementById('benefitDetailModal').style.display = 'none';
}

// 모달 외부 클릭 시 닫기 (기존 이벤트에 추가)
window.addEventListener('click', function(event) {
    const benefitsModal = document.getElementById('subscriptionBenefitsModal');
    const detailModal = document.getElementById('benefitDetailModal');
    
    if (event.target === benefitsModal) {
        closeBenefitsModal();
    }
    
    if (event.target === detailModal) {
        closeBenefitDetailModal();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded - script.js');
    console.log('authClient 상태:', typeof authClient !== 'undefined' ? '정의됨' : '정의되지 않음');
    console.log('ProductSelectionModal 상태:', typeof ProductSelectionModal !== 'undefined' ? '정의됨' : '정의되지 않음');
    
    // authClient가 로드될 때까지 약간 대기
    setTimeout(() => {
        console.log('SubscriptionCalculator 초기화');
        calculator = new SubscriptionCalculator();
        window.calculator = calculator; // 디버깅용
        
        // 구독 혜택 초기화
        subscriptionBenefits.init();
    }, 100);
    
    // 레이아웃 로딩 완료 표시
    const productsGrid = document.getElementById('productsGrid');
    if (productsGrid) {
        productsGrid.classList.add('loaded');
    }
    
    // 화면 크기 변경 시 제품 추가 버튼 위치 재조정
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (calculator) {
                calculator.repositionAddButton();
            }
        }, 100);
    });
});