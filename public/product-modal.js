class ProductSelectionModal {
    constructor(calculator) {
        this.calculator = calculator;
        this.currentStep = 1;
        this.maxSteps = 7;
        this.selections = {
            제품군: null,
            모델명: null,
            결합유형: null,
            계약기간: null,
            관리유형: null,
            방문주기: null,
            선납: null
        };
        this.isEditMode = false;
        this.editingProductIndex = null;
        
        this.stepTitles = {
            1: '제품군을 선택해주세요',
            2: '모델명을 선택해주세요',
            3: '결합유형을 선택해주세요',
            4: '계약기간을 선택해주세요',
            5: '관리유형을 선택해주세요',
            6: '방문주기를 선택해주세요',
            7: '선납 옵션을 선택해주세요'
        };
        
        this.stepFields = {
            1: '제품군',
            2: '모델명',
            3: '결합유형',
            4: '계약기간',
            5: '관리유형',
            6: '방문주기',
            7: '선납'
        };
        
        this.init();
    }
    
    init() {
        // DOM이 준비되었는지 확인 후 이벤트 리스너 설정
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupEventListeners();
            });
        } else {
            this.setupEventListeners();
        }
    }
    
    setupEventListeners() {
        console.log('모달 EventListener 설정 시작');
        
        // 필수 DOM 요소들이 존재하는지 확인
        const requiredElements = [
            'closeModal', 'productModal', 'prevBtnTop', 
            'addBtn', 'optionSearch'
        ];
        
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        if (missingElements.length > 0) {
            console.warn('모달 DOM 요소들이 아직 준비되지 않음:', missingElements);
            // 100ms 후 다시 시도
            setTimeout(() => this.setupEventListeners(), 100);
            return;
        }
        
        // 모달 닫기
        const closeModal = document.getElementById('closeModal');
        const productModal = document.getElementById('productModal');
        
        if (closeModal) {
            closeModal.addEventListener('click', () => this.closeModal());
        }
        
        if (productModal) {
            productModal.addEventListener('click', (e) => {
                if (e.target.id === 'productModal') {
                    this.closeModal();
                }
            });
        }
        
        // 네비게이션 버튼
        const prevBtnTop = document.getElementById('prevBtnTop');
        const addBtn = document.getElementById('addBtn');
        
        if (prevBtnTop) {
            prevBtnTop.addEventListener('click', () => this.previousStep());
        }
        
        if (addBtn) {
            addBtn.addEventListener('click', () => this.addSelectedProduct());
        }
        
        // 검색 기능
        const optionSearch = document.getElementById('optionSearch');
        if (optionSearch) {
            optionSearch.addEventListener('input', (e) => {
                this.filterOptions(e.target.value);
            });
        }
        
        console.log('모달 EventListener 설정 완료');
    }
    
    openModal() {
        this.resetModal();
        document.getElementById('productModal').style.display = 'block';
        this.loadStepData();
    }
    
    openModalForEdit(product, productIndex) {
        console.log('편집 모드로 모달 열기:', product);
        
        // 편집 모드 설정
        this.isEditMode = true;
        this.editingProductIndex = productIndex;
        
        // 기존 제품 정보로 선택사항 채우기
        this.selections = {
            제품군: product['제품군'] || null,
            모델명: product['모델명'] || null,
            결합유형: product['결합유형'] || null,
            계약기간: product['계약기간'] || null,
            관리유형: product['관리유형'] || '관리없음',
            방문주기: product['방문주기'] || '방문없음',
            선납: product['선납'] || '선납없음'
        };
        
        // 결합유형 단계(3단계)부터 시작 (모델명 선택된 다음부터)
        this.currentStep = 3;
        
        this.updateStepIndicator();
        this.updateNavigationButtons();
        this.updateSelectionSummary();
        
        document.getElementById('productModal').style.display = 'block';
        this.loadStepData();
    }
    
    closeModal() {
        document.getElementById('productModal').style.display = 'none';
    }
    
    resetModal() {
        this.currentStep = 1;
        this.isEditMode = false;
        this.editingProductIndex = null;
        this.selections = {
            제품군: null,
            모델명: null,
            결합유형: null,
            계약기간: null,
            관리유형: null,
            방문주기: null,
            선납: null
        };
        this.updateStepIndicator();
        this.updateNavigationButtons();
        this.updateSelectionSummary();
    }
    
    async loadStepData() {
        try {
            document.getElementById('stepTitle').textContent = this.stepTitles[this.currentStep];
            
            const field = this.stepFields[this.currentStep];
            const options = await this.getOptionsForStep(field);
            
            this.renderOptions(options, field);
        } catch (error) {
            console.error('단계 데이터 로딩 실패:', error);
        }
    }
    
    async getOptionsForStep(field) {
        try {
            // 현재 단계보다 이전 단계의 선택사항만을 기반으로 필터링된 옵션을 가져옴
            const params = new URLSearchParams();
            
            // 현재 단계 번호를 찾기
            const currentStepNum = this.currentStep;
            
            // 현재 단계보다 이전 단계의 선택사항들만 파라미터로 추가
            for (let step = 1; step < currentStepNum; step++) {
                const stepField = this.stepFields[step];
                if (stepField && this.selections[stepField]) {
                    params.append(stepField, this.selections[stepField]);
                }
            }
            
            console.log(`${field} 옵션 로딩 - 적용된 필터:`, Object.fromEntries(params));
            
            const response = await fetch(`/api/product-options/${field}?${params}`);
            return await response.json();
        } catch (error) {
            console.error('옵션 로딩 실패:', error);
            return [];
        }
    }
    
    renderOptions(options, field) {
        const optionsGrid = document.getElementById('optionsGrid');
        const searchSection = document.getElementById('searchSection');
        const searchInput = document.getElementById('optionSearch');
        
        optionsGrid.innerHTML = '';
        
        let uniqueOptions = [...new Set(options.filter(option => option && option.trim()))];
        
        // '계약기간' 필드일 경우 내림차순으로 정렬
        if (field === '계약기간') {
            uniqueOptions.sort((a, b) => {
                const numA = parseInt(a.replace('년', ''));
                const numB = parseInt(b.replace('년', ''));
                return numB - numA; // 내림차순 정렬
            });
        }
        this.currentOptions = uniqueOptions; // 필터링을 위해 저장
        this.currentField = field;
        
        // 옵션이 많으면 검색창 표시 (10개 이상)
        if (uniqueOptions.length >= 10) {
            searchSection.style.display = 'block';
            searchInput.value = ''; // 검색창 초기화
        } else {
            searchSection.style.display = 'none';
        }
        
        this.displayOptions(uniqueOptions, field);
        this.updateSearchResultCount(uniqueOptions.length, uniqueOptions.length);
    }
    
    displayOptions(options, field) {
        const optionsGrid = document.getElementById('optionsGrid');
        optionsGrid.innerHTML = '';
        
        options.forEach(option => {
            const optionCard = document.createElement('div');
            optionCard.className = 'option-card';
            optionCard.dataset.value = option;
            
            const optionTitle = document.createElement('div');
            optionTitle.className = 'option-title';
            optionTitle.textContent = option;
            optionCard.appendChild(optionTitle);
            
            // 텍스트 길이에 따른 간단한 폰트 크기 조정
            const textLength = option.length;
            let fontSize;
            
            if (textLength <= 10) {
                fontSize = '14px';
            } else if (textLength <= 15) {
                fontSize = '12px';
            } else if (textLength <= 20) {
                fontSize = '10px';
            } else if (textLength <= 30) {
                fontSize = '8px';
            } else if (textLength <= 40) {
                fontSize = '7px';
            } else {
                fontSize = '6px';
            }
            
            optionTitle.style.fontSize = fontSize;
            
            optionCard.addEventListener('click', () => this.selectOptionAndNext(option, field, optionCard));
            
            optionsGrid.appendChild(optionCard);
        });
    }
    
    filterOptions(searchTerm) {
        if (!this.currentOptions) return;
        
        const filteredOptions = this.currentOptions.filter(option =>
            option.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        this.displayOptions(filteredOptions, this.currentField);
        this.updateSearchResultCount(filteredOptions.length, this.currentOptions.length);
    }
    
    updateSearchResultCount(filtered, total) {
        const countElement = document.getElementById('searchResultCount');
        if (filtered === total) {
            countElement.textContent = `총 ${total}개 항목`;
        } else {
            countElement.textContent = `${filtered}개 / 총 ${total}개 항목`;
        }
    }
    
    selectOptionAndNext(value, field, cardElement) {
        // 기존 선택 해제
        document.querySelectorAll('.option-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // 새로운 선택
        cardElement.classList.add('selected');
        this.selections[field] = value;
        
        this.updateSelectionSummary();
        
        // 짧은 지연 후 다음 단계로 이동 (선택 효과 보여주기 위해)
        setTimeout(() => {
            if (this.currentStep < this.maxSteps) {
                this.nextStep();
            } else {
                // 마지막 단계면 바로 제품 추가
                this.addSelectedProduct();
            }
        }, 300);
    }
    
    selectOption(value, field, cardElement) {
        // 기존 방식 (필요시 사용)
        document.querySelectorAll('.option-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        cardElement.classList.add('selected');
        this.selections[field] = value;
        
        this.updateSelectionSummary();
        this.updateNavigationButtons();
    }
    
    updateStepIndicator() {
        document.querySelectorAll('.step').forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');
            
            if (stepNumber === this.currentStep) {
                step.classList.add('active');
            } else if (stepNumber < this.currentStep) {
                step.classList.add('completed');
            }
        });
    }
    
    updateSelectionSummary() {
        const selectionItems = document.getElementById('selectionItems');
        selectionItems.innerHTML = '';
        
        Object.keys(this.selections).forEach(key => {
            if (this.selections[key]) {
                const item = document.createElement('div');
                item.className = 'selection-item';
                item.textContent = `${key}: ${this.selections[key]}`;
                selectionItems.appendChild(item);
            }
        });
    }
    
    updateNavigationButtons() {
        const prevBtnTop = document.getElementById('prevBtnTop');
        const addBtn = document.getElementById('addBtn');
        
        // 상단 이전 버튼
        if (this.currentStep === 1) {
            prevBtnTop.style.display = 'none';
        } else {
            prevBtnTop.style.display = 'block';
        }
        
        // 마지막 단계에서 제품 추가 버튼 표시
        if (this.currentStep === this.maxSteps) {
            const currentField = this.stepFields[this.currentStep];
            const canAdd = this.selections[currentField] !== null;
            addBtn.style.display = canAdd ? 'block' : 'none';
        } else {
            addBtn.style.display = 'none';
        }
    }
    
    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            
            // 현재 단계 이후의 선택값들을 초기화
            this.clearSelectionsFromStep(this.currentStep);
            
            this.updateStepIndicator();
            this.loadStepData();
            this.updateNavigationButtons();
            this.updateSelectionSummary();
        }
    }
    
    // 특정 단계부터 이후 모든 선택값을 초기화하는 메서드
    clearSelectionsFromStep(fromStep) {
        for (let step = fromStep; step <= this.maxSteps; step++) {
            const field = this.stepFields[step];
            if (field && this.selections[field] !== undefined) {
                this.selections[field] = null;
            }
        }
        console.log(`단계 ${fromStep}부터 선택값 초기화 완료:`, this.selections);
    }
    
    nextStep() {
        if (this.currentStep < this.maxSteps) {
            this.currentStep++;
            this.updateStepIndicator();
            this.loadStepData();
            this.updateNavigationButtons();
        }
    }
    
    async addSelectedProduct() {
        try {
            // 선택사항을 기반으로 실제 제품 데이터 찾기
            const params = new URLSearchParams();
            Object.keys(this.selections).forEach(key => {
                if (this.selections[key]) {
                    params.append(key, this.selections[key]);
                }
            });
            
            const response = await fetch(`/api/products/find-exact?${params}`);
            const products = await response.json();
            
            if (products.length > 0) {
                const product = products[0]; // 첫 번째 매칭 제품 선택
                
                if (this.isEditMode && this.editingProductIndex !== null) {
                    // 편집 모드: 기존 제품의 제휴카드 정보 유지
                    const existingProduct = this.calculator.selectedProducts[this.editingProductIndex];
                    if (existingProduct.partnerCard) {
                        product.partnerCard = existingProduct.partnerCard;
                    }
                    
                    // 기존 제품을 새 제품으로 교체
                    this.calculator.selectedProducts[this.editingProductIndex] = product;
                    this.calculator.renderProductsGrid();
                    this.calculator.updateCalculator();
                    console.log('제품 수정 완료:', product['모델명']);
                } else {
                    // 일반 모드: 새 제품 추가
                    this.calculator.addProductFromModal(product);
                }
                
                this.closeModal();
            } else {
                alert('선택하신 조건에 맞는 제품을 찾을 수 없습니다.');
            }
        } catch (error) {
            console.error('제품 처리 실패:', error);
            alert('제품 처리 중 오류가 발생했습니다.');
        }
    }
}