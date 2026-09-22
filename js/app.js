import { state } from './state.js';
import { config } from './config.js';
import { api } from './api.js';
import { fb } from './firebase.js';
import { dom, ui } from './ui.js';

const app = {
    init() {
        this.bindEvents();
        ui.renderAll();
        
        // Initialize Firebase Auth Listener
        fb.initAuthListener(
            (user) => { ui.updateAuthUI(); }, 
            () => { ui.updateAuthUI(); ui.renderLists(); }
        );

        // Listen for watchlist updates from Firebase
        document.addEventListener('watchlistUpdated', () => {
            ui.renderLists();
        });
    },

    bindEvents() {
        // Handle Mobile Back Gesture (History API)
        window.addEventListener('popstate', (e) => {
            if (dom.detailModalOverlay.classList.contains('show')) {
                ui.hideDetailModal(true);
            } else if (dom.authModalOverlay.classList.contains('show')) {
                ui.hideAuthModal(true);
            } else if (dom.confirmModalOverlay.classList.contains('show')) {
                ui.hideConfirmModal(true);
            }
        });

        // Theme Toggle
        dom.darkModeToggle?.addEventListener('click', () => {
            state.isDarkMode = !state.isDarkMode;
            localStorage.setItem('isDarkMode', state.isDarkMode);
            ui.renderTheme();
        });

        // Search Input (Debounced)
        let searchTimeout;
        dom.searchInput?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            searchTimeout = setTimeout(async () => {
                if (query.length < 2) {
                    ui.renderSearchResults([]);
                    return;
                }
                const data = await api.search(query);
                ui.renderSearchResults(data?.results);
            }, 350);
        });
        
        // Close search results on outside click
        document.addEventListener('click', (e) => {
            if (!dom.searchInput?.contains(e.target) && !dom.searchResults?.contains(e.target)) {
                dom.searchResults?.classList.remove('active');
            }
        });

        // Tabs (Desktop & Mobile)
        const handleTabChange = (e) => {
            const btn = e.target.closest('.tab-button, .nav-item[data-tab]');
            if (btn) {
                state.activeTab = btn.dataset.tab;
                ui.renderAll();
            }
        };
        dom.tabs?.addEventListener('click', handleTabChange);
        dom.bottomNav?.addEventListener('click', handleTabChange);

        // Search Results Click
        dom.searchResults?.addEventListener('click', async (e) => {
            const li = e.target.closest('li');
            if (li) {
                const id = parseInt(li.dataset.id);
                const type = li.dataset.type;
                state.currentDetailItem = await api.getDetails(id, type);
                ui.renderDetailModal(state.currentDetailItem);
                ui.renderSearchResults([]);
                dom.searchInput.value = '';
            }
        });

        // Watchlist Actions (View details, Mark watched, Remove)
        dom.bucketLists?.addEventListener('click', async (e) => {
            const link = e.target.closest('.poster-link');
            const btn = e.target.closest('.action-btn');
            
            if (link) {
                e.preventDefault();
                const id = parseInt(link.dataset.id);
                const type = link.dataset.type;
                state.currentDetailItem = await api.getDetails(id, type);
                ui.renderDetailModal(state.currentDetailItem);
            }
            
            if (btn) {
                const id = parseInt(btn.dataset.id);
                const type = btn.dataset.type;
                
                if (btn.classList.contains('toggle-watched')) {
                    this.toggleWatched(id, type);
                }
                if (btn.classList.contains('remove')) {
                    ui.showConfirmModal(btn.dataset.title, () => this.removeItem(id, type));
                }
            }
        });

        // Detail Modal Actions
        dom.detailModalOverlay?.addEventListener('click', (e) => {
            if (e.target.matches('.modal-container') || e.target.closest('.close-detail-btn')) {
                ui.hideDetailModal();
            }
            const addBtn = e.target.closest('.add-to-list-btn');
            if (addBtn) {
                if(!state.user) {
                    ui.hideDetailModal(true);
                    ui.showAuthModal();
                    return;
                }
                const action = addBtn.dataset.action || 'plan_to_watch';
                this.addItem(action);
            }
        });

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                ui.hideDetailModal();
                ui.hideConfirmModal();
                ui.hideAuthModal();
            }
        });

        // Auth Modal Events
        dom.loginBtn?.addEventListener('click', () => ui.showAuthModal());
        dom.logoutBtn?.addEventListener('click', () => fb.logout());
        dom.authModalOverlay?.addEventListener('click', (e) => {
            if(e.target === dom.authModalOverlay) ui.hideAuthModal();
        });
        dom.googleSignInBtn?.addEventListener('click', () => {
            fb.signInWithGoogle();
        });
        
        let isSignup = false;
        dom.toggleAuthModeBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            isSignup = !isSignup;
            dom.emailLoginForm.querySelector('button[type="submit"]').textContent = isSignup ? 'Sign Up' : 'Login';
            dom.toggleAuthModeBtn.textContent = isSignup ? 'Already have an account? Login' : 'Need an account? Sign Up';
        });

        dom.emailLoginForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = dom.emailInput.value;
            const password = dom.passwordInput.value;
            if (isSignup) {
                fb.signUpWithEmail(email, password);
            } else {
                fb.signInWithEmail(email, password);
            }
        });
    },

    addItem(action = 'plan_to_watch') {
        const item = state.currentDetailItem;
        if (!item || !state.user) return;
        
        const type = item.title ? 'movie' : 'series';
        const list = state.watchlist[type === 'movie' ? 'movies' : 'series'];
        
        if (list.some(i => i.id === item.id)) return; // Already in list
        
        const isCompleted = action === 'completed';

        list.push({ 
            id: item.id, 
            title: item.title || item.name, 
            year: (new Date(item.release_date || item.first_air_date)).getFullYear() || 'N/A', 
            poster: item.poster_path ? config.tmdbImageBaseUrl + item.poster_path : null, 
            watched: isCompleted, 
            type: type 
        });
        
        fb.saveWatchlist(); // Save to Firestore
        ui.hideDetailModal();
    },

    toggleWatched(id, type) {
        if (!state.user) return;
        const listKey = type === 'movie' ? 'movies' : 'series';
        const item = state.watchlist[listKey].find(i => i.id === id);
        if (item) {
            item.watched = !item.watched;
            fb.saveWatchlist();
        }
    },

    removeItem(id, type) {
        if (!state.user) return;
        const listKey = type === 'movie' ? 'movies' : 'series';
        state.watchlist[listKey] = state.watchlist[listKey].filter(i => i.id !== id);
        fb.saveWatchlist();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
