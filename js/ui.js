import { state } from './state.js';
import { config } from './config.js';
import { fb } from './firebase.js';

export const dom = {
    body: document.body,
    darkModeToggle: document.getElementById('darkModeToggle'),
    searchInput: document.getElementById('searchInput'),
    searchResults: document.getElementById('searchResults'),
    tabs: document.querySelector('.tabs'),
    bucketLists: document.getElementById('bucketLists'),
    detailModalOverlay: document.getElementById('detailModalOverlay'),
    confirmModalOverlay: document.getElementById('confirmModalOverlay'),
    
    // Auth DOM
    authModalOverlay: document.getElementById('authModalOverlay'),
    authContainer: document.getElementById('authContainer'),
    loginBtn: document.getElementById('loginBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    googleSignInBtn: document.getElementById('googleSignInBtn'),
    emailLoginForm: document.getElementById('emailLoginForm'),
    emailInput: document.getElementById('emailInput'),
    passwordInput: document.getElementById('passwordInput'),
    toggleAuthModeBtn: document.getElementById('toggleAuthModeBtn'),
    
    // Bottom Nav
    bottomNav: document.querySelector('.bottom-nav')
};

export const ui = {
    renderAll() {
        this.renderTheme();
        this.renderTabs();
        this.renderLists();
    },

    renderTheme() {
        dom.body.classList.toggle('dark-mode', state.isDarkMode);
        dom.darkModeToggle.innerHTML = state.isDarkMode ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    },

    renderTabs() {
        // Desktop Tabs
        if(dom.tabs) {
            dom.tabs.innerHTML = `
                <button class="tab-button ${state.activeTab === 'movies' ? 'active' : ''}" data-tab="movies">Movies</button>
                <button class="tab-button ${state.activeTab === 'series' ? 'active' : ''}" data-tab="series">Series</button>
            `;
        }
        
        // Mobile Bottom Nav
        if(dom.bottomNav) {
            dom.bottomNav.innerHTML = `
                <button class="nav-item ${state.activeTab === 'movies' ? 'active' : ''}" data-tab="movies">
                    <i class="fa-solid fa-film"></i>
                    <span>Movies</span>
                </button>
                <button class="nav-item ${state.activeTab === 'series' ? 'active' : ''}" data-tab="series">
                    <i class="fa-solid fa-tv"></i>
                    <span>Series</span>
                </button>
            `;
        }
    },

    renderLists() {
        if (!state.user) {
             dom.bucketLists.innerHTML = `<div class="auth-prompt"><h2>Please login to view your watchlist</h2><button class="add-to-list-btn" onclick="document.getElementById('authModalOverlay').classList.add('show')">Login</button></div>`;
             return;
        }

        const createGrid = (items, title) => {
            if (items.length === 0) return `<div class="list-category"><h2>${title}</h2><p class="empty-msg">No items yet.</p></div>`;
            return `
                <div class="list-category">
                    <h2>${title}</h2>
                    <div class="item-grid">
                        ${items.map(item => `
                            <div class="grid-item">
                                <a href="#" class="poster-link" data-id="${item.id}" data-type="${item.type}">
                                    <img src="${item.poster || config.placeholder}" alt="${item.title}" loading="lazy">
                                </a>
                                <div class="item-content">
                                    <div class="item-title">${item.title}</div>
                                    <div class="item-year">${item.year}</div>
                                    <div class="item-actions">
                                        <button class="action-btn toggle-watched" data-id="${item.id}" data-type="${item.type}" title="${item.watched ? 'Mark Unwatched' : 'Mark Watched'}">
                                            <i class="fa-solid ${item.watched ? 'fa-eye-slash' : 'fa-eye'}"></i>
                                        </button>
                                        <button class="action-btn remove" data-id="${item.id}" data-type="${item.type}" data-title="${item.title}" title="Remove">
                                            <i class="fa-solid fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>`).join('')}
                    </div>
                </div>`;
        };
        
        dom.bucketLists.innerHTML = `
            <div class="bucket-list ${state.activeTab === 'movies' ? 'active' : ''}">
                ${createGrid(state.watchlist.movies.filter(m => !m.watched), 'Movies to Watch')}
                ${createGrid(state.watchlist.movies.filter(m => m.watched), 'Watched Movies')}
            </div>
            <div class="bucket-list ${state.activeTab === 'series' ? 'active' : ''}">
                ${createGrid(state.watchlist.series.filter(s => !s.watched), 'Series to Watch')}
                ${createGrid(state.watchlist.series.filter(s => s.watched), 'Watched Series')}
            </div>`;
    },

    renderSearchResults(results) {
        if (!results || results.length === 0) {
            dom.searchResults.innerHTML = ''; 
            dom.searchResults.classList.remove('active');
            return;
        }
        const validResults = results.filter(r => (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path);
        
        if (validResults.length === 0) {
            dom.searchResults.innerHTML = '';
            dom.searchResults.classList.remove('active');
            return;
        }
        
        dom.searchResults.innerHTML = `<ul>${validResults.map(item => `
            <li data-id="${item.id}" data-type="${item.media_type}">
                <img src="${config.tmdbImageBaseUrl}${item.poster_path}" alt="" loading="lazy">
                <div class="item-info">
                    <div class="title">${item.title || item.name}</div>
                    <div class="year">${(new Date(item.release_date || item.first_air_date)).getFullYear() || 'N/A'}</div>
                </div>
            </li>`).join('')}</ul>`;
        
        dom.searchResults.classList.add('active');
    },

    renderDetailModal(data) {
        if (!data) { 
            dom.detailModalOverlay.innerHTML = `<div class="modal-container"><button class="close-detail-btn">&times;</button><p>Error loading details.</p></div>`; 
            dom.detailModalOverlay.classList.add('show');
            return; 
        }
        const type = data.title ? 'movie' : 'series';
        const providers = data['watch/providers']?.results[config.region] || data['watch/providers']?.results['US'];
        const imdbId = data.external_ids?.imdb_id;
        const isInWatchlist = state.user && state.watchlist[type === 'movie' ? 'movies' : 'series'].some(item => item.id === data.id);

        dom.detailModalOverlay.innerHTML = `
            <div class="modal-container">
                <button class="close-detail-btn">&times;</button>
                <div class="detail-content-wrapper">
                    <div class="detail-poster"><img src="${data.poster_path ? config.tmdbImageBaseUrl + data.poster_path : config.placeholder}" alt=""></div>
                    <div class="detail-info">
                        <h1>${data.title || data.name}</h1>
                        <div class="meta">
                            <span>${(new Date(data.release_date || data.first_air_date)).getFullYear() || ''}</span>
                            ${data.runtime ? `<span> &bull; ${data.runtime} min</span>` : ''}
                        </div>
                        <h2>Synopsis</h2><p class="plot">${data.overview || 'Not available.'}</p>
                        <h2>Ratings</h2>
                        <div class="ratings">
                            <span>TMDb: <b>${data.vote_average ? data.vote_average.toFixed(1) : 'N/A'}</b>/10</span>
                            ${imdbId ? `<a href="https://www.imdb.com/title/${imdbId}" target="_blank" class="imdb-link">IMDb</a>` : ''}
                        </div>
                        <h2>Where to Watch</h2>
                        <div class="providers-list">${providers?.flatrate?.map(p => `<img src="${config.tmdbImageBaseUrl}${p.logo_path}" title="${p.provider_name}">`).join('') || '<p class="subtle">Not available for streaming.</p>'}</div>
                    </div>
                    ${!isInWatchlist ? `
                        <div class="add-btn-container">
                            <div class="detail-add-actions">
                                <button class="add-to-list-btn" data-action="plan_to_watch">
                                    <i class="fa-solid fa-plus"></i> Add to Watchlist
                                </button>
                                ${type === 'series' ? `
                                    <button class="add-to-list-btn start-watching-now-btn" data-action="watching">
                                        <i class="fa-solid fa-play"></i> Start Watching
                                    </button>
                                ` : ''}
                                <button class="add-to-list-btn already-watched-btn" data-action="completed">
                                    <i class="fa-solid fa-circle-check"></i> Already Watched
                                </button>
                            </div>
                        </div>` : `
                        <div class="add-btn-container">
                            <div class="detail-in-watchlist-status">
                                <p class="success-text"><i class="fa-solid fa-check"></i> In Watchlist</p>
                            </div>
                        </div>`
                    }
                </div>
            </div>`;
        dom.detailModalOverlay.classList.add('show');
        document.body.classList.add('modal-open');
        history.pushState({ modal: 'detail' }, '');
    },

    showConfirmModal(title, onConfirm) {
        dom.confirmModalOverlay.innerHTML = `
            <div class="modal-content">
                <h2>Remove Item</h2><p>Are you sure you want to remove "${title}" from your list?</p>
                <div class="modal-actions"><button class="modal-btn cancel">Cancel</button><button class="modal-btn confirm">Remove</button></div>
            </div>`;
        dom.confirmModalOverlay.classList.add('show');
        document.body.classList.add('modal-open');
        dom.confirmModalOverlay.querySelector('.confirm').onclick = () => { onConfirm(); this.hideConfirmModal(); };
        history.pushState({ modal: 'confirm' }, '');
    },

    hideConfirmModal(fromPopState = false) { 
        dom.confirmModalOverlay.classList.remove('show'); 
        if(!dom.detailModalOverlay.classList.contains('show') && !dom.authModalOverlay.classList.contains('show')) {
            document.body.classList.remove('modal-open');
        }
        if (fromPopState !== true) history.back();
    },
    
    hideDetailModal(fromPopState = false) {
        dom.detailModalOverlay.classList.remove('show');
        if(!dom.confirmModalOverlay.classList.contains('show') && !dom.authModalOverlay.classList.contains('show')) {
            document.body.classList.remove('modal-open');
        }
        if (fromPopState !== true) history.back();
    },
    
    showAuthModal() {
        dom.authModalOverlay.classList.add('show');
        document.body.classList.add('modal-open');
        history.pushState({ modal: 'auth' }, '');
    },
    
    hideAuthModal(fromPopState = false) {
        dom.authModalOverlay.classList.remove('show');
        if(!dom.detailModalOverlay.classList.contains('show') && !dom.confirmModalOverlay.classList.contains('show')) {
            document.body.classList.remove('modal-open');
        }
        if (fromPopState !== true) history.back();
    },
    
    updateAuthUI() {
        if(state.user) {
            dom.loginBtn.style.display = 'none';
            dom.logoutBtn.style.display = 'block';
            if (dom.authModalOverlay.classList.contains('show')) {
                this.hideAuthModal();
            }
        } else {
            dom.loginBtn.style.display = 'block';
            dom.logoutBtn.style.display = 'none';
        }
    }
};
