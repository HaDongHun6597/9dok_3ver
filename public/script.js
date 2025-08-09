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
        if (addProductCard) {
            addProductCard.addEventListener('click', () => {
                console.log('제품 추가 버튼 클릭됨');
                if (this.modal) {
                    this.modal.openModal();
                } else {
                    console.error('모달이 초기화되지 않음');
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
                <div>
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
                    <span class="price-value final-value">${this.formatPrice(monthlyFee - partnerCard.promotionDiscount)}</span>
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
                    <span class="price-value final-value">${this.formatPrice(monthlyFee - partnerCard.basicDiscount)}</span>
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
            partnerCardDiscount += cardDiscount;
            
            // 정상 구독료 = 월 구독료 + 프로모션 할인액 + 결합할인액
            const productNormalPrice = monthlyFee + activationDiscount + discountAmount;
            
            total += monthlyFee - cardDiscount;
            normalPrice += productNormalPrice;
            promotionDiscount += activationDiscount;
            combinationDiscount += discountAmount;
        });
        
        const totalDiscount = promotionDiscount + combinationDiscount + partnerCardDiscount;
        
        // 계산기 UI 업데이트
        const normalPriceEl = document.getElementById('normalPrice');
        const promotionPriceEl = document.getElementById('promotionPrice');
        const totalBenefitEl = document.getElementById('totalBenefit');
        const finalPriceEl = document.getElementById('finalPrice');
        const promotionDiscountDetailEl = document.getElementById('promotionDiscountDetail');
        const combinationDiscountDetailEl = document.getElementById('combinationDiscountDetail');
        const partnerCardDetailEl = document.getElementById('partnerCardDetail');
        
        if (normalPriceEl) normalPriceEl.textContent = this.formatPrice(normalPrice);
        if (promotionPriceEl) promotionPriceEl.textContent = this.formatPrice(promotionDiscount + partnerCardDiscount);
        if (totalBenefitEl) totalBenefitEl.textContent = this.formatPrice(totalDiscount);
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
                <div class="modal-header" style="background: linear-gradient(135deg, #4caf50, #388e3c);">
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
}

// 페이지 로드 시 초기화
let calculator;
document.addEventListener('DOMContentLoaded', () => {
    calculator = new SubscriptionCalculator();
});