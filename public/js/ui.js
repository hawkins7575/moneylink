import { state, editors } from './state.js';
import { DOM } from './dom.js';
import { syncData, fetchMeta } from './api.js';
import { updateAuthUI } from './auth.js';

// Curation State
let curationSelectionMode = false;
let selectedCurationItemIds = [];
let activeCurationTab = 'recommended';
let editingCurationId = null;       // null = 신규, number = 수정 대상 ID
let curationEditType = 'personal';  // 'personal' | 'recommended'

// ✅ 레터 아바타 생성 함수
export function getLetterAvatarHTML(title) {
    if (!title || typeof title !== 'string') return '<div class="letter-avatar" style="background: var(--av-1)">?</div>';
    const cleanTitle = title.trim();
    const firstLetter = cleanTitle.charAt(0).toUpperCase();
    const charCodeSum = Array.from(cleanTitle).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colorIndex = (charCodeSum % 6) + 1;
    return `<div class="letter-avatar" style="background: var(--av-${colorIndex})">${firstLetter}</div>`;
}

// ✅ [추가] 글로벌 아이콘 에러 핸들러: 데이터 속성(data-title)을 읽어와서 레터 아바타를 생성
window.handleIconError = function(imgElement) {
    if (!imgElement) return;
    const title = imgElement.dataset.title || '';
    const parent = imgElement.parentElement;
    if (parent) {
        parent.innerHTML = getLetterAvatarHTML(title);
    }
};

window.toggleMyBookmark = async function(id, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (!state.currentUser) return;
    
    if (!state.currentUser.myBookmarks) state.currentUser.myBookmarks = [];
    const idx = state.currentUser.myBookmarks.indexOf(id);
    
    let added = false;
    if (idx > -1) {
        state.currentUser.myBookmarks.splice(idx, 1);
    } else {
        state.currentUser.myBookmarks.push(id);
        added = true;
    }
    
    // Trigger golden particle burst only when added!
    if (added && event && event.currentTarget) {
        createStarBurst(event.currentTarget);
    }
    
    const userInDb = state.usersDB.find(u => u.username === state.currentUser.username);
    if (userInDb) userInDb.myBookmarks = [...state.currentUser.myBookmarks];
    localStorage.setItem('fin_currentUser', JSON.stringify(state.currentUser));
    
    renderCards();
    syncData();
    
    // Star popup animation: after re-rendering, we want the star to pop!
    if (added) {
        setTimeout(() => {
            const newCard = document.querySelector(`[onclick*="toggleMyBookmark(${id}"]`);
            if (newCard) {
                const icon = newCard.querySelector('i');
                if (icon) {
                    icon.classList.add('star-pop-anim');
                    setTimeout(() => icon.classList.remove('star-pop-anim'), 400);
                }
            }
        }, 50);
    }
};

window.toggleMyShortcut = async function(id, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (!state.currentUser) return;
    
    if (!state.currentUser.myShortcuts) state.currentUser.myShortcuts = [];
    const idx = state.currentUser.myShortcuts.indexOf(id);
    if (idx > -1) {
        state.currentUser.myShortcuts.splice(idx, 1);
    } else {
        state.currentUser.myShortcuts.push(id);
    }
    
    const userInDb = state.usersDB.find(u => u.username === state.currentUser.username);
    if (userInDb) userInDb.myShortcuts = [...state.currentUser.myShortcuts];
    localStorage.setItem('fin_currentUser', JSON.stringify(state.currentUser));
    
    renderShortcuts();
    syncData();
};

export function initEditors() {
    const quillOptions = {
        theme: 'snow',
        placeholder: '여기에 내용을 작성하거나 사진을 붙여넣으세요...',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                ['link', 'image'],
                ['clean']
            ]
        }
    };

    if (document.getElementById('editor-container')) {
        editors.quill = new Quill('#editor-container', quillOptions);
    }
    if (document.getElementById('boardEditor')) {
        editors.boardQuill = new Quill('#boardEditor', quillOptions);
    }
}

export function closeAllModals(pushState = true) {
    const modals = [
        DOM.modal, DOM.categoryModal, DOM.authModal, DOM.newsModal, 
        DOM.newsReadModal, DOM.boardModal, DOM.boardReadModal, 
        DOM.shortcutModal, DOM.confirmModal, DOM.termsModal, DOM.privacyModal
    ];
    modals.forEach(m => {
        if (m) m.classList.remove('active');
    });
    if (pushState) {
        history.pushState({ type: 'home' }, '', '/');
    }
}

function closeModal() {
    closeAllModals();
}

// Custom Confirmation Modal Logic
let currentConfirmCallback = null;
function confirmAction(title, desc, onConfirm) {
    if (DOM.confirmTitle) DOM.confirmTitle.textContent = title;
    if (DOM.confirmDesc) DOM.confirmDesc.textContent = desc;
    currentConfirmCallback = onConfirm;
    DOM.confirmModal.classList.add('active');
}

// ================= CRUD (window hooks for inline events) ================= //
window.addItem = async (item) => { 
    if (!state.currentUser) return alert('로그인이 필요합니다.');
    if (!item.title || !item.url) return alert('제목과 URL은 필수입니다.');
    
    item.id = Date.now(); 
    item.userId = state.currentUser.username; 
    state.items.unshift(item); 
    
    const success = await syncData(); 
    if (success) {
        closeModal(); 
        renderCards(); 
        alert('새 항목이 성공적으로 저장되었습니다!');
    }
};

window.editItem = (id) => {
    const item = state.items.find(i => i.id === Number(id));
    if (item) {
        document.getElementById('itemId').value = item.id;
        document.getElementById('title').value = item.title;
        document.getElementById('url').value = item.url;
        document.getElementById('description').value = item.description;
        DOM.formCategory.value = item.category || '';
        updateFormSubCategories();
        
        if (item.subCategory) {
            const subCats = Array.isArray(item.subCategory) ? item.subCategory : [item.subCategory];
            subCats.forEach(scId => {
                const cb = DOM.formSubCategoryCheckboxes.querySelector(`input[value="${scId}"]`);
                if (cb) cb.checked = true;
            });
        }
        if (DOM.formType) DOM.formType.value = item.type || 'website';
        if (DOM.isPremiumInput) DOM.isPremiumInput.checked = !!item.isPremium;
        DOM.modalTitle.textContent = '항목 수정';
        DOM.modal.classList.add('active');
    }
};

window.updateItem = async (id, updatedItem) => {
    const index = state.items.findIndex(i => i.id === Number(id));
    if (index !== -1) { 
        updatedItem.userId = state.items[index].userId; 
        state.items[index] = { ...state.items[index], ...updatedItem }; 
        
        const success = await syncData(); 
        if (success) {
            closeModal(); 
            renderCards(); 
            alert('수정이 완료되었습니다!');
        }
    }
};

window.deleteItem = async (id) => {
    confirmAction('즐겨찾기 삭제', '이 즐겨찾기를 삭제하시겠습니까?', async () => {
        state.items = state.items.filter(i => i.id !== Number(id)); 
        await syncData(); 
        renderCards(); 
    });
};

window.deleteNews = async (id) => {
    confirmAction('뉴스 삭제', '이 뉴스를 삭제하시겠습니까?', async () => {
        state.newsData = state.newsData.filter(n => n.id !== Number(id));
        await syncData();
        renderNews();
    });
};

window.editNews = (id) => {
    const news = state.newsData.find(n => n.id === Number(id));
    if (news) {
        if (DOM.newsIdInput) DOM.newsIdInput.value = news.id;
        if (DOM.newsTitleInput) DOM.newsTitleInput.value = news.title;
        if (editors.quill) editors.quill.root.innerHTML = news.content || news.desc || '';
        DOM.newsModalTitle.textContent = '뉴스 수정';
        DOM.newsModal.classList.add('active');
    }
};

window.deleteBoard = async (id) => {
    confirmAction('게시글 삭제', '이 게시글을 삭제하시겠습니까?', async () => {
        const isComm = state.communityData.find(b => b.id === Number(id));
        const isFeedback = state.feedbackData.find(b => b.id === Number(id));
        if (isComm) {
            state.communityData = state.communityData.filter(b => b.id !== Number(id));
            await syncData();
            renderCommunityBoard();
        } else if (isFeedback) {
            state.feedbackData = state.feedbackData.filter(b => b.id !== Number(id));
            await syncData();
            renderFeedbackBoard();
        } else {
            state.boardData = state.boardData.filter(b => b.id !== Number(id));
            await syncData();
            renderBoard();
        }
    });
};

window.deleteCategory = async (id) => {
    confirmAction('대분류 삭제', `[${id}] 대분류를 삭제하시겠습니까? (소속된 항목들은 미분류로 처리됩니다)`, async () => {
        state.categories = state.categories.filter(c => c.id !== id);
        state.items.forEach(i => { if (i.category === id) { i.category = 'etc'; i.subCategory = []; } });
        if (!state.categories.find(c => c.id === 'etc')) state.categories.push({id:'etc', name:'미분류', subCategories:[]});
        await syncData();
        if(state.currentCategory === id) state.currentCategory = 'all';
        renderCategoryManager(); renderCategoryFilters(); renderFormCategories(); renderCards();
    });
};

window.addSubCategory = async (catId) => {
    const idInput = document.getElementById(`addScId_${catId}`);
    const nameInput = document.getElementById(`addScName_${catId}`);
    if (!idInput.value.trim() || !nameInput.value.trim()) return alert('ID와 이름을 모두 입력해주세요.');
    const cat = state.categories.find(c => c.id === catId);
    if (cat.subCategories.find(s => s.id === idInput.value.trim())) return alert('이미 존재하는 소분류 ID입니다.');
    cat.subCategories.push({id: idInput.value.trim(), name: nameInput.value.trim()});
    await syncData(); 
    renderCategoryManager(); renderSubCategoryFilters(); renderFormCategories();
};

window.deleteSubCategory = async (catId, scId) => {
    confirmAction('소분류 삭제', `[${scId}] 소분류를 삭제하시겠습니까?`, async () => {
        const cat = state.categories.find(c => c.id === catId);
        if (cat) {
            cat.subCategories = cat.subCategories.filter(sc => sc.id !== scId);
            state.items.forEach(i => { 
                if (i.category === catId) {
                    if (Array.isArray(i.subCategory)) {
                        i.subCategory = i.subCategory.filter(s => s !== scId);
                    } else if (i.subCategory === scId) {
                        i.subCategory = [];
                    }
                }
            });
            await syncData();
            if(Array.isArray(state.currentSubCategory)) {
                state.currentSubCategory = state.currentSubCategory.filter(s => s !== scId);
                if (state.currentSubCategory.length === 0) state.currentSubCategory = ['all'];
            }
            renderCategoryManager(); renderSubCategoryFilters(); renderFormCategories(); renderCards();
        }
    });
};

function moveInArray(array, index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= array.length) return;
    const temp = array[index];
    array[index] = array[newIndex];
    array[newIndex] = temp;
}

window.moveCategory = async (index, direction) => {
    moveInArray(state.categories, index, direction);
    await syncData();
    renderCategoryManager(); renderCategoryFilters(); renderFormCategories();
};

window.moveSubCategory = async (catId, scIndex, direction) => {
    const cat = state.categories.find(c => c.id === catId);
    if (cat) {
        moveInArray(cat.subCategories, scIndex, direction);
        await syncData();
        renderCategoryManager(); renderSubCategoryFilters(); renderFormCategories();
    }
};

window.editShortcut = (id) => {
    const item = state.shortcuts.find(s => s.id === id);
    if (item) {
        document.getElementById('shortcutId').value = item.id;
        document.getElementById('shortcutTitle').value = item.title;
        document.getElementById('shortcutUrl').value = item.url;
        DOM.shortcutModalTitle.textContent = '바로가기 수정';
        DOM.shortcutModal.classList.add('active');
    }
};

window.deleteShortcut = async (id) => {
    confirmAction('바로가기 삭제', '이 바로가기를 삭제하시겠습니까?', async () => {
        state.shortcuts = state.shortcuts.filter(s => s.id !== Number(id));
        await syncData();
        renderShortcuts();
    });
};

// ================= PREMIUM MICRO-INTERACTIONS ================= //
export function updateSlidingIndicator(container) {
    if (!container) return;
    
    // requestAnimationFrame to ensure DOM is updated and rendered
    requestAnimationFrame(() => {
        const activeBtn = container.querySelector('.filter-btn.active');
        let indicator = container.querySelector('.sliding-indicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'sliding-indicator';
            container.appendChild(indicator);
        }
        
        if (activeBtn) {
            // Update position and size based on activeBtn relative to container
            indicator.style.left = `${activeBtn.offsetLeft}px`;
            indicator.style.top = `${activeBtn.offsetTop}px`;
            indicator.style.width = `${activeBtn.offsetWidth}px`;
            indicator.style.height = `${activeBtn.offsetHeight}px`;
            indicator.style.opacity = '1';
            
            // Inherit border radius
            const borderRadius = window.getComputedStyle(activeBtn).borderRadius;
            indicator.style.borderRadius = borderRadius;
        } else {
            indicator.style.opacity = '0';
        }
    });
}

export function createStarBurst(element) {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const count = 8;
    
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('span');
        particle.className = 'star-particle';
        
        // Position exactly in the center of the clicked button
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        
        // Calculate angle and distance for burst
        const angle = (i * (360 / count)) * Math.PI / 180;
        const distance = 40 + Math.random() * 20; // 40px to 60px expansion
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        
        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        
        document.body.appendChild(particle);
        
        // Cleanup after animation finishes
        setTimeout(() => {
            particle.remove();
        }, 800);
    }
}

export function createFloatingEmoji(element, emojiChar) {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    
    const floating = document.createElement('span');
    floating.className = 'floating-emoji';
    floating.textContent = emojiChar;
    
    // Position near the button center
    const x = rect.left + rect.width / 2;
    const y = rect.top;
    
    floating.style.left = `${x}px`;
    floating.style.top = `${y}px`;
    
    // Random translation along X-axis
    const tx = (Math.random() - 0.5) * 60; // -30px to 30px
    floating.style.setProperty('--tx', `${tx}px`);
    
    document.body.appendChild(floating);
    
    // Cleanup
    setTimeout(() => {
        floating.remove();
    }, 1200);
}

// Window resize sync for sliding indicators
window.addEventListener('resize', () => {
    if (DOM.catContainer) updateSlidingIndicator(DOM.catContainer);
    const mainCatContainer = document.getElementById('main-category-filter-container');
    if (mainCatContainer) updateSlidingIndicator(mainCatContainer);
    const typeContainer = document.querySelector('.sidebar-type-list');
    if (typeContainer) updateSlidingIndicator(typeContainer);
});

// ================= RENDERERS ================= //
const categoryIcons = {
    'all': 'fa-solid fa-layer-group',
    'stock': 'fa-solid fa-chart-line',
    'coin': 'fa-brands fa-bitcoin',
    'bond': 'fa-solid fa-file-invoice-dollar',
    'insurance': 'fa-solid fa-shield-halved',
    'finance': 'fa-solid fa-building-columns',
    'economy': 'fa-solid fa-earth-asia'
};

export function renderCategoryFilters() {
    const myFilterBtn = state.currentUser ? `
        <button class="filter-btn ${state.currentCategory === 'my' ? 'active' : ''}" data-filter="my" style="color:var(--primary); font-weight:800;">
            <i class="fa-solid fa-star"></i>
            <span>내 즐겨찾기</span>
        </button>` : '';

    const filterHTML = myFilterBtn + `
        <button class="filter-btn ${state.currentCategory === 'all' ? 'active' : ''}" data-filter="all">
            <i class="${categoryIcons['all'] || 'fa-solid fa-folder'}"></i>
            <span>전체</span>
        </button>` + 
    state.categories.map(c => {
        const iconClass = categoryIcons[c.id] || 'fa-solid fa-folder';
        return `
            <button class="filter-btn ${state.currentCategory === c.id ? 'active' : ''}" data-filter="${c.id}">
                <i class="${iconClass}"></i>
                <span>${c.name}</span>
            </button>`;
    }).join('');

    // Render to sidebar (desktop)
    if (DOM.catContainer) DOM.catContainer.innerHTML = filterHTML;
    
    // Render to main view (mobile/quick access)
    const mainCatContainer = document.getElementById('main-category-filter-container');
    if (mainCatContainer) mainCatContainer.innerHTML = filterHTML;

    // Attach events to both
    const containers = [DOM.catContainer, mainCatContainer];
    containers.forEach(container => {
        if (!container) return;
        container.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.currentCategory = btn.dataset.filter;
                state.currentSubCategory = ['all'];
                renderCategoryFilters();
                renderSubCategoryFilters();
                renderCards();
            });
        });
    });

    if (DOM.currentCategoryTitle) DOM.currentCategoryTitle.style.display = 'none';
    renderSubCategoryFilters();

    // Update sliding indicators
    if (DOM.catContainer) updateSlidingIndicator(DOM.catContainer);
    if (mainCatContainer) updateSlidingIndicator(mainCatContainer);
}

export function renderSubCategoryFilters() {
    if (!DOM.subCatContainer) return;
    
    if (state.currentCategory === 'all') {
        DOM.subCatContainer.style.display = 'none';
        return;
    }
    const cat = state.categories.find(c => c.id === state.currentCategory);
    if (!cat || !cat.subCategories || cat.subCategories.length === 0) {
        DOM.subCatContainer.style.display = 'none';
        return;
    }

    DOM.subCatContainer.style.display = 'flex';
    DOM.subCatContainer.innerHTML = `<button class="sub-filter-btn ${state.currentSubCategory.includes('all') ? 'active' : ''}" data-subfilter="all">전체</button>`;
    cat.subCategories.forEach(sc => {
        DOM.subCatContainer.innerHTML += `<button class="sub-filter-btn ${state.currentSubCategory.includes(sc.id) ? 'active' : ''}" data-subfilter="${sc.id}">${sc.name}</button>`;
    });

    DOM.subCatContainer.querySelectorAll('.sub-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.subfilter;
            if (filter === 'all') {
                state.currentSubCategory = ['all'];
            } else {
                if (state.currentSubCategory.includes('all')) state.currentSubCategory = [];
                if (state.currentSubCategory.includes(filter)) {
                    state.currentSubCategory = state.currentSubCategory.filter(f => f !== filter);
                    if (state.currentSubCategory.length === 0) state.currentSubCategory = ['all'];
                } else {
                    state.currentSubCategory.push(filter);
                }
            }
            renderSubCategoryFilters();
            renderCards();
        });
    });
}

export function updateFormSubCategories() {
    const catId = DOM.formCategory.value;
    const cat = state.categories.find(c => c.id === catId);
    
    if (DOM.formSubCategoryCheckboxes) {
        DOM.formSubCategoryCheckboxes.innerHTML = '';
        if (cat && cat.subCategories && cat.subCategories.length > 0) {
            cat.subCategories.forEach(sc => {
                const item = document.createElement('label');
                item.className = 'checkbox-item';
                item.innerHTML = `
                    <input type="checkbox" name="subCategory" value="${sc.id}">
                    <span>${sc.name}</span>
                `;
                DOM.formSubCategoryCheckboxes.appendChild(item);
            });
        } else {
            DOM.formSubCategoryCheckboxes.innerHTML = '<div style="font-size:0.8rem; color:var(--on-surface-variant); opacity:0.5; padding:0.5rem;">하위 분류 없음</div>';
        }
    }
}

export function renderFormCategories() {
    DOM.formCategory.innerHTML = '';
    state.categories.forEach(c => {
        DOM.formCategory.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
    updateFormSubCategories();
}

export function renderCards() {
    DOM.grid.innerHTML = '';
    
    let filteredData = state.items;
    if (!state.currentUser) {
        filteredData = filteredData.filter(item => item.userId === 'admin');
    } else if (state.currentUser.role === 'user') {
        filteredData = filteredData.filter(item => item.userId === 'admin' || item.userId === state.currentUser.username);
    }
    filteredData = filteredData.filter(item => {
        const isMyMode = state.currentCategory === 'my';
        if (isMyMode) {
            if (!state.currentUser || !state.currentUser.myBookmarks || !state.currentUser.myBookmarks.includes(item.id)) return false;
        }

        const catMatch = isMyMode ? true : (state.currentCategory === 'all' || item.category === state.currentCategory);
        
        let subCatMatch = false;
        if (isMyMode || state.currentSubCategory.includes('all')) {
            subCatMatch = true;
        } else {
            const itemSubCats = Array.isArray(item.subCategory) ? item.subCategory : [item.subCategory].filter(Boolean);
            subCatMatch = itemSubCats.some(sc => state.currentSubCategory.includes(sc));
        }

        const typeMatch = state.currentType === 'all' || item.type === state.currentType;
        const searchMatch = !state.currentSearchQuery || item.title.toLowerCase().includes(state.currentSearchQuery) || (item.description && item.description.toLowerCase().includes(state.currentSearchQuery));
        return catMatch && subCatMatch && typeMatch && searchMatch;
    });

    // ✅ 0순위: 내 즐겨찾기, 1순위: 웹, 2순위: 프리미엄 판단
    filteredData.sort((a, b) => {
        if (state.currentUser && state.currentUser.myBookmarks) {
            const isAMy = state.currentUser.myBookmarks.includes(a.id);
            const isBMy = state.currentUser.myBookmarks.includes(b.id);
            if (isAMy && !isBMy) return -1;
            if (!isAMy && isBMy) return 1;
        }

        const isAWeb = a.type !== 'youtube';
        const isBWeb = b.type !== 'youtube';
        
        if (isAWeb && !isBWeb) return -1;
        if (!isAWeb && isBWeb) return 1;
        
        if (a.isPremium && !b.isPremium) return -1;
        if (!a.isPremium && b.isPremium) return 1;
        
        return 0;
    });

    if (DOM.itemsCountEl) DOM.itemsCountEl.textContent = filteredData.length;

    // Chunked Rendering 최적화: 한 번에 수십 개를 그리지 않고 나눠서 렌더링
    const CHUNK_SIZE = 12;
    let currentIndex = 0;

    function renderNextChunk() {
        const nextChunk = filteredData.slice(currentIndex, currentIndex + CHUNK_SIZE);
        if (nextChunk.length === 0) return;

        nextChunk.forEach((item, i) => {
            const absoluteIndex = currentIndex + i;
            const card = document.createElement('article');
            const isSelected = selectedCurationItemIds.includes(item.id);
            card.className = `card ${item.category} ${item.isPremium ? 'premium' : ''} ${curationSelectionMode ? 'selection-mode-active' : ''} ${isSelected ? 'selected' : ''}`;
            card.style.animationDelay = `${Math.min(i * 0.05, 0.3)}s`;

            // 큐레이션 모드일 때 클릭 시 동작 재정의
            card.addEventListener('click', (e) => {
                if (curationSelectionMode) {
                    e.preventDefault();
                    e.stopPropagation();
                    const checkbox = card.querySelector('.card-curation-checkbox');
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        window.toggleCurationCardSelection(item.id, checkbox);
                    }
                }
            });

            const catLabel = (state.categories.find(c => c.id === item.category)?.name || item.category).toUpperCase();
            
            let subCatLabels = [];
            if (item.subCategory) {
                const pCat = state.categories.find(c => c.id === item.category);
                if (pCat) {
                    const subCatIds = Array.isArray(item.subCategory) ? item.subCategory : [item.subCategory];
                    subCatIds.forEach(id => {
                        const scObj = pCat.subCategories.find(sc => sc.id === id);
                        if (scObj) subCatLabels.push(scObj.name);
                    });
                }
            }
            const subCatLabel = subCatLabels.length > 0 ? ` > ${subCatLabels.join(', ')}` : '';

            let faviconUrl = '';
            try {
                const domain = new URL(item.url).hostname;
                faviconUrl = `/api/favicon?domain=${domain}`;
            } catch (e) {
                faviconUrl = ''; 
            }

            let myBookmarkBtn = '';
            if (state.currentUser) {
                const isMy = state.currentUser.myBookmarks && state.currentUser.myBookmarks.includes(item.id);
                const starIcon = isMy 
                    ? '<i class="fa-solid fa-star" style="color: #FFB300; filter: drop-shadow(0 2px 4px rgba(255,179,0,0.4)); text-shadow: 0 0 1px rgba(0,0,0,0.1));"></i>' 
                    : '<i class="fa-regular fa-star" style="color: #8B9BB4; transition: color 0.2s;"></i>';
                myBookmarkBtn = `
                    <button class="my-star-btn" title="내 즐겨찾기에 추가/제거" onclick="window.toggleMyBookmark(${item.id}, event);">
                        ${starIcon}
                    </button>
                `;
            }

            let actionsHtml = '';
            if (state.currentUser && state.currentUser.role === 'admin') {
                actionsHtml = `
                    <div class="card-actions" onclick="event.preventDefault(); event.stopPropagation();">
                        <button class="card-action-btn edit" title="수정" onclick="window.editItem(${item.id});">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="card-action-btn delete" title="삭제" onclick="window.deleteItem(${item.id});">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                `;
            }

            let ownerBadge = '';
            if (item.userId && item.userId !== 'admin') {
                ownerBadge = `<span class="badge" style="background:#e3f2fd; color:#0d47a1;"><i class="fa-solid fa-user"></i> 나의 즐겨찾기</span>`;
            }

            const typeIcon = item.type === 'youtube' ? '<i class="fa-brands fa-youtube" style="color:#ff0000"></i>' : '<i class="fa-solid fa-globe"></i>';
            const typeLabel = item.type === 'youtube' ? 'YouTube' : 'Website';
            const typeBadge = `<span class="badge" style="background:#f5f5f5; color:var(--on-surface-variant);"><span style="margin-right:0.25rem;">${typeIcon}</span> ${typeLabel}</span>`;
            const premiumBadge = item.isPremium ? `<div class="premium-badge" title="우수사이트"><i class="fa-solid fa-crown"></i></div>` : '';

            // Curation Checkbox
            const checkboxHtml = `
                <div class="card-curation-checkbox-wrapper" onclick="event.stopPropagation();">
                    <input type="checkbox" class="card-curation-checkbox" data-id="${item.id}" ${isSelected ? 'checked' : ''} onchange="window.toggleCurationCardSelection(${item.id}, this)">
                </div>
            `;

            card.innerHTML = `
                ${premiumBadge}
                ${myBookmarkBtn}
                ${checkboxHtml}
                ${actionsHtml ? `<div class="card-actions" style="display:flex; gap:0.5rem;" onclick="event.preventDefault(); event.stopPropagation();">
                    ${actionsHtml.replace('<div class="card-actions" onclick="event.preventDefault(); event.stopPropagation();">', '').replace('</div>', '')}
                </div>` : ''}
                <a href="${item.url}" target="_blank" class="card-link">
                    <div class="card-header">
                        <div class="card-icon">
                            ${faviconUrl ? 
                                `<img src="${faviconUrl}" 
                                     data-title="${item.title.replace(/"/g, '&quot;')}"
                                     alt="${item.title.replace(/"/g, '&quot;')}" 
                                     style="width: 24px; height: 24px; border-radius: 4px; object-fit: contain;"
                                     onerror="handleIconError(this)">`
                                : getLetterAvatarHTML(item.title)
                            }
                        </div>
                        <h3 class="card-title">${item.title}</h3>
                    </div>
                    <div class="card-desc">${item.description}</div>
                    <div class="card-badges">
                        <span class="badge badge-category">${catLabel}${subCatLabel}</span>
                        ${typeBadge}
                        ${ownerBadge}
                    </div>
                </a>
            `;
            DOM.grid.appendChild(card);
        });

        currentIndex += CHUNK_SIZE;
        if (currentIndex < filteredData.length) {
            requestAnimationFrame(renderNextChunk);
        }
    }

    renderNextChunk();
}

function renderCategoryManager() {
    DOM.categoryManagerList.innerHTML = '';
    state.categories.forEach((cat, index) => {
        let scHtml = '';
        cat.subCategories.forEach((sc, scIndex) => {
            const upBtn = scIndex > 0 ? `<button onclick="window.moveSubCategory('${cat.id}', ${scIndex}, -1)" style="background:none; border:none; color:var(--primary); cursor:pointer; padding:2px;"><i class="fa-solid fa-chevron-up"></i></button>` : '';
            const downBtn = scIndex < cat.subCategories.length - 1 ? `<button onclick="window.moveSubCategory('${cat.id}', ${scIndex}, 1)" style="background:none; border:none; color:var(--primary); cursor:pointer; padding:2px;"><i class="fa-solid fa-chevron-down"></i></button>` : '';
            scHtml += `
                <div style="display:flex; justify-content:space-between; padding:0.5rem; background:var(--surface-container-low); border-radius:4px; margin-top:0.5rem; align-items:center;">
                    <span style="font-size:0.9rem; font-family:'Pretendard Variable', sans-serif;">- ${sc.name} <small style="color:var(--on-surface-variant);">(${sc.id})</small></span>
                    <div style="display:flex; gap:0.5rem; align-items:center;">
                        ${upBtn}${downBtn}
                        <button onclick="window.deleteSubCategory('${cat.id}', '${sc.id}')" style="background:none; border:none; color:#D32F2F; cursor:pointer;"><i class="fa-solid fa-times"></i></button>
                    </div>
                </div>`;
        });

        const catUpBtn = index > 0 ? `<button onclick="window.moveCategory(${index}, -1)" class="action-btn" style="background:var(--surface-container-high); color:var(--primary); padding:0.4rem; font-size:0.8rem; border-radius:4px; margin-right:4px;"><i class="fa-solid fa-arrow-up"></i></button>` : '';
        const catDownBtn = index < state.categories.length - 1 ? `<button onclick="window.moveCategory(${index}, 1)" class="action-btn" style="background:var(--surface-container-high); color:var(--primary); padding:0.4rem; font-size:0.8rem; border-radius:4px; margin-right:4px;"><i class="fa-solid fa-arrow-down"></i></button>` : '';

        DOM.categoryManagerList.innerHTML += `
            <div style="border: 1px solid var(--surface-container-low); border-radius: 8px; padding: 1.5rem; background:var(--surface-container-lowest);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <div style="display:flex; align-items:center;">
                        <strong style="font-size:1.1rem; color:var(--primary); font-family:'Pretendard Variable', sans-serif; margin-right:1rem;">${cat.name} <small style="color:var(--on-surface-variant); font-weight:normal;">(${cat.id})</small></strong>
                        ${catUpBtn}${catDownBtn}
                    </div>
                    <button onclick="window.deleteCategory('${cat.id}')" class="action-btn" style="background:#D32F2F; padding:0.4rem 0.8rem; font-size:0.8rem; border-radius:4px;">대분류 삭제</button>
                </div>
                <div>${scHtml}</div>
                <div style="display:flex; gap:0.5rem; margin-top:1rem; align-items:center;">
                    <input type="text" id="addScId_${cat.id}" placeholder="하위 ID" style="flex:1; border:none; border-bottom:var(--ghost-border); padding:0.5rem; font-family:'Pretendard Variable'; background:transparent; outline:none; font-size: 0.85rem;">
                    <input type="text" id="addScName_${cat.id}" placeholder="하위 이름" style="flex:1; border:none; border-bottom:var(--ghost-border); padding:0.5rem; font-family:'Pretendard Variable'; background:transparent; outline:none; font-size: 0.85rem;">
                    <button onclick="window.addSubCategory('${cat.id}')" class="action-btn" style="padding:0.5rem 1rem; font-size:0.85rem; border-radius:4px;">소분류 추가</button>
                </div>
            </div>
        `;
    });
}

export function updateJSONLD(type, item) {
    let script = document.getElementById('dynamic-json-ld');
    if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = 'dynamic-json-ld';
        document.head.appendChild(script);
    }
    
    const ld = {
        "@context": "https://schema.org",
        "@type": type === 'news' ? 'NewsArticle' : 'Article',
        "headline": item.title,
        "datePublished": new Date(item.timestamp).toISOString(),
        "author": {
            "@type": "Person",
            "name": item.author || "MoneyLink Team"
        }
    };
    script.textContent = JSON.stringify(ld);
}

export function openNewsModal(news) {
    const dateStr = new Date(news.timestamp).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
    const displayContent = news.content || news.desc || '내용이 없습니다.';
    DOM.readNewsTitle.textContent = news.title;
    DOM.readNewsDate.textContent = dateStr;
    DOM.readNewsContent.innerHTML = displayContent;
    DOM.newsReadModal.classList.add('active');
    
    history.pushState({ type: 'news', id: news.id }, '', `/?view=news&id=${news.id}`);
    updateJSONLD('news', news);
}

export function renderNews() {
    if (!DOM.newsFeedSection || !DOM.newsGrid) return;
    
    if (!state.newsData || state.newsData.length === 0) {
        DOM.newsFeedSection.style.display = 'none';
        return;
    }
    DOM.newsFeedSection.style.display = 'block';
    DOM.newsGrid.innerHTML = '';
    
    const topNews = [...state.newsData].reverse().slice(0, 3);
    
    topNews.forEach(news => {
        const dateStr = new Date(news.timestamp).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
        const card = document.createElement('article');
        card.className = 'news-card';
        const displayContent = news.content || news.desc || '내용이 없습니다.';
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = displayContent;
        
        const firstImg = tempDiv.querySelector('img');
        const thumbHtml = firstImg ? `
            <div class="news-card-thumb" id="thumb-news-${news.id}">
                <img src="${firstImg.src}" 
                     alt="${news.title.replace(/"/g, '&quot;')}" 
                     loading="lazy"
                     onerror="this.parentElement.innerHTML='<div class=\'thumb-placeholder\'><i class=\'fas fa-newspaper\'></i><span>NEWS</span></div>'">
            </div>
        ` : '';
        
        card.onclick = () => {
            if (news.url && !news.content) {
                window.open(news.url, '_blank');
            } else {
                openNewsModal(news);
            }
        };
        
        card.innerHTML = `
            <div class="news-date">${dateStr}</div>
            <h3 class="news-title" style="margin:0; font-size:1.1rem; font-weight:600;">${news.title}</h3>
            ${thumbHtml}
        `;
        
        if (state.currentUser && state.currentUser.role === 'admin') {
            const actions = document.createElement('div');
            actions.className = 'news-card-actions'; 
            actions.innerHTML = `
                <button class="news-action-btn edit" onclick="window.editNews(${news.id}); event.stopPropagation();">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="news-action-btn delete" onclick="window.deleteNews(${news.id}); event.stopPropagation();">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;
            card.appendChild(actions);
        }
        
        DOM.newsGrid.appendChild(card);
    });
}

export function renderShortcuts() {
    if (!DOM.shortcutsGrid) return;
    DOM.shortcutsGrid.innerHTML = '';

    if (!state.shortcuts || state.shortcuts.length === 0) {
        DOM.shortcutsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--on-surface-variant);">등록된 바로가기가 없습니다.</div>';
        return;
    }

    let sortedShortcuts = [...state.shortcuts];
    sortedShortcuts.sort((a, b) => {
        if (state.currentUser && state.currentUser.myShortcuts) {
            const isAMy = state.currentUser.myShortcuts.includes(a.id);
            const isBMy = state.currentUser.myShortcuts.includes(b.id);
            if (isAMy && !isBMy) return -1;
            if (!isAMy && isBMy) return 1;
        }
        return 0;
    });

    sortedShortcuts.forEach((item, index) => {
        let domain = '';
        try { domain = new URL(item.url).hostname; } 
        catch (e) { domain = '링크 바로가기'; }

        const card = document.createElement('div');
        card.className = 'shortcut-card-wrapper';
        card.style.animationDelay = `${index * 0.03}s`;
        card.style.position = 'relative';

        let adminActions = '';
        if (state.currentUser && state.currentUser.role === 'admin') {
            adminActions = `
                <div class="card-actions">
                    <button class="shortcut-action-btn edit" onclick="window.editShortcut(${item.id}); event.preventDefault();">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="shortcut-action-btn delete" onclick="window.deleteShortcut(${item.id}); event.preventDefault();">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
        }

        let myShortcutBtn = '';
        if (state.currentUser) {
            const isMy = state.currentUser.myShortcuts && state.currentUser.myShortcuts.includes(item.id);
            const starIcon = isMy 
                ? '<i class="fa-solid fa-star" style="color: #FFB300; filter: drop-shadow(0 2px 4px rgba(255,179,0,0.4)); text-shadow: 0 0 1px rgba(0,0,0,0.1);"></i>' 
                : '<i class="fa-regular fa-star" style="color: #8B9BB4; transition: color 0.2s;"></i>';
            myShortcutBtn = `
                <button class="shortcut-star" title="내 즐겨찾기에 추가/제거" onclick="window.toggleMyShortcut(${item.id}, event);">
                    ${starIcon}
                </button>
            `;
        }

        card.innerHTML = `
            <a href="${item.url}" target="_blank" class="shortcut-card" style="position:relative; width:100%; height:100%; display:block;">
                ${myShortcutBtn}
                ${adminActions}
                <div class="card-title">${item.title}</div>
                <div class="card-domain">${domain}</div>
            </a>
        `;
        DOM.shortcutsGrid.appendChild(card);
    });
}

export function renderComments(post) {
    if (!DOM.commentList) return;
    DOM.commentList.innerHTML = '';
    const comments = post.comments || [];
    DOM.commentCountTotal.textContent = comments.length;

    if (comments.length === 0) {
        DOM.commentList.innerHTML = '<div style="text-align: center; color: var(--on-surface-variant); padding: 2rem; background: var(--surface-container-low); border-radius: 12px; font-size: 0.9rem;">첫 번째 댓글을 남겨보세요.</div>';
        return;
    }

    comments.forEach(comment => {
        const date = new Date(comment.timestamp).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const item = document.createElement('div');
        item.style.cssText = `
            padding: 1rem;
            background: var(--surface-container-low);
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        `;
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 700; font-size: 0.9rem; color: var(--on-surface);">${comment.author}</span>
                <span style="font-size: 0.75rem; color: var(--on-surface-variant);">${date}</span>
            </div>
            <div style="font-size: 0.9rem; line-height: 1.5; color: var(--on-surface);">${comment.content}</div>
        `;
        DOM.commentList.appendChild(item);
    });
}

export async function openBoardModal(post) {
    // Increment views locally
    post.views = (post.views || 0) + 1;
    
    // Attempt to sync view count silently
    syncData();

    const dateStr = new Date(post.timestamp).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    DOM.readBoardTitle.textContent = post.title;
    DOM.readBoardAuthor.textContent = post.author;
    DOM.readBoardDate.textContent = dateStr;
    DOM.readBoardContent.innerHTML = post.content;
    
    // Check permissions
    if (state.currentUser && state.currentUser.role === 'admin') {
        DOM.readBoardActions.style.display = 'flex';
        DOM.editReadPostBtn.onclick = () => { closeAllModals(false); window.editBoard(post.id); };
        DOM.deleteReadPostBtn.onclick = () => { closeAllModals(false); window.deleteBoard(post.id); };
    } else {
        DOM.readBoardActions.style.display = 'none';
    }

    DOM.boardReadModal.classList.add('active');
    
    // Update Reactions & Comments in UI
    DOM.postLikeCount.textContent = post.likes || 0;
    DOM.postDislikeCount.textContent = post.dislikes || 0;
    
    // Handle Reactions
    DOM.likePostBtn.onclick = () => {
        post.likes = (post.likes || 0) + 1;
        DOM.postLikeCount.textContent = post.likes;
        
        // Emoji bounce & float
        const emojiSpan = DOM.likePostBtn.querySelector('span:first-child');
        if (emojiSpan) {
            emojiSpan.classList.remove('emoji-bounce');
            void emojiSpan.offsetWidth; // force reflow
            emojiSpan.classList.add('emoji-bounce');
        }
        createFloatingEmoji(DOM.likePostBtn, '👍');
        
        syncData();
    };
    DOM.dislikePostBtn.onclick = () => {
        post.dislikes = (post.dislikes || 0) + 1;
        DOM.postDislikeCount.textContent = post.dislikes;
        
        // Emoji bounce & float
        const emojiSpan = DOM.dislikePostBtn.querySelector('span:first-child');
        if (emojiSpan) {
            emojiSpan.classList.remove('emoji-bounce');
            void emojiSpan.offsetWidth; // force reflow
            emojiSpan.classList.add('emoji-bounce');
        }
        createFloatingEmoji(DOM.dislikePostBtn, '👎');
        
        syncData();
    };

    renderComments(post);
    
    // Pre-fill comment author if logged in
    if (DOM.commentAuthor) {
        DOM.commentAuthor.value = state.currentUser ? state.currentUser.username : '';
    }
    
    history.pushState({ type: 'board', id: post.id }, '', `/?view=board&id=${post.id}`);
    updateJSONLD('board', post);
}

export function renderBoard() {
    if (!DOM.boardGrid) return;
    DOM.boardGrid.innerHTML = '';
    if (!state.boardData || state.boardData.length === 0) {
        DOM.boardGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--on-surface-variant);">아직 작성된 추천글이 없습니다. 첫 번째 인사이트를 나눠보세요!</div>';
        return;
    }

    [...state.boardData].reverse().forEach(post => {
        const dateStr = new Date(post.timestamp).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
        const card = document.createElement('article');
        card.className = 'board-card';
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = post.content;
        
        const firstImg = tempDiv.querySelector('img');
        const thumbHtml = firstImg ? `
            <div class="board-card-thumb" id="thumb-board-${post.id}">
                <img src="${firstImg.src}" 
                     alt="${post.title.replace(/"/g, '&quot;')}" 
                     loading="lazy"
                     onerror="this.parentElement.innerHTML='<div class=\'thumb-placeholder\'><i class=\'fas fa-file-alt\'></i><span>REPORT</span></div>'">
            </div>
        ` : '';

        card.innerHTML = `
            ${thumbHtml}
            <div class="board-card-content">
                <h3 class="board-title" style="margin:0; font-size:1.15rem; font-weight:700;">${post.title}</h3>
                <div class="board-meta">
                    <span class="board-author"><i class="fa-solid fa-user"></i> ${post.author}</span>
                    <span><i class="fa-solid fa-calendar-days"></i> ${dateStr}</span>
                    <span><i class="fa-solid fa-eye"></i> ${post.views || 0}</span>
                </div>
            </div>
        `;

        card.onclick = () => {
            openBoardModal(post);
        };

        if (state.currentUser && state.currentUser.role === 'admin') {
            const actions = document.createElement('div');
            actions.className = 'board-card-actions';
            actions.onclick = (e) => e.stopPropagation(); 
            actions.innerHTML = `
                <button class="board-action-btn edit" title="수정" onclick="window.editBoard(${post.id});">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="board-action-btn delete" title="삭제" onclick="window.deleteBoard(${post.id});">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;
            card.appendChild(actions);
        }

        DOM.boardGrid.appendChild(card);
    });
}

export function renderCommunityBoard() {
    if (!DOM.communityBoardList) return;
    DOM.communityBoardList.innerHTML = '';
    
    if (!state.communityData || state.communityData.length === 0) {
        DOM.communityBoardList.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:3rem; color:var(--on-surface-variant);">등록된 게시글이 없습니다. 첫 글을 작성해보세요!</td></tr>';
        return;
    }

    const posts = [...state.communityData].sort((a, b) => b.timestamp - a.timestamp);
    
    posts.forEach((post, index) => {
        const dateObj = new Date(post.timestamp);
        const dateStr = `${dateObj.getMonth() + 1}.${dateObj.getDate()}`;
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td class="col-num">${posts.length - index}</td>
            <td class="col-title">${post.title} ${post.comments?.length > 0 ? `<span style="font-size:0.75rem; color:var(--primary); font-weight:800; margin-left:0.3rem;">[${post.comments.length}]</span>` : ''}</td>
            <td class="col-author">${post.author}</td>
            <td class="col-date">${dateStr}</td>
            <td class="col-views">${post.views || 0}</td>
        `;
        
        tr.onclick = () => {
            openBoardModal(post);
        };
        
        DOM.communityBoardList.appendChild(tr);
    });
}

export function renderFeedbackBoard() {
    if (!DOM.feedbackBoardList) return;
    DOM.feedbackBoardList.innerHTML = '';
    
    if (!state.feedbackData || state.feedbackData.length === 0) {
        DOM.feedbackBoardList.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:3rem; color:var(--on-surface-variant);">등록된 글이 없습니다. 첫 글을 작성해보세요!</td></tr>';
        return;
    }

    const posts = [...state.feedbackData].sort((a, b) => b.timestamp - a.timestamp);
    
    posts.forEach((post, index) => {
        const dateObj = new Date(post.timestamp);
        const dateStr = `${dateObj.getMonth() + 1}.${dateObj.getDate()}`;
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td class="col-num">${posts.length - index}</td>
            <td class="col-title">${post.title} ${post.comments?.length > 0 ? `<span style="font-size:0.75rem; color:var(--primary); font-weight:800; margin-left:0.3rem;">[${post.comments.length}]</span>` : ''}</td>
            <td class="col-author">${post.author}</td>
            <td class="col-date">${dateStr}</td>
            <td class="col-views">${post.views || 0}</td>
        `;
        
        tr.onclick = () => {
            openBoardModal(post);
        };
        
        DOM.feedbackBoardList.appendChild(tr);
    });
}

export function exportRenderShortcuts() { renderShortcuts(); }

export function setupUIEvents() {
    if (DOM.closeBtn) DOM.closeBtn.addEventListener('click', closeModal);

    if (DOM.itemForm) {
        DOM.itemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('itemId').value;
            const itemData = {
                title: document.getElementById('title').value,
                url: document.getElementById('url').value,
                category: document.getElementById('category').value,
                subCategory: Array.from(DOM.formSubCategoryCheckboxes.querySelectorAll('input[name="subCategory"]:checked')).map(cb => cb.value),
                description: document.getElementById('description').value,
                isPremium: DOM.isPremiumInput ? DOM.isPremiumInput.checked : false
            };
            if (DOM.formType) itemData.type = DOM.formType.value;
            if (id) window.updateItem(parseInt(id), itemData);
            else window.addItem(itemData);
        });
    }

    if (DOM.formCategory) {
        DOM.formCategory.addEventListener('change', updateFormSubCategories);
    }

    // =============================================
    // ⚙️ 통합 관리자 설정 드롭다운 이벤트
    // =============================================
    if (DOM.adminSettingsBtn) {
        DOM.adminSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = DOM.adminSettingsMenu;
            if (!menu) return;
            const isOpen = menu.style.display === 'block';
            menu.style.display = isOpen ? 'none' : 'block';
            DOM.adminSettingsBtn.classList.toggle('active', !isOpen);
        });
    }

    // 메뉴 외부 클릭 시 자동 닫기
    document.addEventListener('click', (e) => {
        const menu = DOM.adminSettingsMenu;
        const btn = DOM.adminSettingsBtn;
        if (menu && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
            menu.style.display = 'none';
            btn.classList.remove('active');
        }
    });

    // 메뉴 항목 1: 카테고리 편집
    if (DOM.menuCategoryBtn) {
        DOM.menuCategoryBtn.addEventListener('click', () => {
            if (DOM.adminSettingsMenu) DOM.adminSettingsMenu.style.display = 'none';
            if (DOM.adminSettingsBtn) DOM.adminSettingsBtn.classList.remove('active');
            renderCategoryManager();
            DOM.categoryModal.classList.add('active');
        });
    }

    // 메뉴 항목 2: 사이트 추가
    if (DOM.menuAddSiteBtn) {
        DOM.menuAddSiteBtn.addEventListener('click', () => {
            if (DOM.adminSettingsMenu) DOM.adminSettingsMenu.style.display = 'none';
            if (DOM.adminSettingsBtn) DOM.adminSettingsBtn.classList.remove('active');
            DOM.itemForm.reset();
            document.getElementById('itemId').value = '';
            if (state.categories.length > 0) DOM.formCategory.value = state.categories[0].id;
            updateFormSubCategories();
            DOM.modalTitle.textContent = '새 항목 추가';
            DOM.modal.classList.add('active');
        });
    }

    // 메뉴 항목 3: 큐레이션 편집 (큐레이션 탭으로 이동)
    if (DOM.menuCurationBtn) {
        DOM.menuCurationBtn.addEventListener('click', () => {
            if (DOM.adminSettingsMenu) DOM.adminSettingsMenu.style.display = 'none';
            if (DOM.adminSettingsBtn) DOM.adminSettingsBtn.classList.remove('active');
            switchView('curations', '관리자 큐레이션');
            // 추청 큐레이션 탭 자동 선택
            const recTab = document.querySelector('.curation-tab-btn[data-curation-tab="recommended"]');
            if (recTab) recTab.click();
        });
    }

    if (DOM.closeCategoryModal) DOM.closeCategoryModal.addEventListener('click', () => closeAllModals());

    if (DOM.addCategorySubmitBtn) {
        DOM.addCategorySubmitBtn.addEventListener('click', async () => {
            const id = DOM.newCatId.value.trim();
            const name = DOM.newCatName.value.trim();
            if (!id || !name) return alert('ID와 이름을 입력하세요.');
            if (state.categories.find(c => c.id === id)) return alert('이미 존재하는 ID입니다.');
            state.categories.push({ id, name, subCategories: [] });
            DOM.newCatId.value = ''; DOM.newCatName.value = '';
            await syncData(); 
            renderCategoryManager(); renderCategoryFilters(); renderFormCategories();
        });
    }

    [DOM.modal, DOM.categoryModal, DOM.authModal, DOM.newsModal, DOM.newsReadModal, DOM.boardModal, DOM.boardReadModal, DOM.shortcutModal, DOM.termsModal, DOM.privacyModal, DOM.confirmModal].forEach(m => {
        if(m) m.addEventListener('click', (e) => { if (e.target === m) closeAllModals(); });
    });

    if (DOM.termsLink) DOM.termsLink.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); DOM.termsModal.classList.add('active'); });
    if (DOM.privacyLink) DOM.privacyLink.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); DOM.privacyModal.classList.add('active'); });
    if (DOM.closeTermsModal) DOM.closeTermsModal.addEventListener('click', () => closeAllModals());
    if (DOM.closePrivacyModal) DOM.closePrivacyModal.addEventListener('click', () => closeAllModals());

    if (DOM.topMenuItems) {
        DOM.topMenuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                switchView(item.getAttribute('data-view'), item.textContent.trim());
            });
        });
    }

    if (DOM.sidebarNavItems) {
        DOM.sidebarNavItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                switchView(item.getAttribute('data-view'), item.textContent.trim());
                if (window.innerWidth <= 1024 && DOM.sidebar && DOM.sidebarOverlay) {
                    DOM.sidebar.classList.remove('active');
                    DOM.sidebarOverlay.classList.remove('active');
                }
            });
        });
    }

    // Metadata Fetching
    let isFetchingMeta = false;
    let lastFetchedUrl = '';
    if (DOM.urlInput) {
        DOM.urlInput.addEventListener('blur', async () => {
            const url = DOM.urlInput.value.trim();
            if (!url || !url.startsWith('http')) return;
            if (url === lastFetchedUrl) return;
            if (isFetchingMeta) return;
            if (DOM.titleInput.value && DOM.descInput.value) return;

            isFetchingMeta = true;
            lastFetchedUrl = url;

            try {
                const label = DOM.urlInput.previousElementSibling;
                const originalText = label ? label.innerHTML : "URL";
                if (label) {
                    label.innerHTML = `URL <span style="font-size:0.75rem; color:var(--primary); margin-left:0.5rem;"><i class="fa-solid fa-spinner fa-spin"></i> 정보를 가져오는 중...</span>`;
                }
                
                const meta = await fetchMeta(url);
                if (meta.title && !DOM.titleInput.value) DOM.titleInput.value = meta.title;
                if (meta.description && !DOM.descInput.value) DOM.descInput.value = meta.description;
                
                if (label) label.innerHTML = originalText;
            } catch (e) {
                console.error("Metadata fetch error:", e);
                const label = DOM.urlInput.previousElementSibling;
                if (label) {
                    label.innerHTML = `URL <span style="font-size:0.75rem; color:#D32F2F; margin-left:0.5rem;">가져오기 실패</span>`;
                    setTimeout(() => { label.innerHTML = "URL"; }, 2000);
                }
            } finally {
                isFetchingMeta = false;
            }
        });
    }

    if (DOM.typeButtons) {
        DOM.typeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                state.currentType = btn.dataset.filter;
                DOM.typeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderCards();
                // Update sliding indicator for the type buttons list
                const typeContainer = document.querySelector('.sidebar-type-list');
                if (typeContainer) updateSlidingIndicator(typeContainer);
            });
        });
        
        // Initial setup for type indicator
        setTimeout(() => {
            const typeContainer = document.querySelector('.sidebar-type-list');
            if (typeContainer) updateSlidingIndicator(typeContainer);
        }, 300);
    }

    if (DOM.addNewsBtn) {
        DOM.addNewsBtn.addEventListener('click', () => {
            if (DOM.newsIdInput) DOM.newsIdInput.value = '';
            if (DOM.newsModalTitle) DOM.newsModalTitle.textContent = '뉴스 작성';
            if (document.getElementById('newsTitle')) document.getElementById('newsTitle').value = '';
            if (editors.quill) editors.quill.setContents([]); 
            if (DOM.newsModal) DOM.newsModal.classList.add('active');
        });
    }

    if (DOM.closeNewsModal) DOM.closeNewsModal.addEventListener('click', () => closeAllModals());
    if (DOM.cancelNewsBtn) DOM.cancelNewsBtn.addEventListener('click', () => closeAllModals());
    if (DOM.closeNewsReadModal) DOM.closeNewsReadModal.addEventListener('click', () => closeAllModals());

    if (DOM.newsForm) {
        DOM.newsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = DOM.newsIdInput ? DOM.newsIdInput.value : '';
            const content = editors.quill ? editors.quill.root.innerHTML : '';
            const newsTitleEl = document.getElementById('newsTitle');
            const title = newsTitleEl ? newsTitleEl.value.trim() : '';

            if (id) {
                const idx = state.newsData.findIndex(n => n.id === parseInt(id));
                if (idx !== -1) {
                    state.newsData[idx] = { ...state.newsData[idx], title, content, timestamp: Date.now() };
                }
            } else {
                state.newsData.push({ id: Date.now(), title, content, timestamp: Date.now() });
            }
            await syncData();
            renderNews();
            closeAllModals();
        });
    }

    if (DOM.mobileMenuBtn && DOM.sidebar && DOM.sidebarOverlay) {
        const toggleSidebar = () => {
            DOM.sidebar.classList.toggle('active');
            DOM.sidebarOverlay.classList.toggle('active');
        };
        DOM.mobileMenuBtn.addEventListener('click', toggleSidebar);
        DOM.sidebarOverlay.addEventListener('click', toggleSidebar);

        if (DOM.catContainer) {
            DOM.catContainer.addEventListener('click', (e) => {
                if (window.innerWidth <= 1024 && e.target.closest('.filter-btn')) toggleSidebar();
            });
        }
    }

    if (DOM.addShortcutBtn) {
        DOM.addShortcutBtn.addEventListener('click', () => {
            if (DOM.shortcutForm) DOM.shortcutForm.reset();
            if (document.getElementById('shortcutId')) document.getElementById('shortcutId').value = '';
            if (DOM.shortcutModalTitle) DOM.shortcutModalTitle.textContent = '바로가기 추가';
            if (DOM.shortcutModal) DOM.shortcutModal.classList.add('active');
        });
    }
    if (DOM.closeShortcutModal) DOM.closeShortcutModal.addEventListener('click', () => closeAllModals());

    if (DOM.shortcutForm) {
        DOM.shortcutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('shortcutId').value;
            const title = document.getElementById('shortcutTitle').value.trim();
            const url = document.getElementById('shortcutUrl').value.trim();

            if (id) {
                const idx = state.shortcuts.findIndex(s => s.id === parseInt(id));
                if (idx !== -1) state.shortcuts[idx] = { ...state.shortcuts[idx], title, url };
            } else {
                state.shortcuts.push({ id: Date.now(), title, url });
            }
            await syncData();
            renderShortcuts();
            closeAllModals();
        });
    }

    if (DOM.addBoardBtn) {
        DOM.addBoardBtn.addEventListener('click', () => {
            state.currentBoardType = 'board';
            if (DOM.boardIdInput) DOM.boardIdInput.value = '';
            if (DOM.boardModalTitle) DOM.boardModalTitle.textContent = '인사이트 작성';
            if (document.getElementById('boardTitle')) document.getElementById('boardTitle').value = '';
            if (DOM.boardAnonFields) {
                DOM.boardAnonFields.style.display = 'flex';
                if (DOM.boardNicknameInput) DOM.boardNicknameInput.value = state.currentUser ? state.currentUser.username : '';
                if (DOM.boardEmailInput) DOM.boardEmailInput.value = '';
            }
            if (editors.boardQuill) editors.boardQuill.setContents([]);
            if (DOM.boardModal) DOM.boardModal.classList.add('active');
        });
    }

    if (DOM.writePostBtn) {
        DOM.writePostBtn.addEventListener('click', () => {
            state.currentBoardType = 'community';
            if (DOM.boardIdInput) DOM.boardIdInput.value = '';
            if (DOM.boardModalTitle) DOM.boardModalTitle.textContent = '자유 게시글 작성';
            if (document.getElementById('boardTitle')) document.getElementById('boardTitle').value = '';
            if (DOM.boardAnonFields) {
                DOM.boardAnonFields.style.display = 'flex';
                if (DOM.boardNicknameInput) DOM.boardNicknameInput.value = state.currentUser ? state.currentUser.username : '';
                if (DOM.boardEmailInput) DOM.boardEmailInput.value = '';
            }
            if (editors.boardQuill) editors.boardQuill.setContents([]);
            if (DOM.boardModal) DOM.boardModal.classList.add('active');
        });
    }

    if (DOM.writeFeedbackBtn) {
        DOM.writeFeedbackBtn.addEventListener('click', () => {
            state.currentBoardType = 'feedback';
            if (DOM.boardIdInput) DOM.boardIdInput.value = '';
            if (DOM.boardModalTitle) DOM.boardModalTitle.textContent = '건의&추천 작성';
            if (document.getElementById('boardTitle')) document.getElementById('boardTitle').value = '';
            if (DOM.boardAnonFields) {
                DOM.boardAnonFields.style.display = 'flex';
                if (DOM.boardNicknameInput) DOM.boardNicknameInput.value = state.currentUser ? state.currentUser.username : '';
                if (DOM.boardEmailInput) DOM.boardEmailInput.value = '';
            }
            if (editors.boardQuill) editors.boardQuill.setContents([]);
            if (DOM.boardModal) DOM.boardModal.classList.add('active');
        });
    }

    if (DOM.confirmOkBtn) {
        DOM.confirmOkBtn.addEventListener('click', async () => {
            if (currentConfirmCallback) await currentConfirmCallback();
            closeAllModals();
        });
    }
    if (DOM.confirmCancelBtn) DOM.confirmCancelBtn.addEventListener('click', () => closeAllModals());
    if (DOM.closeBoardModal) DOM.closeBoardModal.addEventListener('click', () => closeAllModals());
    if (DOM.closeBoardReadModal) DOM.closeBoardReadModal.addEventListener('click', () => closeAllModals());

    if (DOM.boardForm) {
        DOM.boardForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = DOM.boardIdInput ? DOM.boardIdInput.value : '';
            const content = editors.boardQuill ? editors.boardQuill.root.innerHTML : '';
            const boardTitleEl = document.getElementById('boardTitle');
            const title = boardTitleEl ? boardTitleEl.value.trim() : '';
            
            let targetData = state.boardData;
            if (state.currentBoardType === 'community') targetData = state.communityData;
            else if (state.currentBoardType === 'feedback') targetData = state.feedbackData;

            if (id) {
                const idx = targetData.findIndex(b => b.id === parseInt(id));
                if (idx !== -1) {
                    targetData[idx] = { ...targetData[idx], title, content, timestamp: Date.now() };
                }
            } else {
                const author = DOM.boardNicknameInput.value.trim() || '익명';
                const email = DOM.boardEmailInput.value.trim();
                targetData.push({
                    id: Date.now(), title, content, author, email,
                    timestamp: Date.now(), views: 0, comments: []
                });
            }
            
            await syncData();
            if (state.currentBoardType === 'community') renderCommunityBoard();
            else if (state.currentBoardType === 'feedback') renderFeedbackBoard();
            else renderBoard();
            closeAllModals();
        });
    }

    // Comment submission in board modal
    if (DOM.submitCommentBtn) {
        DOM.submitCommentBtn.onclick = async () => {
            const author = DOM.commentAuthor.value.trim() || '익명';
            const content = DOM.commentContent.value.trim();
            if (!content) return alert('댓글 내용을 입력하세요.');

            const params = new URLSearchParams(window.location.search);
            const id = parseInt(params.get('id'));
            const post = [...state.boardData, ...state.communityData, ...state.feedbackData].find(p => p.id === id);

            if (post) {
                if (!post.comments) post.comments = [];
                post.comments.push({ author, content, timestamp: Date.now() });
                DOM.commentContent.value = '';
                renderComments(post);
                await syncData();
            }
        };
    }

    // Bind Curation Events
    setupCurationEvents();
}

export function switchView(view, title) {
    const sections = {
        'guide': DOM.guideSection,
        'bookmarks': DOM.bookmarksSection,
        'shortcuts': DOM.shortcutsSection,
        'board': DOM.boardSection,
        'community-board': DOM.communityBoardSection,
        'feedback-board': DOM.feedbackBoardSection,
        'news': DOM.newsFeedSection,
        'curations': DOM.curationSection
    };

    Object.values(sections).forEach(section => {
        if (section) section.style.display = 'none';
    });

    if (DOM.curationDetailSection) {
        DOM.curationDetailSection.style.display = 'none';
    }

    const targetSection = sections[view] || sections['bookmarks'];
    if (targetSection) targetSection.style.display = 'block';

    const actualView = sections[view] ? view : 'bookmarks';

    if (DOM.topMenuItems) {
        DOM.topMenuItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-view') === actualView) {
                item.classList.add('active');
            }
        });
    }

    if (DOM.sidebarNavItems) {
        DOM.sidebarNavItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-view') === actualView) {
                item.classList.add('active');
            }
        });
    }

    if (actualView === 'bookmarks') {
        history.pushState({view: 'bookmarks'}, '', '/');
    } else {
        history.pushState({view: actualView}, '', `/?view=${actualView}`);
    }
    
    // 모바일 카테고리 필터 표시/레이아웃 안정화 보장
    if (actualView === 'bookmarks') {
        const mobileFilter = document.getElementById('main-category-filter-container');
        if (mobileFilter) mobileFilter.style.display = ''; // CSS의 media qeury에 맡김
    }

    // 뷰 전환에 따른 권한별 버튼(추가 버튼 등) 가시성 즉각 반영
    updateAuthUI();
}

// ✅ 실시간 금융 지표 위젯 렌더링 함수
export async function renderTicker() {
    const tickerItemsEl = document.getElementById('ticker-items');
    if (!tickerItemsEl) return;

    try {
        const res = await fetch('/api/ticker');
        const data = await res.json();

        if (!data || Object.keys(data).length === 0) {
            tickerItemsEl.innerHTML = '<div class="ticker-loading"><i class="fa-solid fa-triangle-exclamation"></i> 일시적으로 데이터를 불러올 수 없습니다.</div>';
            return;
        }

        let html = '';
        Object.entries(data).forEach(([key, item]) => {
            const isUp = item.change > 0;
            const isDown = item.change < 0;
            const statusClass = isUp ? 'up' : isDown ? 'down' : 'flat';
            const icon = isUp ? '▲' : isDown ? '▼' : '-';
            const sign = isUp ? '+' : '';
            const priceFormatted = item.price.toLocaleString(undefined, {
                minimumFractionDigits: key === 'BTC_USD' ? 0 : 2,
                maximumFractionDigits: key === 'BTC_USD' ? 0 : 2
            });

            html += `
                <div class="ticker-item ${statusClass}" title="${item.name} (${item.symbol}) - 야후 파이낸스 실시간 시세">
                    <span class="ticker-item-name">${item.name}</span>
                    <span class="ticker-item-price">${priceFormatted}</span>
                    <span class="ticker-item-change">
                        <span>${icon}</span>
                        <span>${sign}${item.changePercent}%</span>
                    </span>
                </div>
            `;
        });

        tickerItemsEl.innerHTML = html;
    } catch (err) {
        console.error('Error rendering ticker:', err);
        tickerItemsEl.innerHTML = '<div class="ticker-loading"><i class="fa-solid fa-triangle-exclamation"></i> 지표 로딩 실패</div>';
    }
}

// ==========================================
// 🧭 PREMIUM CURATION HUB & ROUTINE PLAYER CORE LOGIC (PHASE 2)
// ==========================================

function setupCurationEvents() {
    // 1. 나만의 큐레이션 만들기 버튼 클릭
    if (DOM.startCurationModeBtn) {
        DOM.startCurationModeBtn.onclick = () => {
            if (!state.currentUser) {
                alert('나만의 큐레이션을 만들려면 로그인이 필요합니다.');
                const loginBtn = document.getElementById('loginBtn');
                if (loginBtn) loginBtn.click();
                return;
            }
            editingCurationId = null;
            curationEditType = 'personal';
            selectedCurationItemIds = [];
            toggleCurationSelectionMode(true);
        };
    }

    // 1-b. 관리자: 추천 큐레이션 추가 버튼
    if (DOM.adminAddRecommendedCurationBtn) {
        DOM.adminAddRecommendedCurationBtn.onclick = () => {
            editingCurationId = null;
            curationEditType = 'recommended';
            selectedCurationItemIds = [];
            updateCurationModalUI();
            toggleCurationSelectionMode(true);
        };
    }

    // 2. 큐레이션 모드 패널 [선택 완료 & 저장] 버튼
    if (DOM.curationSaveBtn) {
        DOM.curationSaveBtn.onclick = () => {
            if (selectedCurationItemIds.length === 0) {
                alert('큐레이션에 추가할 즐겨찾기 카드를 최소 1개 이상 선택해 주세요.');
                return;
            }
            updateCurationModalUI();
            openCurationCreateModal();
        };
    }

    // 3. 큐레이션 모드 패널 [취소] 버튼
    if (DOM.curationCancelBtn) {
        DOM.curationCancelBtn.onclick = () => {
            toggleCurationSelectionMode(false);
        };
    }

    // 4. 큐레이션 탭 전환
    const tabBtns = document.querySelectorAll('.curation-tab-btn');
    tabBtns.forEach(btn => {
        btn.onclick = (e) => {
            tabBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            activeCurationTab = btn.getAttribute('data-curation-tab');
            renderCurations();
        };
    });

    // 5. 큐레이션 상세 정보 보기 창에서 [돌아가기] 버튼
    if (DOM.curationDetailBackBtn) {
        DOM.curationDetailBackBtn.onclick = () => {
            if (DOM.curationDetailSection) DOM.curationDetailSection.style.display = 'none';
            if (DOM.curationSection) DOM.curationSection.style.display = 'block';
        };
    }

    // 6. 큐레이션 생성 모달 닫기 및 취소 버튼
    if (DOM.closeCurationCreateModal) {
        DOM.closeCurationCreateModal.onclick = () => closeCurationModal();
    }
    if (DOM.cancelCurationFormBtn) {
        DOM.cancelCurationFormBtn.onclick = () => closeCurationModal();
    }

    // 7. 큐레이션 생성 폼 제출
    if (DOM.curationCreateForm) {
        DOM.curationCreateForm.onsubmit = async (e) => {
            e.preventDefault();
            
            const title = DOM.curationTitleInput.value.trim();
            const desc = DOM.curationDescInput.value.trim();
            const tagsRaw = DOM.curationTagsInput.value.trim();
            
            if (!title || !desc) {
                alert('필수 입력 항목을 채워주세요.');
                return;
            }

            // 쉼표로 분리 및 # 태그 형식 정리
            const tags = tagsRaw
                .split(',')
                .map(t => t.trim())
                .filter(Boolean)
                .map(t => t.startsWith('#') ? t : '#' + t);

            const newCuration = {
                id: Date.now(),
                title,
                description: desc,
                itemIds: [...selectedCurationItemIds],
                tags,
                curationType: 'personal',
                userId: state.currentUser ? state.currentUser.username : 'admin'
            };

            // 상태에 저장
            if (!state.curations) state.curations = [];
            state.curations.push(newCuration);

            try {
                // 백그라운드 동기화 진행
                await syncData();
                alert('나만의 큐레이션이 성공적으로 생성되었습니다!');
            } catch (err) {
                console.error(err);
                alert('큐레이션을 저장하는 데 실패했습니다. 다시 시도해 주세요.');
            }

            closeCurationModal();
            toggleCurationSelectionMode(false);
            
            // 🧭 큐레이션 뷰 전환 및 개인 탭 활성화
            switchView('curations', '🧭 큐레이션');
            const personalTabBtn = document.querySelector('.curation-tab-btn[data-curation-tab="personal"]');
            if (personalTabBtn) {
                personalTabBtn.click();
            } else {
                activeCurationTab = 'personal';
                renderCurations();
            }
        };
    }
}

function openCurationCreateModal(skipClear = false) {
    if (!DOM.curationCreateModal) return;
    DOM.curationCreateModal.style.display = 'flex';
    
    // 선택된 카드 개수 업데이트
    if (DOM.curationSelectedCount) {
        DOM.curationSelectedCount.textContent = selectedCurationItemIds.length;
    }
    
    // 선택된 사이트 목록 미니 그리드 렌더링
    if (DOM.curationSelectedItemsGrid) {
        DOM.curationSelectedItemsGrid.innerHTML = '';
        
        selectedCurationItemIds.forEach(id => {
            const item = state.items.find(i => i.id === id);
            if (!item) return;
            
            let faviconUrl = '';
            try {
                const domain = new URL(item.url).hostname;
                faviconUrl = `/api/favicon?domain=${domain}`;
            } catch (e) {}
            
            const miniCard = document.createElement('div');
            miniCard.className = 'selected-item-mini-card';
            miniCard.style.cssText = `
                display: flex;
                align-items: center;
                gap: 0.5rem;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid var(--border-color);
                padding: 0.35rem 0.65rem;
                border-radius: 6px;
                font-size: 0.8rem;
                color: var(--text-light);
            `;
            
            const iconHtml = faviconUrl ? 
                `<img src="${faviconUrl}" onerror="this.outerHTML='<i class=&quot;fa-solid fa-globe&quot;></i>'" style="width: 14px; height: 14px; object-fit: contain;">` :
                `<i class="fa-solid fa-globe" style="font-size: 0.8rem;"></i>`;
                
            miniCard.innerHTML = `
                ${iconHtml}
                <span style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.title}</span>
            `;
            DOM.curationSelectedItemsGrid.appendChild(miniCard);
        });
    }
    
    // 입력 필드 초기화 (수정 모드일 때는 건너뜀)
    if (!skipClear) {
        if (DOM.curationTitleInput) DOM.curationTitleInput.value = '';
        if (DOM.curationDescInput) DOM.curationDescInput.value = '';
        if (DOM.curationTagsInput) DOM.curationTagsInput.value = '';
    }
}

function closeCurationModal() {
    if (DOM.curationCreateModal) {
        DOM.curationCreateModal.style.display = 'none';
    }
    editingCurationId = null;
}

// 모달 UI 동적 업데이트 (타이틀·버튼 텍스트)
function updateCurationModalUI() {
    const isEdit = editingCurationId !== null;
    const isRecommended = curationEditType === 'recommended';

    if (DOM.curationModalTitle) {
        const icon = '<i class="fa-solid fa-compass" style="color: var(--premium-gold);"></i>';
        if (isRecommended && isEdit) {
            DOM.curationModalTitle.innerHTML = `${icon} 추천 큐레이션 수정`;
        } else if (isRecommended) {
            DOM.curationModalTitle.innerHTML = `${icon} 추천 큐레이션 추가`;
        } else if (isEdit) {
            DOM.curationModalTitle.innerHTML = `${icon} 나의 큐레이션 수정`;
        } else {
            DOM.curationModalTitle.innerHTML = `${icon} 나만의 투자 큐레이션 조립`;
        }
    }

    if (DOM.curationFormSubmitBtn) {
        const icon = '<i class="fa-solid fa-compass"></i> ';
        if (isEdit) {
            DOM.curationFormSubmitBtn.innerHTML = icon + '수정 완료';
        } else if (isRecommended) {
            DOM.curationFormSubmitBtn.innerHTML = icon + '추천 큐레이션 추가';
        } else {
            DOM.curationFormSubmitBtn.innerHTML = icon + '큐레이션 생성';
        }
    }
}

// 큐레이션 수정 글로벌 함수
window.editCuration = function(id) {
    const curation = state.curations.find(c => c.id === id);
    if (!curation) return;

    editingCurationId = id;
    curationEditType = curation.curationType;
    selectedCurationItemIds = [...curation.itemIds];

    updateCurationModalUI();

    // 폼 필드에 기존 데이터 채우기
    if (DOM.curationTitleInput) DOM.curationTitleInput.value = curation.title;
    if (DOM.curationDescInput) DOM.curationDescInput.value = curation.description;
    if (DOM.curationTagsInput) DOM.curationTagsInput.value = curation.tags.map(t => t.replace(/^#/, '')).join(', ');

    openCurationCreateModal(true); // true = 수정 모드 (필드 초기화 스킵)
};

function toggleCurationSelectionMode(active) {
    curationSelectionMode = active;
    
    if (active) {
        selectedCurationItemIds = [];
        if (DOM.curationModePanel) DOM.curationModePanel.style.display = 'block';
        
        // 🧭 즐겨찾기 화면으로 전환해 선택 유도
        switchView('bookmarks', '즐겨찾기');
        
        // 팝업 안내 배너에 애니메이션 효과 추가
        if (DOM.curationModePanel) {
            DOM.curationModePanel.classList.add('premium-slide-in');
        }
    } else {
        selectedCurationItemIds = [];
        if (DOM.curationModePanel) DOM.curationModePanel.style.display = 'none';
    }
    
    // 즐겨찾기 카드 다시 렌더링 (체크박스 표시 및 카드 레이아웃 전환)
    renderCards();
}

window.toggleCurationCardSelection = function(id, el) {
    if (el.checked) {
        if (!selectedCurationItemIds.includes(id)) {
            selectedCurationItemIds.push(id);
        }
    } else {
        selectedCurationItemIds = selectedCurationItemIds.filter(x => x !== id);
    }
    
    // Toggle 'selected' class on the closest article card
    const cardEl = el.closest('.card');
    if (cardEl) {
        if (el.checked) {
            cardEl.classList.add('selected');
        } else {
            cardEl.classList.remove('selected');
        }
    }
};

export function renderCurations() {
    if (!DOM.curationGrid) return;
    DOM.curationGrid.innerHTML = '';
    
    // 현재 탭에 맞는 큐레이션 필터링
    let filtered = [];
    if (activeCurationTab === 'recommended') {
        filtered = state.curations.filter(c => c.curationType === 'recommended');
    } else {
        // 나의 개인 큐레이션
        if (!state.currentUser) {
            DOM.curationGrid.innerHTML = `
                <div class="empty-curations" style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; background: var(--bg-surface); border: 1px dashed var(--border-color); border-radius: 12px; margin-top: 1rem;">
                    <i class="fa-solid fa-lock" style="font-size: 2.5rem; color: var(--premium-gold); margin-bottom: 1rem; opacity: 0.8;"></i>
                    <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-light); margin-bottom: 0.5rem;">로그인이 필요합니다</h3>
                    <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.5rem;">나의 개인 큐레이션과 커스텀 루틴을 관리하려면 로그인을 진행해 주세요.</p>
                    <button class="premium-gold-btn" onclick="const b = document.getElementById('loginBtn'); if(b) b.click();" style="margin: 0 auto; display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.2rem; font-size: 0.85rem; font-weight: 700;">
                        로그인하러 가기 <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            `;
            return;
        }
        
        filtered = state.curations.filter(c => c.curationType === 'personal' && c.userId === state.currentUser.username);
    }
    
    if (filtered.length === 0) {
        if (activeCurationTab === 'recommended') {
            DOM.curationGrid.innerHTML = `
                <div class="empty-curations" style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; background: var(--bg-surface); border: 1px dashed var(--border-color); border-radius: 12px; margin-top: 1rem; color: var(--text-muted);">
                    <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p style="font-size: 0.95rem;">제공되는 추천 큐레이션 데이터가 없습니다.</p>
                </div>
            `;
        } else {
            DOM.curationGrid.innerHTML = `
                <div class="empty-curations" style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; background: var(--bg-surface); border: 1px dashed var(--border-color); border-radius: 12px; margin-top: 1rem;">
                    <i class="fa-solid fa-folder-plus" style="font-size: 2.5rem; color: var(--premium-gold); margin-bottom: 1rem; opacity: 0.8;"></i>
                    <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-light); margin-bottom: 0.5rem;">첫 번째 큐레이션을 만들어 보세요!</h3>
                    <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.5rem;">자신만의 투자 습관을 루틴으로 정의하고 한 번에 실행해 보세요.</p>
                    <button class="premium-gold-btn" onclick="document.getElementById('startCurationModeBtn').click();" style="margin: 0 auto; display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.2rem; font-size: 0.85rem; font-weight: 700;">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> 나만의 큐레이션 만들기
                    </button>
                </div>
            `;
        }
        return;
    }
    
    filtered.forEach((c, idx) => {
        const card = document.createElement('article');
        card.className = 'curation-card';
        card.style.animationDelay = `${Math.min(idx * 0.05, 0.3)}s`;
        
        // 컨텍스트 저장 위해 card.onclick은 innerHTML 설정 후 다시
        const collageHtml = generateCurationCollage(c.itemIds);
        const tagsHtml = c.tags.map(t => `<span class="curation-card-tag">${t}</span>`).join('');
        
        const isAdmin = state.currentUser && state.currentUser.role === 'admin';
        const isOwner = c.curationType === 'personal' && state.currentUser && c.userId === state.currentUser.username;
        const canManage = isAdmin || isOwner;

        let actionBtnsHtml = '';
        if (canManage) {
            actionBtnsHtml = `
                <div class="curation-card-admin-btns" onclick="event.stopPropagation();">
                    <button class="curation-admin-btn edit-btn" onclick="event.stopPropagation(); window.editCuration(${c.id});" title="수정">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="curation-admin-btn delete-btn" onclick="event.stopPropagation(); window.deleteCuration(${c.id});" title="삭제">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
        }
        
        card.innerHTML = `
            ${actionBtnsHtml}
            ${collageHtml}
            <div class="curation-card-content">
                <div class="curation-card-badge ${c.curationType}">
                    ${c.curationType === 'recommended' ? '추천 루틴' : '개인 루틴'}
                </div>
                <h3 class="curation-card-title">${c.title}</h3>
                <p class="curation-card-desc">${c.description}</p>
                <div class="curation-card-footer">
                    <div class="curation-card-tags">
                        ${tagsHtml}
                    </div>
                    <div class="curation-card-count">
                        <i class="fa-solid fa-list-check"></i> ${c.itemIds.length}개 사이트
                    </div>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => showCurationDetails(c));
        DOM.curationGrid.appendChild(card);
    });
}

function generateCurationCollage(itemIds) {
    let html = '<div class="curation-favicon-stack">';
    
    // Resolve items
    const resolvedItems = itemIds
        .map(id => state.items.find(i => i.id === id))
        .filter(Boolean);
        
    // We want exactly 4 elements. If we have resolvedItems, use their favicons.
    // If not, pad with placeholder links or letter avatars.
    for (let i = 0; i < 4; i++) {
        const item = resolvedItems[i];
        if (item) {
            let faviconUrl = '';
            try {
                const domain = new URL(item.url).hostname;
                faviconUrl = `/api/favicon?domain=${domain}`;
            } catch (e) {}
            
            const iconHtml = faviconUrl ? 
                `<img src="${faviconUrl}" onerror="this.outerHTML='<i class=&quot;fa-solid fa-globe&quot; style=&quot;color: var(--premium-gold);&quot;></i>'" style="width: 20px; height: 20px; border-radius: 4px; object-fit: contain;">` :
                `<i class="fa-solid fa-globe" style="color: var(--premium-gold);"></i>`;

            html += `
                <div class="curation-stacked-icon" title="${item.title.replace(/"/g, '&quot;')}">
                    ${iconHtml}
                </div>
            `;
        } else {
            // Placeholder
            html += `
                <div class="curation-stacked-icon placeholder-icon">
                    <i class="fa-solid fa-link" style="color: var(--premium-gold); opacity: 0.35;"></i>
                </div>
            `;
        }
    }
    
    html += '</div>';
    return html;
}

function showCurationDetails(curation) {
    if (!DOM.curationSection || !DOM.curationDetailSection) return;
    
    DOM.curationSection.style.display = 'none';
    DOM.curationDetailSection.style.display = 'block';
    
    // 상세 페이지 스크롤 맨 위로 이동
    DOM.curationDetailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // 메타데이터 바인딩
    if (DOM.curationDetailBadge) {
        DOM.curationDetailBadge.className = 'curation-badge ' + curation.curationType;
        DOM.curationDetailBadge.textContent = curation.curationType === 'recommended' ? 'RECOMMENDED' : 'MY ROUTINE';
        // 개인화된 배지 컬러 설정
        if (curation.curationType === 'personal') {
            DOM.curationDetailBadge.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
            DOM.curationDetailBadge.style.color = '#fff';
        } else {
            DOM.curationDetailBadge.style.background = 'var(--premium-gold)';
            DOM.curationDetailBadge.style.color = '#000';
        }
    }
    
    if (DOM.curationDetailTitle) DOM.curationDetailTitle.textContent = curation.title;
    if (DOM.curationDetailDesc) DOM.curationDetailDesc.textContent = curation.description;
    
    if (DOM.curationDetailTags) {
        DOM.curationDetailTags.innerHTML = curation.tags.map(t => `<span class="curation-detail-tag" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-muted); padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.8rem; margin-right: 0.5rem; margin-bottom: 0.5rem; display: inline-block;">${t}</span>`).join('');
    }
    
    // 루틴 일괄 실행 버튼 바인딩
    if (DOM.curationOpenAllBtn) {
        DOM.curationOpenAllBtn.onclick = () => openAllRoutineUrls(curation.itemIds);
    }
    
    // 세부 사이트 덱 렌더링
    if (DOM.curationDetailDeck) {
        DOM.curationDetailDeck.innerHTML = '';
        
        const resolvedItems = curation.itemIds
            .map(id => state.items.find(i => i.id === id))
            .filter(Boolean);
            
        if (resolvedItems.length === 0) {
            DOM.curationDetailDeck.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.5rem; margin-bottom: 0.5rem;"></i>
                    <p>포함된 즐겨찾기 사이트가 삭제되었거나 찾을 수 없습니다.</p>
                </div>
            `;
            return;
        }
        
        resolvedItems.forEach((item, idx) => {
            const info = getCurationSiteEditorialInfo(item);
            
            let faviconUrl = '';
            try {
                const domain = new URL(item.url).hostname;
                faviconUrl = `/api/favicon?domain=${domain}`;
            } catch (e) {}
            
            const difficultyStars = Array.from({length: 5}, (_, i) => 
                i < info.difficulty 
                    ? '<i class="fa-solid fa-star gold" style="color: var(--premium-gold); margin-right: 2px;"></i>' 
                    : '<i class="fa-regular fa-star" style="color: var(--border-color); margin-right: 2px;"></i>'
            ).join('');
            
            const utilityStars = Array.from({length: 5}, (_, i) => 
                i < info.utility 
                    ? '<i class="fa-solid fa-star gold" style="color: var(--premium-gold); margin-right: 2px;"></i>' 
                    : '<i class="fa-regular fa-star" style="color: var(--border-color); margin-right: 2px;"></i>'
            ).join('');
            
            const detailCard = document.createElement('div');
            detailCard.className = 'curation-detail-card';
            detailCard.style.animationDelay = `${Math.min(idx * 0.05, 0.3)}s`;
            
            const iconHtml = faviconUrl ? 
                `<img src="${faviconUrl}" onerror="this.outerHTML='<i class=&quot;fa-solid fa-globe&quot; style=&quot;color: var(--premium-gold);&quot;></i>'" style="width: 24px; height: 24px; border-radius: 4px; object-fit: contain;">` :
                `<i class="fa-solid fa-globe" style="font-size: 1.25rem; color: var(--premium-gold);"></i>`;
                
            let extraEditorialHtml = '';
            if (curation.curationType === 'recommended') {
                extraEditorialHtml = `
                    <div class="curation-detail-reason-box">
                        <div class="curation-reason-header"><i class="fa-solid fa-lightbulb"></i> 분석 이유</div>
                        <div class="curation-reason-content">${info.reason}</div>
                    </div>
                    
                    <div class="curation-tip-item">
                        <div style="font-weight: 800; color: var(--premium-gold); margin-bottom: 0.25rem;"><i class="fa-solid fa-user-tie"></i> 활용 팁</div>
                        <div>${info.tips}</div>
                    </div>
                `;
            }

            let metricsHtml = '';
            if (curation.curationType === 'recommended') {
                metricsHtml = `
                    <div class="curation-metrics">
                        <div class="curation-metric-item">
                            <span>난이도</span>
                            <div class="curation-metric-stars">${difficultyStars}</div>
                        </div>
                        <div class="curation-metric-item">
                            <span>활용도</span>
                            <div class="curation-metric-stars">${utilityStars}</div>
                        </div>
                    </div>
                `;
            }

            detailCard.innerHTML = `
                <div class="curation-detail-card-header">
                    <div class="curation-detail-favicon">
                        ${iconHtml}
                    </div>
                    <h4 class="curation-detail-card-title">${item.title}</h4>
                </div>
                <div class="curation-detail-card-body">
                    <p class="curation-detail-card-desc">${item.description || '지정된 설명이 없습니다.'}</p>
                    ${extraEditorialHtml}
                </div>
                <div class="curation-detail-card-footer">
                    ${metricsHtml}
                    <a href="${item.url}" target="_blank" class="curation-detail-visit-btn">
                        사이트 이동 <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.75rem;"></i>
                    </a>
                </div>
            `;
            
            DOM.curationDetailDeck.appendChild(detailCard);
        });
    }
}

function openAllRoutineUrls(itemIds) {
    const resolvedItems = itemIds
        .map(id => state.items.find(i => i.id === id))
        .filter(Boolean);
        
    if (resolvedItems.length === 0) {
        alert('이 큐레이션에 포함된 사이트가 없습니다.');
        return;
    }
    
    let blockedCount = 0;
    const openedWindows = [];
    
    resolvedItems.forEach((item) => {
        try {
            const win = window.open(item.url, '_blank');
            if (win) {
                openedWindows.push(win);
            } else {
                blockedCount++;
            }
        } catch (e) {
            console.error(e);
            blockedCount++;
        }
    });
    
    if (blockedCount > 0) {
        alert(`일부 사이트가 팝업 차단으로 인해 열리지 않았습니다.\n\nMoneyLink의 원클릭 동시 접속 루틴 플레이 기능을 100% 원활하게 사용하시려면, 브라우저 주소 표시줄의 [팝업 차단 항상 허용] 옵션을 꼭 설정해 주세요!`);
    }
}

function getCurationSiteEditorialInfo(item) {
    const title = item.title.toLowerCase();
    const url = item.url.toLowerCase();
    
    // DART 전자공시
    if (title.includes('dart') || title.includes('전자공시') || url.includes('dart.fss.or.kr')) {
        return {
            difficulty: 5,
            utility: 5,
            reason: "국내 모든 상장법인의 정기 보고서, 주요 경영 공시 및 주주 지분 변동 내역을 실시간으로 확인하는 대한민국 투자 정보의 핵심 시발점입니다.",
            tips: "정기보고서 제출 마감일 직후 5영업일 이내에 공시되는 임원·주요주주의 특정증권 소유상황 보고서를 면밀히 대조하여 대주주의 지분 매입 흐름을 선제 포착하십시오."
        };
    }
    // FnGuide / 에프앤가이드
    if (title.includes('fnguide') || title.includes('에프앤가이드') || url.includes('fnguide')) {
        return {
            difficulty: 3,
            utility: 4,
            reason: "국내 대표 금융정보 플랫폼으로서 개별 기업의 밸류에이션 지표, 재무제표 5개년 요약, 컨센서스(시장 전망치) 추이를 한눈에 직관적으로 비교할 수 있습니다.",
            tips: "컨센서스 변화 추이 메뉴에서 최근 4주간 기관 목표주가 괴리율 및 하향 조정 강도를 추적하여, 악재 소멸 구간의 역발상 매수 타이밍을 도출하는 데 유용합니다."
        };
    }
    // 삼프로TV
    if (title.includes('삼프로') || title.includes('3pro') || url.includes('3pro') || url.includes('youtube.com/c/삼프로tv')) {
        return {
            difficulty: 2,
            utility: 4,
            reason: "국내외 최고의 매크로 전문가, 애널리스트 및 업계 실무 리더들이 매일 실시간으로 시장 트렌드와 산업 보고서 핵심 논리를 짚어주는 금융 전문 미디어입니다.",
            tips: "단순히 추천 종목에 주목하기보다 매크로 연사들이 제시하는 시장의 유동성 변화, 국채 금리 및 통화 정책 시나리오별 업종 선호 분석 논리를 메모하며 시청하십시오."
        };
    }
    // Investing.com / 인베스팅
    if (title.includes('investing') || title.includes('인베스팅') || url.includes('investing')) {
        return {
            difficulty: 2,
            utility: 5,
            reason: "글로벌 매크로 리서치의 필수 도구로서 미국/유럽/아시아 증시 지수 선물, 원자재(유가/금), 환율 및 전 세계 거시 경제 캘린더를 실시간으로 모니터링할 수 있습니다.",
            tips: "경제 지표 달력 메뉴에서 예측치와 실제치 괴리율(Surprise/Shock)을 확인하고, 실시간 환율 및 미 10년물 국채 금리의 단기 등락 속도를 결합해 매크로 변동성에 대응하십시오."
        };
    }
    // 한경 컨센서스
    if (title.includes('한경') || title.includes('consensus') || url.includes('hankyung') || title.includes('증권사 보고서')) {
        return {
            difficulty: 4,
            utility: 5,
            reason: "국내 대형 증권사 리서치 센터의 기업 분석 보고서와 산업 보고서 PDF 원문을 로그인 없이 무료로 열람할 수 있는 정보 허브입니다.",
            tips: "목표주가 변경 추이를 보기 위해 단순 리포트 수보다 개별 기업의 신규 리포트 발간 빈도가 증가하는 국면(소외주 관심 집중 시작 단계)을 파악하는 리스트로 활용하세요."
        };
    }
    // FRED (미국 연준 거시 경제 데이터)
    if (title.includes('fred') || url.includes('stlouisfed.org')) {
        return {
            difficulty: 4,
            utility: 5,
            reason: "세인트루이스 연방준비은행이 제공하는 전 세계 수십만 개의 장기 경제 시계열 데이터(미국 실업률, 장단기 금리차, M2 통화량 등)의 종착지입니다.",
            tips: "10-Year Treasury Constant Maturity Minus 2-Year Treasury Constant Maturity (T10Y2Y) 장단기 금리차 시계열을 주기적으로 플로팅하여 장기 경기 침체 징후를 감지하세요."
        };
    }
    // KIND (한국거래소 기업공시채널)
    if (title.includes('kind') || url.includes('kind.krx.co.kr')) {
        return {
            difficulty: 4,
            utility: 4,
            reason: "한국거래소 공식 공시 플랫폼으로, 상장법인의 기업설명회(IR) 일정, 자사주 매입/소각 계획, 신규 상장 공모 정보 등을 일목요연하게 파악할 수 있는 포털입니다.",
            tips: "오늘의 공시 캘린더 및 IR 개최 일정표를 확인하여 보유 종목의 주주 IR 일정을 캘린더에 사전 등록하고, 주주 환원 공시의 발표 시차를 확인하십시오."
        };
    }
    // Yahoo Finance / 야후 파이낸스
    if (title.includes('yahoo') || url.includes('finance.yahoo')) {
        return {
            difficulty: 3,
            utility: 5,
            reason: "글로벌 개별 주식의 주가 차트, 재무 요약(Income Statement), EPS 어닝 기록 및 실시간 해외 금융 뉴스를 완벽하게 수렴해 보여주는 글로벌 1위 금융 정보 채널입니다.",
            tips: "Historical Data 탭에서 과거 5년간의 일일 종가 및 배당락 내역을 CSV 파일로 직접 다운로드받아 자신만의 자산 배분 백테스트 기초 자료로 가공해 활용해 보십시오."
        };
    }

    // Generic fallbacks based on site properties
    const isPremium = item.isPremium;
    const isYoutube = item.type === 'youtube';
    return {
        difficulty: isPremium ? 4 : 3,
        utility: isPremium ? 5 : 4,
        reason: `'${item.title}'은(는) 투자 연구를 위해 선별된 핵심 금융 정보 리소스입니다. 신속하고 신뢰할 수 있는 투자 데이터를 바탕으로 의사결정을 내릴 수 있도록 설계되었습니다.`,
        tips: isYoutube ? 
            "유튜브 콘텐츠 시청 시, 자극적인 썸네일에 휘둘리지 말고 핵심 수치 증빙과 과거 예측 일치율을 메모하며 교차 검증하는 투자 습관을 들이십시오." :
            "웹사이트 분석 시, 모바일/PC 즐겨찾기를 MoneyLink의 큐레이션 통합 뷰어와 연동하여 하루 1회 고정된 시간에 루틴 형태로 신속히 순회하는 방식을 추천합니다."
    };
}

window.deleteCuration = async function(id) {
    const curation = state.curations.find(c => c.id === id);
    if (!curation) return;

    const typeName = curation.curationType === 'recommended' ? '추천 큐레이션' : '개인 큐레이션';
    if (!confirm(`이 ${typeName} 루틴을 삭제하시겠습니까?\n\n"${curation.title}"\n\n삭제 후 복구할 수 없습니다.`)) return;
    
    state.curations = state.curations.filter(c => c.id !== id);
    renderCurations();
    await syncData();
};
