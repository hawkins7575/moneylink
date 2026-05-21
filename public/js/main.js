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
    renderBoard,
    renderCommunityBoard,
    renderFeedbackBoard,
    renderShortcuts,
    renderCurations,
    openNewsModal,
    openBoardModal,
    closeAllModals,
    switchView,
    renderTicker
} from './ui.js';

function handleRouting() {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const id = params.get('id');

    if (!view || !id) {
        closeAllModals(false);
        return false;
    }

    if (view === 'news') {
        const news = state.newsData.find(n => n.id === parseInt(id));
        if (news) { openNewsModal(news); return true; }
    } else if (view === 'board') {
        const post = state.boardData.find(b => b.id === parseInt(id));
        if (post) { openBoardModal(post); return true; }
    } else if (view === 'community-board') {
        const post = state.communityData.find(b => b.id === parseInt(id));
        if (post) { openBoardModal(post); return true; }
    } else if (view === 'feedback-board') {
        const post = state.feedbackData.find(b => b.id === parseInt(id));
        if (post) { openBoardModal(post); return true; }
    }
    return false;
}

async function initApp() {
    try {
        const resp = await fetch('/api/data?t=' + Date.now());
        const data = await resp.json();
        
        state.usersDB = data.usersDB || [];
        state.categories = data.categories || [];
        state.items = data.items || [];
        state.newsData = data.newsData || [];
        state.boardData = data.boardData || [];
        state.communityData = data.communityData || [];
        state.feedbackData = data.feedbackData || [];
        state.shortcuts = data.shortcuts || [];
        state.curations = data.curations || [];
        
        let needsSync = false;

        if (state.usersDB.length === 0) {
            state.usersDB = [{ username: 'admin', password: 'admin', role: 'admin' }];
            needsSync = true;
        }
        
        if (state.categories.length === 0) {
            state.categories = JSON.parse(JSON.stringify(defaultCategories));
            needsSync = true;
        }
        
        if (state.items.length === 0) {
            state.items.forEach(i => { if (!i.userId) i.userId = 'admin'; });
            needsSync = true;
        }

        const sessionUser = localStorage.getItem('fin_currentUser');
        if (sessionUser) {
            state.currentUser = JSON.parse(sessionUser);
        }

        // 최적화: UI 먼저 렌더링 (동기화 완료 전이라도)
        updateAuthUI();
        renderCategoryFilters();
        renderFormCategories();
        renderNews();
        renderCards();
        renderBoard();
        renderCommunityBoard();
        renderFeedbackBoard();
        renderShortcuts();
        renderCurations();
        renderTicker(); // 실시간 금융 지표 위젯 마운트

        // 초기 라우팅 처리
        if (!handleRouting()) {
            switchView('bookmarks', '즐겨찾기');
        }

        // 최적화: 동기화는 백그라운드에서 진행 (사용자 대기 시간 제거)
        if (needsSync) {
            syncData(); 
        }

    } catch(e) {
        alert('서버로부터 데이터를 불러오는데 실패했습니다. 네트워크 상태를 확인하시거나 잠시 후 다시 시도해주세요.');
        console.error(e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initEditors();
    setupAuthEvents();
    setupUIEvents();
    initApp();

    // 5분(300,000ms)마다 실시간 금융 지표 위젯 자동 갱신
    setInterval(renderTicker, 300000);

    window.addEventListener('popstate', (event) => {
        handleRouting();
    });
});

