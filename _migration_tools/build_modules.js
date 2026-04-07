const fs = require('fs');

const original = fs.readFileSync('script.js', 'utf8');
const lines = original.split('\n');

// Helper to extract lines
function getLines(start, end) {
    if(end < start) return '';
    return lines.slice(start - 1, end).join('\n');
}

// Global state variables to replace
const stateVars = ['items', 'categories', 'usersDB', 'newsData', 'boardData', 'shortcuts', 'currentUser', 'isLoginMode', 'currentCategory', 'currentSubCategory', 'currentType', 'currentSearchQuery'];

// Global DOM elements to replace (optional, better to just keep them scoped or re-select them).
// Since we are splitting the DOM element selections across files, we'll put all element selections in a dom.js file and import them.

// Let's create the components:
const stateContent = `
export const state = {
    items: [],
    categories: [],
    usersDB: [],
    newsData: [],
    boardData: [],
    shortcuts: [],
    currentUser: null,
    isLoginMode: true,
    currentCategory: 'all',
    currentSubCategory: ['all'],
    currentType: 'all',
    currentSearchQuery: ''
};

export const editors = {
    quill: null,
    boardQuill: null
};

export const defaultCategories = [
    { id: 'stock', name: '주식', subCategories: [{id: 'general', name: '종합'}, {id: 'tech', name: '기술적분석'}, {id: 'fundamental', name: '기본적분석'}] },
    { id: 'coin', name: '코인', subCategories: [{id: 'exchange', name: '거래소'}, {id: 'market', name: '시황/정보'}] },
    { id: 'bond', name: '채권', subCategories: [{id: 'data', name: '금리/데이터'}, {id: 'news', name: '시황/정보'}] },
    { id: 'insurance', name: '보험', subCategories: [{id: 'compare', name: '비교/공시'}] },
    { id: 'finance', name: '금융', subCategories: [{id: 'macro', name: '거시경제'}, {id: 'media', name: '종합미디어'}] }
];
`;

const domContent = `
// DOM Elements exported as getters to ensure they are always fresh and available after deferred load
export const DOM = {
    get grid() { return document.getElementById('cardGrid'); },
    get catContainer() { return document.getElementById('category-filter-container'); },
    get subCatContainer() { return document.getElementById('subcategory-filter-container'); },
    get loginBtnTrigger() { return document.getElementById('loginBtnTrigger'); },
    get logoutBtn() { return document.getElementById('logoutBtn'); },
    get userNameDisplay() { return document.getElementById('userNameDisplay'); },
    get userProfile() { return document.getElementById('userProfile'); },
    get addBtn() { return document.getElementById('addBtn'); },
    get manageCategoryBtn() { return document.getElementById('manageCategoryBtn'); },
    get authContainerHeader() { return document.getElementById('authContainerHeader'); },
    get authContainerSidebar() { return document.getElementById('authContainerSidebar'); },
    get currentCategoryTitle() { return document.getElementById('currentCategoryTitle'); },
    get itemsCountEl() { return document.getElementById('itemsCount'); },
    get authModal() { return document.getElementById('authModal'); },
    get closeAuthModal() { return document.getElementById('closeAuthModal'); },
    get authForm() { return document.getElementById('authForm'); },
    get authModalTitle() { return document.getElementById('authModalTitle'); },
    get authModeToggleBtn() { return document.getElementById('authModeToggleBtn'); },
    get authSubmitBtn() { return document.getElementById('authSubmitBtn'); },
    get usernameInput() { return document.getElementById('username'); },
    get passwordInput() { return document.getElementById('password'); },
    get modal() { return document.getElementById('modal'); },
    get closeBtn() { return document.getElementById('closeModal'); },
    get itemForm() { return document.getElementById('itemForm'); },
    get modalTitle() { return document.getElementById('modalTitle'); },
    get formCategory() { return document.getElementById('category'); },
    get formSubCategory() { return document.getElementById('subCategory'); },
    get formType() { return document.getElementById('type'); },
    get categoryModal() { return document.getElementById('categoryModal'); },
    get closeCategoryModal() { return document.getElementById('closeCategoryModal'); },
    get categoryManagerList() { return document.getElementById('categoryManagerList'); },
    get addCategorySubmitBtn() { return document.getElementById('addCategorySubmitBtn'); },
    get newCatId() { return document.getElementById('newCatId'); },
    get newCatName() { return document.getElementById('newCatName'); },
    get newsFeedSection() { return document.getElementById('newsFeedSection'); },
    get newsGrid() { return document.getElementById('newsGrid'); },
    get addNewsBtn() { return document.getElementById('addNewsBtn'); },
    get newsModal() { return document.getElementById('newsModal'); },
    get closeNewsModal() { return document.getElementById('closeNewsModal'); },
    get cancelNewsBtn() { return document.getElementById('cancelNewsBtn'); },
    get newsForm() { return document.getElementById('newsForm'); },
    get newsReadModal() { return document.getElementById('newsReadModal'); },
    get closeNewsReadModal() { return document.getElementById('closeNewsReadModal'); },
    get readNewsTitle() { return document.getElementById('readNewsTitle'); },
    get readNewsDate() { return document.getElementById('readNewsDate'); },
    get readNewsContent() { return document.getElementById('readNewsContent'); },
    get boardSection() { return document.getElementById('boardSection'); },
    get boardGrid() { return document.getElementById('boardGrid'); },
    get addBoardBtn() { return document.getElementById('addBoardBtn'); },
    get boardModal() { return document.getElementById('boardModal'); },
    get closeBoardModal() { return document.getElementById('closeBoardModal'); },
    get boardForm() { return document.getElementById('boardForm'); },
    get boardReadModal() { return document.getElementById('boardReadModal'); },
    get closeBoardReadModal() { return document.getElementById('closeBoardReadModal'); },
    get readBoardTitle() { return document.getElementById('readBoardTitle'); },
    get readBoardAuthor() { return document.getElementById('readBoardAuthor'); },
    get readBoardDate() { return document.getElementById('readBoardDate'); },
    get readBoardContent() { return document.getElementById('readBoardContent'); },
    get shortcutsSection() { return document.getElementById('shortcutsSection'); },
    get shortcutsGrid() { return document.getElementById('shortcutsGrid'); },
    get sidebar() { return document.getElementById('sidebar'); },
    get mobileMenuBtn() { return document.getElementById('mobileMenuBtn'); },
    get sidebarOverlay() { return document.getElementById('sidebar-overlay'); },
    get syncStatusEl() { return document.getElementById('syncStatus'); },
    get shortcutModal() { return document.getElementById('shortcutModal'); },
    get shortcutForm() { return document.getElementById('shortcutForm'); },
    get addShortcutBtn() { return document.getElementById('addShortcutBtn'); },
    get closeShortcutModal() { return document.getElementById('closeShortcutModal'); },
    get shortcutModalTitle() { return document.getElementById('shortcutModalTitle'); },
    get urlInput() { return document.getElementById('url'); },
    get titleInput() { return document.getElementById('title'); },
    get descInput() { return document.getElementById('description'); },
    get topMenuItems() { return document.querySelectorAll('.top-menu a'); },
    get typeButtons() { return document.querySelectorAll('[data-filter-type="type"] .filter-btn'); }
};
`;

function replaceStateVars(text) {
    let t = text;
    // Replace items with state.items etc except for variable declarations which we remove or ignore
    stateVars.forEach(v => {
        // Regex negative lookbehinds are supported in Node
        t = t.replace(new RegExp(\`(?<!\\w|\\.)\${v}(?!\\w)\`, 'g'), \`state.\${v}\`);
    });
    // Fix editors
    t = t.replace(/(?<!\w|\.)quill(?!\w)/g, 'editors.quill');
    t = t.replace(/(?<!\w|\.)boardQuill(?!\w)/g, 'editors.boardQuill');
    // Remove declarations if they are carried over
    t = t.replace(/let state\.items = \[\];/g, '');
    t = t.replace(/let state\.currentUser = null;/g, '');
    
    // Replace all DOM references
    // This is hard to regex blindly. Instead of regexing DOM elements, I'll inject:
    // const { grid, catContainer... } = DOM; at the top of functions where needed.
    return t;
}

const apiContent = \`
import { state } from './state.js';
import { DOM } from './dom.js';

export function updateSyncUI(status, message) {
    const syncStatusEl = DOM.syncStatusEl;
    if (!syncStatusEl) return;
    const icon = syncStatusEl.querySelector('i');
    const text = syncStatusEl.querySelector('span');
    
    syncStatusEl.className = 'sync-status ' + (status || '');
    text.textContent = (status === 'saving' || status === 'saved' || status === 'error') ? message : '저장됨';
    
    if (status === 'saving') {
        icon.className = 'fa-solid fa-cloud fa-spin';
    } else if (status === 'saved') {
        icon.className = 'fa-solid fa-check-circle';
    } else if (status === 'error') {
        icon.className = 'fa-solid fa-exclamation-circle';
    } else {
        icon.className = 'fa-solid fa-cloud';
    }
}

export async function syncData() {
    updateSyncUI('saving', '저장 중...');
    try {
        const response = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                usersDB: state.usersDB, 
                categories: state.categories, 
                items: state.items, 
                newsData: state.newsData, 
                boardData: state.boardData, 
                shortcuts: state.shortcuts 
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(\`서버 저장 실패 (상태코드: \${response.status}): \${errText}\`);
        }
        
        updateSyncUI('saved', '저장 완료');
        setTimeout(() => {
            updateSyncUI('', '저장됨');
        }, 2000);
        return true;
    } catch (e) {
        updateSyncUI('error', '저장 실패');
        alert(\`⚠️ 데이터 저장에 실패했습니다.\\n\\n사유: \${e.message}\`);
        return false;
    }
}

export async function fetchMeta(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(\`/api/fetch-meta?url=\${encodeURIComponent(url)}\`, {
        signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!resp.ok) throw new Error('Network response was not ok');
    return await resp.json();
}
\`;

fs.writeFileSync('js/state.js', stateContent);
fs.writeFileSync('js/dom.js', domContent);
fs.writeFileSync('js/api.js', apiContent);
console.log("Written state, dom, api");
