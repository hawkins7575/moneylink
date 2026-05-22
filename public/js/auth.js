import { state } from './state.js';
import { DOM } from './dom.js';
import { syncData } from './api.js';
import { renderCards, renderShortcuts } from './ui.js';

export function updateAuthUI() {
    if (state.currentUser) {
        if (state.currentUser.role === 'admin') document.body.classList.add('admin-mode');
        else document.body.classList.remove('admin-mode');
        
        // Header Auth UI
        if (DOM.userProfile) DOM.userProfile.style.display = 'flex';
        if (DOM.userNameDisplay) DOM.userNameDisplay.textContent = state.currentUser.username;
        if (DOM.loginBtnTrigger) DOM.loginBtnTrigger.style.display = 'none';
        
        // Sidebar Auth UI (for Mobile)
        if (DOM.authContainerSidebar) {
            DOM.authContainerSidebar.innerHTML = `
                <div class="sidebar-user-info" style="display: flex; align-items: center; gap: 0.8rem; padding: 1rem; background: var(--surface-container-low); border-radius: 12px; margin-bottom: 0.5rem;">
                    <i class="fa-solid fa-user-circle" style="font-size: 1.5rem; color: var(--primary);"></i>
                    <div style="flex: 1;">
                        <div style="font-size: 0.85rem; font-weight: 700; color: var(--on-surface);">${state.currentUser.username}</div>
                        <div style="font-size: 0.65rem; color: var(--on-surface-variant); opacity: 0.7;">로그인 중</div>
                    </div>
                    <button class="logout-link-btn" id="sidebarLogoutBtn" style="background: none; border: none; color: #D32F2F; font-size: 0.8rem; font-weight: 600; cursor: pointer;">로그아웃</button>
                </div>
            `;
            const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');
            if (sidebarLogoutBtn) {
                sidebarLogoutBtn.onclick = () => {
                   state.currentUser = null;
                   localStorage.removeItem('fin_currentUser');
                   document.body.classList.remove('admin-mode');
                   updateAuthUI();
                   renderCards();
                   renderShortcuts();
                };
            }
        }

        if (state.currentUser.role === 'admin') {
            if (DOM.adminSettingsDropdown) DOM.adminSettingsDropdown.style.display = 'block';
            if (DOM.adminAddRecommendedCurationBtn) DOM.adminAddRecommendedCurationBtn.style.display = 'flex';
            if (DOM.addNewsBtn) DOM.addNewsBtn.style.display = 'flex';
            
            const activeMenu = document.querySelector('.top-menu a.active') || document.querySelector('.nav-btn.active');
            const isBoardView = activeMenu && activeMenu.getAttribute('data-view') === 'board';
            if (DOM.addBoardBtn) DOM.addBoardBtn.style.display = isBoardView ? 'flex' : 'none';
        } else {
            if (DOM.adminSettingsDropdown) DOM.adminSettingsDropdown.style.display = 'none';
            if (DOM.adminAddRecommendedCurationBtn) DOM.adminAddRecommendedCurationBtn.style.display = 'none';
            if (DOM.addNewsBtn) DOM.addNewsBtn.style.display = 'none';
            if (DOM.addBoardBtn) DOM.addBoardBtn.style.display = 'none';
        }
    } else {
        if (DOM.userProfile) DOM.userProfile.style.display = 'none';
        if (DOM.loginBtnTrigger) DOM.loginBtnTrigger.style.display = 'flex';
        if (DOM.logoutBtn) DOM.logoutBtn.style.display = 'none';
        
        if (DOM.authContainerSidebar) {
            DOM.authContainerSidebar.innerHTML = `
                <button id="sidebarLoginBtn" style="width: 100%; padding: 0.85rem; border-radius: 12px; background: var(--primary); color: white; border: none; font-weight: 700; cursor: pointer;">로그인</button>
            `;
            const sidebarLoginBtn = document.getElementById('sidebarLoginBtn');
            if (sidebarLoginBtn) {
                sidebarLoginBtn.onclick = () => {
                    state.isLoginMode = true;
                    if (DOM.authModalTitle) DOM.authModalTitle.textContent = '로그인';
                    if (DOM.authSubmitBtn) DOM.authSubmitBtn.textContent = '로그인';
                    if (DOM.authModeToggleBtn) DOM.authModeToggleBtn.textContent = '회원가입 하기';
                    if (DOM.authForm) DOM.authForm.reset();
                    if (DOM.authModal) DOM.authModal.classList.add('active');
                };
            }
        }

        if (DOM.adminSettingsDropdown) DOM.adminSettingsDropdown.style.display = 'none';
        if (DOM.adminAddRecommendedCurationBtn) DOM.adminAddRecommendedCurationBtn.style.display = 'none';
        if (DOM.addBoardBtn) DOM.addBoardBtn.style.display = 'none';
        if (DOM.addNewsBtn) DOM.addNewsBtn.style.display = 'none';
    }
}

let generatedVerificationCode = '';
let isEmailVerified = false;
let emailTimerInterval = null;
let timerSecondsLeft = 180;

function resetEmailVerification() {
    generatedVerificationCode = '';
    isEmailVerified = false;
    if (emailTimerInterval) {
        clearInterval(emailTimerInterval);
        emailTimerInterval = null;
    }
    timerSecondsLeft = 180;
    
    if (DOM.emailGroup) DOM.emailGroup.style.display = 'none';
    if (DOM.emailCodeGroup) DOM.emailCodeGroup.style.display = 'none';
    if (DOM.emailTimer) DOM.emailTimer.style.display = 'none';
    if (DOM.emailSuccessMsg) DOM.emailSuccessMsg.style.display = 'none';
    
    if (DOM.emailInput) {
        DOM.emailInput.value = '';
        DOM.emailInput.disabled = false;
    }
    if (DOM.emailVerifyBtn) {
        DOM.emailVerifyBtn.disabled = false;
        DOM.emailVerifyBtn.style.opacity = '1';
    }
    if (DOM.emailCodeInput) {
        DOM.emailCodeInput.value = '';
        DOM.emailCodeInput.disabled = false;
    }
    if (DOM.emailVerifyConfirmBtn) {
        DOM.emailVerifyConfirmBtn.disabled = false;
        DOM.emailVerifyConfirmBtn.style.opacity = '1';
    }
}

export function setupAuthEvents() {
    if (DOM.loginBtnTrigger) {
        DOM.loginBtnTrigger.addEventListener('click', () => {
            state.isLoginMode = true;
            if (DOM.authModalTitle) DOM.authModalTitle.textContent = '로그인';
            if (DOM.authSubmitBtn) DOM.authSubmitBtn.textContent = '로그인';
            if (DOM.authModeToggleBtn) DOM.authModeToggleBtn.textContent = '회원가입 하기';
            if (DOM.authForm) DOM.authForm.reset();
            resetEmailVerification();
            if (DOM.authModal) DOM.authModal.classList.add('active');
        });
    }

    if (DOM.closeAuthModal) {
        DOM.closeAuthModal.addEventListener('click', () => {
            if (DOM.authModal) DOM.authModal.classList.remove('active');
            resetEmailVerification();
        });
    }

    if (DOM.authModeToggleBtn) {
        DOM.authModeToggleBtn.addEventListener('click', () => {
            state.isLoginMode = !state.isLoginMode;
            resetEmailVerification();
            if (state.isLoginMode) {
                if (DOM.authModalTitle) DOM.authModalTitle.textContent = '로그인';
                if (DOM.authSubmitBtn) DOM.authSubmitBtn.textContent = '로그인';
                if (DOM.authModeToggleBtn) DOM.authModeToggleBtn.textContent = '회원가입 하기';
            } else {
                if (DOM.authModalTitle) DOM.authModalTitle.textContent = '회원가입';
                if (DOM.authSubmitBtn) DOM.authSubmitBtn.textContent = '가입하기';
                if (DOM.authModeToggleBtn) DOM.authModeToggleBtn.textContent = '기존 계정으로 로그인';
                if (DOM.emailGroup) DOM.emailGroup.style.display = 'block';
            }
        });
    }

    if (DOM.emailVerifyBtn) {
        DOM.emailVerifyBtn.addEventListener('click', () => {
            const email = DOM.emailInput ? DOM.emailInput.value.trim() : '';
            if (!email) return alert('이메일 주소를 입력해주세요.');
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) return alert('올바른 이메일 형식이 아닙니다.');

            // 6자리 난수 인증코드 생성
            generatedVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            console.log(`[Email Verification Code for ${email}]: ${generatedVerificationCode}`);
            
            alert(`📧 이메일로 인증번호가 발송되었습니다!\n\n[시뮬레이션 인증코드: ${generatedVerificationCode}]`);
            
            if (DOM.emailCodeGroup) DOM.emailCodeGroup.style.display = 'block';
            if (DOM.emailCodeInput) {
                DOM.emailCodeInput.value = '';
                DOM.emailCodeInput.focus();
            }
            
            if (emailTimerInterval) clearInterval(emailTimerInterval);
            timerSecondsLeft = 180;
            if (DOM.emailTimer) {
                DOM.emailTimer.style.display = 'block';
                DOM.emailTimer.textContent = '남은 시간: 03:00';
            }
            
            emailTimerInterval = setInterval(() => {
                timerSecondsLeft--;
                if (timerSecondsLeft <= 0) {
                    clearInterval(emailTimerInterval);
                    emailTimerInterval = null;
                    generatedVerificationCode = '';
                    if (DOM.emailTimer) DOM.emailTimer.textContent = '인증 코드가 만료되었습니다. 다시 요청해주세요.';
                    alert('인증 코드가 만료되었습니다. 다시 인증요청을 해주세요.');
                } else {
                    const mins = Math.floor(timerSecondsLeft / 60).toString().padStart(2, '0');
                    const secs = (timerSecondsLeft % 60).toString().padStart(2, '0');
                    if (DOM.emailTimer) DOM.emailTimer.textContent = `남은 시간: ${mins}:${secs}`;
                }
            }, 1000);
        });
    }

    if (DOM.emailVerifyConfirmBtn) {
        DOM.emailVerifyConfirmBtn.addEventListener('click', () => {
            if (!generatedVerificationCode) {
                return alert('인증번호가 발송되지 않았거나 만료되었습니다. 인증번호 전송을 다시 진행해주세요.');
            }
            
            const userCode = DOM.emailCodeInput ? DOM.emailCodeInput.value.trim() : '';
            if (userCode === generatedVerificationCode) {
                isEmailVerified = true;
                if (emailTimerInterval) {
                    clearInterval(emailTimerInterval);
                    emailTimerInterval = null;
                }
                
                if (DOM.emailTimer) DOM.emailTimer.style.display = 'none';
                if (DOM.emailSuccessMsg) DOM.emailSuccessMsg.style.display = 'block';
                
                if (DOM.emailInput) DOM.emailInput.disabled = true;
                if (DOM.emailVerifyBtn) {
                    DOM.emailVerifyBtn.disabled = true;
                    DOM.emailVerifyBtn.style.opacity = '0.6';
                }
                if (DOM.emailCodeInput) DOM.emailCodeInput.disabled = true;
                if (DOM.emailVerifyConfirmBtn) {
                    DOM.emailVerifyConfirmBtn.disabled = true;
                    DOM.emailVerifyConfirmBtn.style.opacity = '0.6';
                }
                
                alert('✓ 이메일 인증이 완료되었습니다.');
            } else {
                alert('인증번호가 일치하지 않습니다. 다시 확인해주세요.');
            }
        });
    }

    if (DOM.logoutBtn) {
        DOM.logoutBtn.addEventListener('click', () => {
            state.currentUser = null;
            localStorage.removeItem('fin_currentUser');
            document.body.classList.remove('admin-mode');
            updateAuthUI();
            renderCards();
            renderShortcuts();
        });
    }

    if (DOM.authForm) {
        DOM.authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const un = DOM.usernameInput ? DOM.usernameInput.value.trim() : '';
            const pw = DOM.passwordInput ? DOM.passwordInput.value.trim() : '';
            
            if (!un || !pw) return alert('아이디와 비밀번호를 입력하세요.');
 
            if (state.isLoginMode) {
                const user = state.usersDB.find(u => u.username === un && u.password === pw);
                if (user) {
                    state.currentUser = { username: user.username, role: user.role };
                    localStorage.setItem('fin_currentUser', JSON.stringify(state.currentUser));
                    updateAuthUI();
                    if (DOM.authModal) DOM.authModal.classList.remove('active');
                    renderCards();
                } else {
                    alert('아이디 또는 비밀번호가 틀렸습니다.');
                }
            } else {
                if (state.usersDB.find(u => u.username === un)) return alert('이미 존재하는 아이디입니다.');
                
                if (!isEmailVerified) {
                    return alert('이메일 인증을 완료해주세요.');
                }

                const email = DOM.emailInput ? DOM.emailInput.value.trim() : '';
                const newUser = { username: un, password: pw, email: email, role: 'user' };
                state.usersDB.push(newUser);
                syncData();
                
                state.currentUser = { username: newUser.username, role: newUser.role };
                localStorage.setItem('fin_currentUser', JSON.stringify(state.currentUser));
                updateAuthUI();
                if (DOM.authModal) DOM.authModal.classList.remove('active');
                renderCards();
                alert('회원가입이 완료되었습니다!');
            }
        });
    }
}

