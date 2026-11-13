import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import SearchBar from './components/SearchBar';
import GridItem from './components/GridItem';
import SeriesProgressCard from './components/SeriesProgressCard';
import StatsBar from './components/StatsBar';
import DiscoverRow from './components/DiscoverRow';
import Toaster from './components/Toaster';
import DetailModal from './components/modals/DetailModal';
import { useAuth } from './contexts/AuthContext';
import { useWatchlist } from './contexts/WatchlistContext';
import { tmdb } from './services/tmdb';
import { notify } from './utils/notifications';
import { 
    PlayCircle, 
    Clock, 
    CheckCircle2, 
    Film, 
    Tv, 
    Sparkles, 
    Compass, 
    Upload, 
    Heart, 
    Search as SearchIcon, 
    X, 
    SlidersHorizontal,
    FileJson,
    FileCode,
    Check
} from 'lucide-react';

const AuthModal = lazy(() => import('./components/modals/AuthModal'));
const ConfirmModal = lazy(() => import('./components/modals/ConfirmModal'));

function App() {
    const { user } = useAuth();
    const { watchlist, deleteModalState, cancelDelete, confirmDelete, importWatchlist } = useWatchlist();
    const [activeTab, setActiveTab] = useState('movies'); // 'movies' | 'series' | 'discover'
    const [seriesFilter, setSeriesFilter] = useState('all'); // 'all' | 'watching' | 'plan' | 'completed' | 'favorites'
    const [moviesFilter, setMoviesFilter] = useState('all'); // 'all' | 'unwatched' | 'watched' | 'favorites'
    const [librarySearch, setLibrarySearch] = useState('');
    const [isDarkMode, setIsDarkMode] = useState(
        () => localStorage.getItem('isDarkMode') !== 'false'
    );
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [detailData, setDetailData] = useState(null);
    const [detailType, setDetailType] = useState('movie');
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [sortBy, setSortBy] = useState('added'); // 'added' | 'title_asc' | 'title_desc' | 'newest' | 'oldest' | 'rating'
    const [showExportMenu, setShowExportMenu] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        localStorage.setItem('isDarkMode', isDarkMode);
    }, [isDarkMode]);

    // Global "/" shortcut to jump to main TMDb search
    useEffect(() => {
        const onKey = (e) => {
            const tag = document.activeElement?.tagName;
            if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
                e.preventDefault();
                document.getElementById('searchInput')?.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Handle Mobile Hardware / Browser Back Gesture via History API
    useEffect(() => {
        const handlePopState = () => {
            if (showDetailModal) {
                setShowDetailModal(false);
            } else if (showAuthModal) {
                setShowAuthModal(false);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [showDetailModal, showAuthModal]);

    const handleSelectSearchItem = useCallback((id, type, initialItem) => {
        const resolvedType = type === 'tv' || type === 'series' ? 'series' : 'movie';
        setDetailType(resolvedType);

        if (initialItem) {
            setDetailData({
                ...initialItem,
                media_type: resolvedType === 'series' ? 'tv' : 'movie'
            });
            setShowDetailModal(true);
            history.pushState({ modal: 'detail' }, '');
        }

        tmdb.getDetails(id, resolvedType).then(data => {
            if (!data) return;
            setDetailData(prev => {
                if (!initialItem || (prev && String(prev.id) === String(id))) {
                    return { ...(prev || {}), ...data };
                }
                return prev;
            });
            if (!initialItem) {
                setShowDetailModal(true);
                history.pushState({ modal: 'detail' }, '');
            }
        });
    }, []);

    const handleGridItemClick = useCallback((item, forcedType) => {
        const type = forcedType || (item.total_seasons !== undefined || item.media_type === 'tv' || item.first_air_date ? 'series' : 'movie');
        
        // 1. Instant optimistic modal open (0ms latency!)
        setDetailType(type);
        setDetailData({
            ...item,
            media_type: type === 'series' ? 'tv' : 'movie'
        });
        setShowDetailModal(true);
        history.pushState({ modal: 'detail' }, '');

        // 2. Background enrich from TMDB cache or network
        tmdb.getDetails(item.id, type).then(fullData => {
            if (fullData) {
                setDetailData(prev => {
                    if (prev && String(prev.id) === String(item.id)) {
                        return { ...prev, ...fullData };
                    }
                    return prev;
                });
            }
        });
    }, []);

    const handleCloseDetail = useCallback(() => {
        setShowDetailModal(false);
        if (history.state && history.state.modal === 'detail') {
            history.back();
        }
    }, []);

    const handleCloseAuth = useCallback(() => {
        setShowAuthModal(false);
        if (history.state && history.state.modal === 'auth') {
            history.back();
        }
    }, []);

    const openAuthModal = useCallback(() => {
        setShowAuthModal(true);
        history.pushState({ modal: 'auth' }, '');
    }, []);

    // Export library as an interactive standalone HTML page with search & filter
    const exportInteractiveHtml = useCallback(() => {
        setShowExportMenu(false);
        const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        const yearOf = (i) => String(i.year || i.release_date || i.first_air_date || '').slice(0, 4);
        const posterOf = (i) => {
            const p = i.poster_path || i.poster || '';
            if (!p) return '';
            return String(p).startsWith('http') ? p : `https://image.tmdb.org/t/p/w300${String(p).startsWith('/') ? p : '/' + p}`;
        };
        const card = (i, extra = '', cat = '') => `
            <div class="card" data-title="${esc((i.title || '').toLowerCase())}" data-category="${cat}">
                ${posterOf(i) ? `<img loading="lazy" src="${posterOf(i)}" alt="${esc(i.title || '')}">` : `<div class="noimg">Reelcase</div>`}
                <div class="t">${esc(i.title || 'Untitled')}</div>
                <div class="y">${esc(yearOf(i))}${extra ? ` &bull; ${esc(extra)}` : ''}</div>
            </div>`;
        const seriesExtra = (s) => s.watched ? 'Completed' : (s.currentEpisode > 0 ? `S${s.currentSeason || 1} E${s.currentEpisode}` : 'Plan to watch');
        const section = (title, inner) => inner ? `<section><h2>${title}</h2><div class="grid">${inner}</div></section>` : '';

        const movies = watchlist.movies;
        const series = watchlist.series;
        const exportDate = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

        const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reelcase Library &bull; ${exportDate}</title>
<style>
:root{--bg:#0b0d14;--card:#141724;--border:rgba(255,255,255,0.08);--text:#f1f5f9;--sub:#94a3b8;--accent:#6366f1}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;background:var(--bg);color:var(--text);line-height:1.5}
.wrap{max-width:1100px;margin:0 auto;padding:36px 20px}
header{margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px}
h1{font-size:2rem;letter-spacing:-.02em;margin:0}
.sub{color:var(--sub);font-size:.9rem;margin:6px 0 0}
.search-box{padding:10px 14px;border-radius:10px;background:var(--card);border:1px solid var(--border);color:#fff;width:100%;max-width:320px;font-size:.9rem}
section{margin-bottom:36px}
h2{font-size:1.2rem;margin:0 0 14px;padding-bottom:8px;border-bottom:1px solid var(--border);color:#e2e8f0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:14px}
.card{background:var(--card);border:1px solid var(--border);border-radius:10px;overflow:hidden;transition:transform .2s}
.card:hover{transform:translateY(-3px)}
.card img{width:100%;aspect-ratio:2/3;object-fit:cover;display:block}
.noimg{aspect-ratio:2/3;display:flex;align-items:center;justify-content:center;color:var(--sub);font-size:.8rem;background:rgba(255,255,255,0.03)}
.t{font-size:.82rem;font-weight:600;padding:8px 8px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.y{font-size:.72rem;color:var(--sub);padding:2px 8px 10px}
</style>
</head>
<body>
<div class="wrap">
<header>
  <div>
    <h1>Reelcase Library</h1>
    <p class="sub">${movies.length} movies &bull; ${series.length} series &bull; Exported ${exportDate}</p>
  </div>
  <input type="text" class="search-box" id="q" placeholder="Filter titles..." oninput="filterTitles(this.value)">
</header>
<main id="libraryContent">
${section(`Movies to Watch (${movies.filter(m => !m.watched).length})`, movies.filter(m => !m.watched).map(m => card(m, '', 'unwatched')).join(''))}
${section(`Watched Movies (${movies.filter(m => m.watched).length})`, movies.filter(m => m.watched).map(m => card(m, '', 'watched')).join(''))}
${section(`Currently Watching (${series.filter(s => !s.watched && (s.status === 'watching' || s.currentEpisode > 0)).length})`, series.filter(s => !s.watched && (s.status === 'watching' || s.currentEpisode > 0)).map(s => card(s, seriesExtra(s), 'watching')).join(''))}
${section(`Plan to Watch (${series.filter(s => !s.watched && s.status !== 'watching' && !s.currentEpisode).length})`, series.filter(s => !s.watched && s.status !== 'watching' && !s.currentEpisode).map(s => card(s, seriesExtra(s), 'plan')).join(''))}
${section(`Completed Series (${series.filter(s => s.watched || s.status === 'completed').length})`, series.filter(s => s.watched || s.status === 'completed').map(s => card(s, seriesExtra(s), 'completed')).join(''))}
</main>
</div>
<script>
function filterTitles(query){
  var q = (query || '').toLowerCase().trim();
  var cards = document.querySelectorAll('.card');
  cards.forEach(function(c){
    var title = c.getAttribute('data-title') || '';
    if(!q || title.indexOf(q) !== -1){
      c.style.display = '';
    } else {
      c.style.display = 'none';
    }
  });
}
</script>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reelcase-library-${new Date().toISOString().slice(0, 10)}.html`;
        a.click();
        URL.revokeObjectURL(url);
        notify('Library exported as interactive HTML!', 'success');
    }, [watchlist]);

    // Export raw JSON backup
    const exportJsonBackup = useCallback(() => {
        setShowExportMenu(false);
        const payload = {
            version: 1,
            exportedAt: new Date().toISOString(),
            movies: watchlist.movies,
            series: watchlist.series
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reelcase-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        notify('Library backup exported as JSON!', 'success');
    }, [watchlist]);

    // Import JSON backup
    const handleFileImport = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const parsed = JSON.parse(event.target?.result);
                await importWatchlist(parsed);
            } catch {
                notify('Invalid JSON backup file.', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }, [importWatchlist]);

    // Sorting algorithm
    const sortItems = useCallback((items) => {
        const arr = [...items];
        if (sortBy === 'title_asc') {
            arr.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        } else if (sortBy === 'title_desc') {
            arr.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
        } else if (sortBy === 'newest' || sortBy === 'oldest') {
            const yearOf = (i) => parseInt(String(i.year || i.release_date || i.first_air_date || '0').slice(0, 4)) || 0;
            arr.sort((a, b) => sortBy === 'newest' ? yearOf(b) - yearOf(a) : yearOf(a) - yearOf(b));
        } else if (sortBy === 'rating') {
            arr.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
        }
        return arr;
    }, [sortBy]);

    // In-library text search filter
    const applyLibrarySearch = useCallback((items) => {
        if (!librarySearch.trim()) return items;
        const q = librarySearch.trim().toLowerCase();
        return items.filter(i => {
            const titleMatch = (i.title || '').toLowerCase().includes(q);
            const yearMatch = String(i.year || i.release_date || i.first_air_date || '').includes(q);
            return titleMatch || yearMatch;
        });
    }, [librarySearch]);

    // Categorization
    const { 
        watchingSeries, 
        planToWatchSeries, 
        completedSeries, 
        favoriteSeries,
        unwatchedMovies, 
        watchedMovies,
        favoriteMovies
    } = useMemo(() => {
        const watching = [];
        const plan = [];
        const completed = [];
        const favSeries = [];

        for (const s of watchlist.series) {
            if (s.favorite) favSeries.push(s);
            if (s.watched === true || s.status === 'completed') completed.push(s);
            else if (s.status === 'watching' || (s.currentEpisode && s.currentEpisode > 0)) watching.push(s);
            else plan.push(s);
        }

        const unwatched = [];
        const watched = [];
        const favMovies = [];

        for (const m of watchlist.movies) {
            if (m.favorite) favMovies.push(m);
            if (m.watched) watched.push(m);
            else unwatched.push(m);
        }

        const processList = (arr) => sortItems(applyLibrarySearch(arr));

        return { 
            watchingSeries: processList(watching), 
            planToWatchSeries: processList(plan), 
            completedSeries: processList(completed), 
            favoriteSeries: processList(favSeries),
            unwatchedMovies: processList(unwatched), 
            watchedMovies: processList(watched),
            favoriteMovies: processList(favMovies)
        };
    }, [watchlist, sortItems, applyLibrarySearch]);

    return (
        <div className="container">
            <Header 
                setShowAuthModal={openAuthModal} 
                isDarkMode={isDarkMode} 
                setIsDarkMode={setIsDarkMode} 
            />

            <SearchBar onSelect={handleSelectSearchItem} />

            {user && activeTab !== 'discover' && (
                <StatsBar
                    movies={watchlist.movies}
                    series={watchlist.series}
                />
            )}

            {/* Desktop Navigation Tabs */}
            <div className="tabs desktop-only" role="tablist" aria-label="Library sections">
                <button 
                    role="tab"
                    aria-selected={activeTab === 'movies'}
                    className={`tab-button ${activeTab === 'movies' ? 'active' : ''}`}
                    onClick={() => setActiveTab('movies')}
                >
                    <Film size={17} /> 
                    <span>Movies ({watchlist.movies.length})</span>
                </button>
                <button 
                    role="tab"
                    aria-selected={activeTab === 'series'}
                    className={`tab-button ${activeTab === 'series' ? 'active' : ''}`}
                    onClick={() => setActiveTab('series')}
                >
                    <Tv size={17} /> 
                    <span>Series ({watchlist.series.length})</span>
                </button>
                <button 
                    role="tab"
                    aria-selected={activeTab === 'discover'}
                    className={`tab-button ${activeTab === 'discover' ? 'active' : ''}`}
                    onClick={() => setActiveTab('discover')}
                >
                    <Compass size={17} /> 
                    <span>Discover</span>
                </button>
            </div>

            <main>
                {!user ? (
                    <div className="auth-prompt">
                        <div className="auth-prompt-badge">
                            <Sparkles size={18} />
                            <span>Your Personal Entertainment Tracker</span>
                        </div>
                        <h2>Track movies, binge smarter, and stay synced everywhere.</h2>
                        <p className="auth-prompt-description">
                            Reelcase tracks your movies, remembers exact season and episode progress across devices, and shows you where titles are streaming.
                        </p>
                        
                        <div className="auth-prompt-features">
                            <div className="feature-pill"><Check size={14} /> Real-time Cloud Sync</div>
                            <div className="feature-pill"><Check size={14} /> 1-Click Episode Stepper</div>
                            <div className="feature-pill"><Check size={14} /> OTT Where-to-Watch</div>
                            <div className="feature-pill"><Check size={14} /> Offline HTML Export</div>
                        </div>

                        <button className="auth-btn email-btn auth-hero-btn" onClick={openAuthModal}>
                            Sign In / Join Reelcase
                        </button>
                    </div>
                ) : (
                    <>
                        {/* MOVIES TAB */}
                        <div className={`bucket-list ${activeTab === 'movies' ? 'active' : ''}`}>
                            {watchlist.movies.length > 0 && (
                                <div className="toolbar-row">
                                    <div className="sub-filters-container">
                                        <button 
                                            className={`sub-filter-pill ${moviesFilter === 'all' ? 'active' : ''}`}
                                            onClick={() => setMoviesFilter('all')}
                                        >
                                            All ({watchlist.movies.length})
                                        </button>
                                        <button 
                                            className={`sub-filter-pill ${moviesFilter === 'unwatched' ? 'active' : ''}`}
                                            onClick={() => setMoviesFilter('unwatched')}
                                        >
                                            To Watch ({unwatchedMovies.length})
                                        </button>
                                        <button 
                                            className={`sub-filter-pill ${moviesFilter === 'watched' ? 'active' : ''}`}
                                            onClick={() => setMoviesFilter('watched')}
                                        >
                                            Watched ({watchedMovies.length})
                                        </button>
                                        <button 
                                            className={`sub-filter-pill fav-pill ${moviesFilter === 'favorites' ? 'active' : ''}`}
                                            onClick={() => setMoviesFilter('favorites')}
                                        >
                                            <Heart size={13} fill={moviesFilter === 'favorites' ? "currentColor" : "none"} />
                                            Favorites ({favoriteMovies.length})
                                        </button>
                                    </div>

                                    <div className="toolbar-actions">
                                        {/* In-Library Search Input */}
                                        <div className="library-search-wrap">
                                            <SearchIcon size={14} className="lib-search-icon" />
                                            <input 
                                                type="text" 
                                                placeholder="Filter movies..." 
                                                value={librarySearch}
                                                onChange={e => setLibrarySearch(e.target.value)}
                                                className="library-search-input"
                                            />
                                            {librarySearch && (
                                                <button 
                                                    type="button" 
                                                    className="clear-lib-search" 
                                                    onClick={() => setLibrarySearch('')}
                                                    aria-label="Clear filter"
                                                >
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>

                                        <select 
                                            className="sort-select" 
                                            value={sortBy} 
                                            onChange={(e) => setSortBy(e.target.value)} 
                                            aria-label="Sort movies"
                                        >
                                            <option value="added">Recently Added</option>
                                            <option value="title_asc">Title A &rarr; Z</option>
                                            <option value="title_desc">Title Z &rarr; A</option>
                                            <option value="newest">Release: Newest</option>
                                            <option value="oldest">Release: Oldest</option>
                                            <option value="rating">TMDb Rating</option>
                                        </select>

                                        {/* Export & Import Dropdown */}
                                        <div className="export-menu-container">
                                            <button 
                                                className="toolbar-btn" 
                                                onClick={() => setShowExportMenu(!showExportMenu)}
                                                title="Backup, export, or import library"
                                            >
                                                <SlidersHorizontal size={14} /> Portability
                                            </button>

                                            {showExportMenu && (
                                                <div className="export-dropdown-menu">
                                                    <button type="button" onClick={exportInteractiveHtml}>
                                                        <FileCode size={14} /> Export Interactive HTML
                                                    </button>
                                                    <button type="button" onClick={exportJsonBackup}>
                                                        <FileJson size={14} /> Export JSON Backup
                                                    </button>
                                                    <button type="button" onClick={() => fileInputRef.current?.click()}>
                                                        <Upload size={14} /> Restore from JSON
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {watchlist.movies.length === 0 ? (
                                <div className="list-category empty-library-view">
                                    <Film size={40} className="empty-cat-icon" />
                                    <h2>Your Movie Library is Empty</h2>
                                    <p className="empty-msg">Search above to add movies or explore what's trending in Discover!</p>
                                    <button className="auth-btn email-btn inline-btn" onClick={() => setActiveTab('discover')}>
                                        <Compass size={16} /> Explore Discover
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {moviesFilter === 'favorites' && (
                                        <div className="list-category">
                                            <h2>Favorite Movies ({favoriteMovies.length})</h2>
                                            {favoriteMovies.length === 0 ? (
                                                <p className="empty-msg">No favorite movies marked yet. Tap the heart icon on any card!</p>
                                            ) : (
                                                <div className="item-grid">
                                                    {favoriteMovies.map(movie => (
                                                        <GridItem key={movie.id} item={movie} type="movie" onClick={handleGridItemClick} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {(moviesFilter === 'all' || moviesFilter === 'unwatched') && (
                                        <div className="list-category">
                                            <h2>To Watch ({unwatchedMovies.length})</h2>
                                            {unwatchedMovies.length === 0 ? (
                                                <p className="empty-msg">
                                                    {librarySearch ? `No unwatched movies matching "${librarySearch}"` : 'No unwatched movies in your list.'}
                                                </p>
                                            ) : (
                                                <div className="item-grid">
                                                    {unwatchedMovies.map(movie => (
                                                        <GridItem key={movie.id} item={movie} type="movie" onClick={handleGridItemClick} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {(moviesFilter === 'all' || moviesFilter === 'watched') && (
                                        <div className="list-category">
                                            <h2>Watched Movies ({watchedMovies.length})</h2>
                                            {watchedMovies.length === 0 ? (
                                                <p className="empty-msg">
                                                    {librarySearch ? `No watched movies matching "${librarySearch}"` : 'No watched movies yet.'}
                                                </p>
                                            ) : (
                                                <div className="item-grid">
                                                    {watchedMovies.map(movie => (
                                                        <GridItem key={movie.id} item={movie} type="movie" onClick={handleGridItemClick} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* SERIES TAB */}
                        <div className={`bucket-list ${activeTab === 'series' ? 'active' : ''}`}>
                            {watchlist.series.length > 0 && (
                                <div className="toolbar-row">
                                    <div className="sub-filters-container">
                                        <button 
                                            className={`sub-filter-pill ${seriesFilter === 'all' ? 'active' : ''}`}
                                            onClick={() => setSeriesFilter('all')}
                                        >
                                            All ({watchlist.series.length})
                                        </button>
                                        <button 
                                            className={`sub-filter-pill highlight ${seriesFilter === 'watching' ? 'active' : ''}`}
                                            onClick={() => setSeriesFilter('watching')}
                                        >
                                            <PlayCircle size={14} />
                                            Watching ({watchingSeries.length})
                                        </button>
                                        <button 
                                            className={`sub-filter-pill ${seriesFilter === 'plan' ? 'active' : ''}`}
                                            onClick={() => setSeriesFilter('plan')}
                                        >
                                            <Clock size={14} />
                                            Plan ({planToWatchSeries.length})
                                        </button>
                                        <button 
                                            className={`sub-filter-pill ${seriesFilter === 'completed' ? 'active' : ''}`}
                                            onClick={() => setSeriesFilter('completed')}
                                        >
                                            <CheckCircle2 size={14} />
                                            Done ({completedSeries.length})
                                        </button>
                                        <button 
                                            className={`sub-filter-pill fav-pill ${seriesFilter === 'favorites' ? 'active' : ''}`}
                                            onClick={() => setSeriesFilter('favorites')}
                                        >
                                            <Heart size={13} fill={seriesFilter === 'favorites' ? "currentColor" : "none"} />
                                            Favorites ({favoriteSeries.length})
                                        </button>
                                    </div>

                                    <div className="toolbar-actions">
                                        {/* In-Library Search Input */}
                                        <div className="library-search-wrap">
                                            <SearchIcon size={14} className="lib-search-icon" />
                                            <input 
                                                type="text" 
                                                placeholder="Filter series..." 
                                                value={librarySearch}
                                                onChange={e => setLibrarySearch(e.target.value)}
                                                className="library-search-input"
                                            />
                                            {librarySearch && (
                                                <button 
                                                    type="button" 
                                                    className="clear-lib-search" 
                                                    onClick={() => setLibrarySearch('')}
                                                    aria-label="Clear filter"
                                                >
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>

                                        <select 
                                            className="sort-select" 
                                            value={sortBy} 
                                            onChange={(e) => setSortBy(e.target.value)} 
                                            aria-label="Sort series"
                                        >
                                            <option value="added">Recently Added</option>
                                            <option value="title_asc">Title A &rarr; Z</option>
                                            <option value="title_desc">Title Z &rarr; A</option>
                                            <option value="newest">Release: Newest</option>
                                            <option value="oldest">Release: Oldest</option>
                                            <option value="rating">TMDb Rating</option>
                                        </select>

                                        {/* Export & Import Dropdown */}
                                        <div className="export-menu-container">
                                            <button 
                                                className="toolbar-btn" 
                                                onClick={() => setShowExportMenu(!showExportMenu)}
                                                title="Backup, export, or import library"
                                            >
                                                <SlidersHorizontal size={14} /> Portability
                                            </button>

                                            {showExportMenu && (
                                                <div className="export-dropdown-menu">
                                                    <button type="button" onClick={exportInteractiveHtml}>
                                                        <FileCode size={14} /> Export Interactive HTML
                                                    </button>
                                                    <button type="button" onClick={exportJsonBackup}>
                                                        <FileJson size={14} /> Export JSON Backup
                                                    </button>
                                                    <button type="button" onClick={() => fileInputRef.current?.click()}>
                                                        <Upload size={14} /> Restore from JSON
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {watchlist.series.length === 0 ? (
                                <div className="list-category empty-library-view">
                                    <Tv size={40} className="empty-cat-icon" />
                                    <h2>Your TV Series Tracker is Empty</h2>
                                    <p className="empty-msg">Search above to track your favorite series and episodes!</p>
                                    <button className="auth-btn email-btn inline-btn" onClick={() => setActiveTab('discover')}>
                                        <Compass size={16} /> Explore Discover
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* FAVORITES */}
                                    {seriesFilter === 'favorites' && (
                                        <div className="list-category">
                                            <h2>Favorite TV Series ({favoriteSeries.length})</h2>
                                            {favoriteSeries.length === 0 ? (
                                                <p className="empty-msg">No favorite series marked yet. Tap the heart icon on any card!</p>
                                            ) : (
                                                <div className="watching-cards-grid">
                                                    {favoriteSeries.map(series => (
                                                        <SeriesProgressCard 
                                                            key={series.id} 
                                                            item={series} 
                                                            onClick={handleGridItemClick} 
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 1. CURRENTLY WATCHING SECTION */}
                                    {(seriesFilter === 'all' || seriesFilter === 'watching') && (
                                        <div className="list-category watching-category-section">
                                            <div className="category-header-with-badge">
                                                <div className="category-title-wrap">
                                                    <PlayCircle className="category-icon play-icon-glow" size={24} />
                                                    <h2>Currently Watching</h2>
                                                </div>
                                                <span className="count-badge glow">{watchingSeries.length} active</span>
                                            </div>

                                            {watchingSeries.length === 0 ? (
                                                <div className="empty-watching-box">
                                                    <Sparkles size={28} className="empty-icon" />
                                                    <p>You're not currently tracking any series episodes.</p>
                                                    <span className="empty-hint">Open any series or click "Watching" in Plan to Watch to start tracking!</span>
                                                </div>
                                            ) : (
                                                <div className="watching-cards-grid">
                                                    {watchingSeries.map(series => (
                                                        <SeriesProgressCard 
                                                            key={series.id} 
                                                            item={series} 
                                                            onClick={handleGridItemClick} 
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 2. PLAN TO WATCH SECTION */}
                                    {(seriesFilter === 'all' || seriesFilter === 'plan') && (
                                        <div className="list-category">
                                            <div className="category-header-with-badge">
                                                <div className="category-title-wrap">
                                                    <Clock className="category-icon" size={22} />
                                                    <h2>Plan to Watch</h2>
                                                </div>
                                                <span className="count-badge">{planToWatchSeries.length}</span>
                                            </div>

                                            {planToWatchSeries.length === 0 ? (
                                                <p className="empty-msg">No series in your plan-to-watch queue.</p>
                                            ) : (
                                                <div className="item-grid">
                                                    {planToWatchSeries.map(series => (
                                                        <GridItem key={series.id} item={series} type="series" onClick={handleGridItemClick} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 3. COMPLETED SECTION */}
                                    {(seriesFilter === 'all' || seriesFilter === 'completed') && (
                                        <div className="list-category">
                                            <div className="category-header-with-badge">
                                                <div className="category-title-wrap">
                                                    <CheckCircle2 className="category-icon completed-icon" size={22} />
                                                    <h2>Completed Series</h2>
                                                </div>
                                                <span className="count-badge">{completedSeries.length}</span>
                                            </div>

                                            {completedSeries.length === 0 ? (
                                                <p className="empty-msg">No completed series yet.</p>
                                            ) : (
                                                <div className="item-grid">
                                                    {completedSeries.map(series => (
                                                        <GridItem key={series.id} item={series} type="series" onClick={handleGridItemClick} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* DISCOVER TAB */}
                        <div className={`bucket-list ${activeTab === 'discover' ? 'active' : ''}`}>
                            {activeTab === 'discover' && <DiscoverRow onSelect={handleSelectSearchItem} />}
                        </div>
                    </>
                )}
            </main>

            {/* Hidden File Input for JSON Backup Import */}
            <input 
                ref={fileInputRef}
                type="file" 
                accept=".json" 
                style={{ display: 'none' }} 
                onChange={handleFileImport}
            />

            <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
            <Toaster />
            
            <DetailModal show={showDetailModal} data={detailData} type={detailType} onClose={handleCloseDetail} />
            <Suspense fallback={null}>
                <AuthModal show={showAuthModal} onClose={handleCloseAuth} />
                
                <ConfirmModal 
                    show={deleteModalState?.show}
                    item={deleteModalState?.item}
                    type={deleteModalState?.type}
                    onConfirm={confirmDelete}
                    onCancel={cancelDelete}
                />
            </Suspense>
        </div>
    );
}

export default App;
