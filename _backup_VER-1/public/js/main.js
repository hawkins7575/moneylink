import { state, defaultCategories } from './state.js';
import { syncData } from './api.js';
import { updateAuthUI, setupAuthEvents } from './auth.js';
import { 
    setupUIEvents, 
    initEditors, 
    renderCategoryFilters, 
    renderFormCategories, 
    renderNews, 
    renderCards,
    openNewsModal,
    openBoardModal,
    closeAllModals
} from './ui.js';

function handleRouting() {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const id = params.get('id');

    if (!view || !id) {
        closeAllModals(false);
        return;
    }

    if (view === 'news') {
        const news = state.newsData.find(n => n.id === parseInt(id));
        if (news) openNewsModal(news);
    } else if (view === 'board') {
        const post = state.boardData.find(b => b.id === parseInt(id));
        if (post) openBoardModal(post);
    }
}

async function initApp() {
    try {
        const resp = await fetch('/api/data');
        const data = await resp.json();
        
        state.usersDB = data.usersDB || [];
        state.categories = data.categories || [];
        state.items = data.items || [];
        state.newsData = data.newsData || [];
        state.boardData = data.boardData || [];
        state.communityData = data.communityData || [];
        state.shortcuts = data.shortcuts || [];
        
        let needsSync = false;

        if (state.usersDB.length === 0) {
            const lsUsers = localStorage.getItem('fin_usersDB');
            if (lsUsers) state.usersDB = JSON.parse(lsUsers);
            else state.usersDB = [{ username: 'admin', password: 'admin', role: 'admin' }];
            needsSync = true;
        }
        
        if (state.categories.length === 0) {
            const lsCat = localStorage.getItem('financialCategoriesData');
            if (lsCat) state.categories = JSON.parse(lsCat);
            else state.categories = JSON.parse(JSON.stringify(defaultCategories));
            needsSync = true;
        }
        
        if (state.items.length === 0) {
            const lsItems = localStorage.getItem('financialFavorites');
            if (lsItems) {
                state.items = JSON.parse(lsItems);
            } else if (typeof window !== 'undefined' && window.financialData) {
                state.items = [...window.financialData].map(i => {
                    i.userId = 'admin';
                    if(!i.subCategory) i.subCategory = 'general';
                    return i;
                });
            }
            state.items.forEach(i => { if (!i.userId) i.userId = 'admin'; });
            needsSync = true;
        }

        const sessionUser = localStorage.getItem('fin_currentUser');
        if (sessionUser) {
            state.currentUser = JSON.parse(sessionUser);
        }

        if (needsSync) {
            await syncData();
        }

        updateAuthUI();
        renderCategoryFilters();
        renderFormCategories();
        renderNews();
        renderCards();

        // 초기 라우팅 처리
        handleRouting();

    } catch(e) {
        alert('백엔드 서버(server.ps1)가 켜져 있는지 확인해주세요!');
        console.error(e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initEditors();
    setupAuthEvents();
    setupUIEvents();
    initApp();

    window.addEventListener('popstate', (event) => {
        handleRouting();
    });
});
