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
        console.log('모달 초기화 시작...');
        
        // DOM 요소들이 존재하는지 확인
        const requiredElements = ['productModal', 'closeModal', 'addProductCard'];
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        
        if (missingElements.length > 0) {
            console.warn('모달 초기화 지연 - 필요한 DOM 요소들이 없음:', missingElements);
            // 100ms 후 다시 시도
            setTimeout(() => this.initModal(), 100);
            return;
        }
        
        try {
            this.modal = new ProductSelectionModal(this);
            console.log('ProductSelectionModal 초기화 완료');
        } catch (error) {
            console.error('ProductSelectionModal 초기화 실패:', error);
        }
    }
    
    async loadCategories() {
        try {
            const response = await fetch('/api/categories');
            this.categories = await response.json();
            console.log('카테고리 로드 완료:', this.categories.length, '개');
        } catch (error) {
            console.error('카테고리 로딩 실패:', error);
        }
    }
    
    setupEventListeners() {
        console.log('EventListener 설정 시작');
        
        // 제품 추가 버튼
        const addProductCard = document.getElementById('addProductCard');
        console.log('addProductCard 요소 확인:', addProductCard);
        
        if (addProductCard) {
            addProductCard.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('제품 추가 버튼 클릭됨!');
                console.log('this.modal:', this.modal);
                
                if (this.modal) {
                    console.log('모달 openModal() 호출');
                    this.modal.openModal();
                } else {
                    console.error('모달이 초기화되지 않음');
                    // 모달이 없으면 다시 초기화 시도
                    this.initModal();
                    setTimeout(() => {
                        if (this.modal) {
                            this.modal.openModal();
                        }
                    }, 100);
                }
            });
            console.log('제품 추가 버튼 이벤트 리스너 등록됨');
        } else {
            console.error('addProductCard 요소를 찾을 수 없음');
            console.log('현재 DOM에 있는 모든 ID들:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
        }
        
        // 초기 렌더링
        this.renderProductsGrid();
        this.updateCalculatorInitial();
        
        // 제품 추가 버튼 이벤트 리스너를 다시 한 번 확실히 등록
        this.ensureAddButtonListener();
        
        console.log('EventListener 설정 완료');
    }
    
    ensureAddButtonListener() {
        console.log('ensureAddButtonListener() 호출');
        const addProductCard = document.getElementById('addProductCard');
        
        if (addProductCard) {
            // 기존 리스너가 있을 수 있으니 제거하고 새로 추가
            const newButton = addProductCard.cloneNode(true);
            addProductCard.parentNode.replaceChild(newButton, addProductCard);
            
            newButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('제품 추가 버튼 클릭됨! (ensureAddButtonListener)');
                
                if (this.modal) {
                    console.log('모달 openModal() 호출');
                    this.modal.openModal();
                } else {
                    console.error('모달이 아직 초기화되지 않음, 재시도...');
                    setTimeout(() => {
                        if (this.modal) {
                            this.modal.openModal();
                        } else {
                            console.error('모달 초기화 실패');
                        }
                    }, 100);
                }
            });
            console.log('제품 추가 버튼 이벤트 리스너 재등록 완료');
        } else {
            console.error('제품 추가 버튼을 찾을 수 없음 (ensureAddButtonListener)');
        }
    }
    
    updateCalculatorInitial() {
        // 초기 상태: 제품이 없을 때의 기본 표시값
        const normalPriceEl = document.getElementById('normalPrice');
        const promotionPriceEl = document.getElementById('promotionPrice');
        const finalPriceEl = document.getElementById('finalPrice');
        const promotionDiscountDetailEl = document.getElementById('promotionDiscountDetail');
        const combinationDiscountDetailEl = document.getElementById('combinationDiscountDetail');
        const partnerCardDetailEl = document.getElementById('partnerCardDetail');
        
        if (normalPriceEl) normalPriceEl.textContent = '0원';
        if (promotionPriceEl) promotionPriceEl.textContent = '0원';
        if (finalPriceEl) finalPriceEl.textContent = '0원';
        if (promotionDiscountDetailEl) promotionDiscountDetailEl.textContent = '• 프로모션할인: 0원';
        if (combinationDiscountDetailEl) combinationDiscountDetailEl.textContent = '• 결합할인: 0원';
        if (partnerCardDetailEl) partnerCardDetailEl.textContent = '• 제휴카드: 0원';
        
        // 선납금액 섹션 숨기기
        const prepaymentSection = document.getElementById('prepaymentSection');
        if (prepaymentSection) {
            prepaymentSection.style.display = 'none';
        }
    }
    
    async renderProductsGrid() {
        const productsGrid = document.getElementById('productsGrid');
        const welcomeMessage = document.getElementById('welcomeMessage');
        const addProductCard = document.getElementById('addProductCard');
        
        console.log('제품 개수:', this.selectedProducts.length);
        
        // 기존 제품 카드 제거 (추가 버튼 제외)
        const existingProducts = productsGrid.querySelectorAll('.product-card');
        existingProducts.forEach(card => card.remove());
        
        // 항상 제품 그리드는 표시하고, 웰컴 메시지는 숨김
        if (welcomeMessage) welcomeMessage.style.display = 'none';
        if (productsGrid) productsGrid.style.display = 'grid';
        
        // 선택된 제품들을 각각 개별 카드로 표시 (같은 제품이라도 각각 다른 제휴카드 적용 가능)
        for (const [index, product] of this.selectedProducts.entries()) {
            const productCard = await this.createProductCard(product, index);
            productsGrid.insertBefore(productCard, addProductCard);
            
            // 폰트 크기 조정
            const productTitleElement = productCard.querySelector('.product-title');
            if (productTitleElement) {
                this.adjustFontSizeToFit(productTitleElement);
            }
        }
        
        // 제품 추가 버튼이 항상 보이도록 확인
        if (addProductCard) {
            addProductCard.style.display = 'flex';
            console.log('제품 추가 버튼 표시됨');
        } else {
            console.error('제품 추가 버튼을 찾을 수 없음');
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
            <button class="product-remove-top" onclick="calculator.removeProduct(${index})">×</button>
            <div class="product-header-content">
                <div class="product-image">${getProductIcon(productGroup)}</div>
                <div class="product-text-container">
                    <div class="product-title">${product['모델명'] || '제품명 없음'}</div>
                    <div class="product-specs">
                        ${product['결합유형'] || '-'} | ${product['계약기간'] || '-'}<br>
                        ${product['관리유형'] || '관리없음'} | ${product['방문주기'] || '방문없음'}${prepaymentDisplay}
                    </div>
                </div>
            </div>
            ${partnerCardDisplay}
            ${!partnerCard ? `<div class="product-actions">
                <button class="partner-card-btn" onclick="calculator.openPartnerCardModal(${index})">제휴카드 연동</button>
            </div>` : ''}
            <div class="product-price">
                <div class="price-breakdown">
                    <div class="price-item monthly-fee">
                        <span class="price-label">월 구독료</span>
                        <span class="price-value">${this.formatPrice(monthlyFee)}</span>
                    </div>
                    ${partnerCard ? this.generatePeriodBasedPricing(product, monthlyFee) : ''}
                </div>
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
                        imageContainer.innerHTML = `<img src="${data.imageUrl}" alt="${modelName}" style="width:100%; height:100%; object-fit:contain; border-radius: 8px;">`;
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching product image:', error);
        }
        
        return card;
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
                    <span class="price-label">월 ${partnerCard.name} 할인 (${periodInfo.promotionPeriod}개월간)</span>
                    <span class="price-value discount-value">-${this.formatPrice(partnerCard.promotionDiscount)}</span>
                </div>
                <div class="price-item final-price promotion-final">
                    <span class="price-label">월 혜택가격 (${periodInfo.promotionPeriod}개월간)</span>
                    <span class="price-value final-value">${this.formatPrice(Math.max(0, monthlyFee - partnerCard.promotionDiscount))}</span>
                </div>
            `;
        }
        
        // 기본 혜택 기간이 있는 경우 (프로모션 기간 이후)
        if (periodInfo.basicPeriod > 0) {
            pricingHTML += `
                <div class="price-item discount basic-period">
                    <span class="price-label">월 ${partnerCard.name} 할인 (${periodInfo.promotionPeriod + 1}~${periodInfo.totalMonths}개월)</span>
                    <span class="price-value discount-value">-${this.formatPrice(partnerCard.basicDiscount)}</span>
                </div>
                <div class="price-item final-price basic-final">
                    <span class="price-label">월 혜택가격 (${periodInfo.promotionPeriod + 1}~${periodInfo.totalMonths}개월)</span>
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
            const response = await fetch('/api/partner-cards');
            const cards = await response.json();
            
            // 카드사별로 그룹화
            const cardGroups = {};
            cards.forEach(card => {
                if (!cardGroups[card.카드]) {
                    cardGroups[card.카드] = [];
                }
                cardGroups[card.카드].push(card);
            });
            
            container.innerHTML = '<div class="step-info">1단계: 카드사를 선택해주세요</div>';
            
            // 제휴카드 없음 옵션 추가
            const noneOption = document.createElement('div');
            noneOption.className = 'partner-card-option';
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
            
            // 카드사 옵션들
            Object.keys(cardGroups).forEach(cardName => {
                const cardElement = document.createElement('div');
                cardElement.className = 'partner-card-option';
                
                cardElement.innerHTML = `
                    <div class="card-info">
                        <div class="card-name">${cardName} 카드</div>
                        <div class="card-discount">${cardGroups[cardName].length}개 옵션</div>
                    </div>
                `;
                
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
            const response = await fetch('/api/partner-cards');
            const cards = await response.json();
            
            // 선택된 카드의 사용금액 옵션들
            const cardOptions = cards.filter(card => card.카드 === this.selectedCard);
            
            // 사용금액 기준으로 오름차순 정렬 (00만원 이상에서 숫자 추출)
            cardOptions.sort((a, b) => {
                const amountA = this.extractAmountFromUsage(a.사용금액);
                const amountB = this.extractAmountFromUsage(b.사용금액);
                return amountA - amountB;
            });
            
            container.innerHTML = `
                <div class="step-info">
                    2단계: ${this.selectedCard} 카드의 사용금액을 선택해주세요
                    <button class="btn-back" onclick="calculator.goBackToCardSelection()">← 카드사 선택으로 돌아가기</button>
                </div>
            `;
            
            cardOptions.forEach(card => {
                const cardElement = document.createElement('div');
                cardElement.className = 'partner-card-option usage-option';
                
                cardElement.innerHTML = `
                    <div class="card-info">
                        <div class="card-name">${card.사용금액}</div>
                        <div class="card-benefit">${card.카드혜택 || '혜택 정보 없음'}</div>
                        <div class="card-discount">월 ${this.formatPrice(card.프로모션혜택)} 할인 적용</div>
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
            product.partnerCard = {
                id: this.selectedUsageAmount.id,
                name: `${this.selectedUsageAmount.카드} ${this.selectedUsageAmount.사용금액}`,
                benefit: this.selectedUsageAmount.카드혜택,
                promotionDiscount: this.selectedUsageAmount.프로모션혜택,
                basicDiscount: this.selectedUsageAmount.기본혜택,
                promotionMonths: this.selectedUsageAmount.프로모션개월 || this.selectedUsageAmount.프로모션기간 || 0,
                // 현재 할인액은 프로모션 혜택 사용 (기존 호환성 유지)
                discount: this.selectedUsageAmount.프로모션혜택
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
        if (promotionPriceEl) promotionPriceEl.textContent = this.formatPrice(promotionDiscount + combinationDiscount + partnerCardDiscount);
        if (finalPriceEl) finalPriceEl.textContent = this.formatPrice(total);
        
        // 추가혜택 세부사항 업데이트
        if (promotionDiscountDetailEl) {
            promotionDiscountDetailEl.textContent = `• 프로모션할인: ${this.formatPrice(promotionDiscount)}`;
        }
        if (combinationDiscountDetailEl) {
            combinationDiscountDetailEl.textContent = `• 결합할인: ${this.formatPrice(combinationDiscount)}`;
        }
        if (partnerCardDetailEl) {
            partnerCardDetailEl.textContent = `• 제휴카드: ${this.formatPrice(partnerCardDiscount)}`;
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
        
        if (!partnerCard || !partnerCard.promotionMonths) {
            console.log('프로모션 기간 정보 없음, 기본값 반환');
            return {
                promotionDiscount: partnerCard ? partnerCard.promotionDiscount : 0,
                basicDiscount: partnerCard ? partnerCard.basicDiscount : 0,
                promotionPeriod: 0,
                basicPeriod: 0
            };
        }
        
        // 계약기간을 개월로 변환
        const contractMonths = parseInt(contractPeriod.replace('년', '')) * 12;
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
            
            const response = await fetch(`/api/products/find-exact?${queryParams}`);
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
                <div class="modal-body" style="padding: 20px; white-space: pre-line; font-size: 14px; line-height: 1.6;">
                    ${message}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="document.getElementById('customAlert').remove()">확인</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(alertModal);
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

    // 추가혜택 세부사항 토글 기능
    toggleBenefitDetails() {
        const benefitDetails = document.getElementById('benefitDetails');
        const benefitArrow = document.getElementById('benefitArrow');
        
        if (benefitDetails.style.display === 'none') {
            benefitDetails.style.display = 'block';
            benefitArrow.classList.add('rotated');
            benefitArrow.textContent = '▲';
        } else {
            benefitDetails.style.display = 'none';
            benefitArrow.classList.remove('rotated');
            benefitArrow.textContent = '▼';
        }
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
                detailDiv.textContent = `• ${detail.modelName}: ${detail.amount} (${detail.option})`;
                
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
}

// 페이지 로드 시 초기화
let calculator;

// 템플릿 로딩을 위한 초기화 함수
function initializeCalculator() {
    console.log('initializeCalculator 호출됨');
    
    if (calculator) {
        console.log('Calculator 이미 초기화됨, 재초기화 생략');
        return; // 이미 초기화된 경우 중복 실행 방지
    }
    
    // DOM 요소들이 존재하는지 확인
    const requiredElements = ['addProductCard', 'productsGrid', 'normalPrice', 'finalPrice'];
    const missingElements = requiredElements.filter(id => {
        const element = document.getElementById(id);
        console.log(`${id} 요소:`, element);
        return !element;
    });
    
    if (missingElements.length > 0) {
        console.warn('필요한 DOM 요소들이 없음, 재시도:', missingElements);
        // 200ms 후 다시 시도
        setTimeout(initializeCalculator, 200);
        return;
    }
    
    try {
        calculator = new SubscriptionCalculator();
        
        // 전역 window 객체에도 할당하여 onclick에서 접근 가능하도록
        window.calculator = calculator;
        
        console.log('Calculator 초기화 완료');
        console.log('window.calculator:', window.calculator);
    } catch (error) {
        console.error('Calculator 초기화 실패:', error);
    }
}

// 워터마크 표시 함수
async function displayWatermark() {
    try {
        const response = await fetch('/api/user-info', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const userInfo = await response.json();
            
            // 워터마크 요소 생성
            const watermark = document.createElement('div');
            watermark.className = 'watermark';
            
            // 사용자 정보 구성
            let userInfoText = userInfo.name;
            if (userInfo.position) userInfoText += ` / ${userInfo.position}`;
            if (userInfo.branch) userInfoText += ` / ${userInfo.branch}`;
            userInfoText += ` / ${userInfo.company}`;
            
            // IP 정보
            const ipText = `${userInfo.ip} / ${userInfo.realIp}`;
            
            watermark.innerHTML = `
                <div class="user-info">${userInfoText}</div>
                <div class="ip-info">${ipText}</div>
            `;
            
            document.body.appendChild(watermark);
        }
    } catch (error) {
        console.error('워터마크 표시 오류:', error);
    }
}

// DOM이 준비되었을 때 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded 이벤트 발생');
    displayWatermark(); // 워터마크 표시
    initializeCalculator();
});

// 전역에서 템플릿 로드 후 호출할 수 있는 함수
window.initializeCalculator = initializeCalculator;