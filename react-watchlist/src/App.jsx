import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import SearchBar from './components/SearchBar';
import GridItem from './components/GridItem';
import SeriesProgressCard from './components/SeriesProgressCard';
import StatsBar from './components/StatsBar';
import DiscoverRow from './components/DiscoverRow';
import Toaster from './components/Toaster';
import { useAuth } from './contexts/AuthContext';
import { useWatchlist } from './contexts/WatchlistContext';
import { tmdb } from './services/tmdb';
import { PlayCircle, Clock, CheckCircle2, Film, Tv, Sparkles, Compass, Download } from 'lucide-react';

const AuthModal = lazy(() => import('./components/modals/AuthModal'));
const DetailModal = lazy(() => import('./components/modals/DetailModal'));
const ConfirmModal = lazy(() => import('./components/modals/ConfirmModal'));

function App() {
    const { user } = useAuth();
    const { watchlist, deleteModalState, cancelDelete, confirmDelete } = useWatchlist();
    const [activeTab, setActiveTab] = useState('movies');
    const [seriesFilter, setSeriesFilter] = useState('all'); // 'all' | 'watching' | 'plan' | 'completed'
    const [moviesFilter, setMoviesFilter] = useState('all'); // 'all' | 'unwatched' | 'watched'
    const [isDarkMode, setIsDarkMode] = useState(
        () => localStorage.getItem('isDarkMode') !== 'false'
    );
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [detailData, setDetailData] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [sortBy, setSortBy] = useState('added'); // added | title | newest | oldest

    useEffect(() => {
        localStorage.setItem('isDarkMode', isDarkMode);
    }, [isDarkMode]);

    // Press "/" to jump to search
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

    // Handle History API for Modals
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

    const handleSelectSearchItem = useCallback(async (id, type) => {
        const data = await tmdb.getDetails(id, type);
        if (!data) return;
        setDetailData(data);
        setShowDetailModal(true);
        history.pushState({ modal: 'detail' }, '');
    }, []);

    const handleGridItemClick = useCallback(async (item, forcedType) => {
        const type = forcedType || 'movie';
        const data = await tmdb.getDetails(item.id, type);
        if (!data) return;
        setDetailData(data);
        setShowDetailModal(true);
        history.pushState({ modal: 'detail' }, '');
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

    const exportLibrary = useCallback(() => {
        const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        const yearOf = (i) => String(i.year || i.release_date || i.first_air_date || '').slice(0, 4);
        const posterOf = (i) => {
            const p = i.poster_path || i.poster || '';
            if (!p) return '';
            const path = String(p).startsWith('http') ? p : `https://image.tmdb.org/t/p/w200${String(p).startsWith('/') ? p : '/' + p}`;
            return path;
        };
        const card = (i, extra = '') => `
            <div class="card">
                ${posterOf(i) ? `<img loading="lazy" src="${posterOf(i)}" alt="">` : `<div class="noimg">Reelcase</div>`}
                <div class="t">${esc(i.title || 'Untitled')}</div>
                <div class="y">${esc(yearOf(i))}${extra ? ` &bull; ${esc(extra)}` : ''}</div>
            </div>`;
        const seriesExtra = (s) => s.watched ? 'Completed' : (s.currentEpisode > 0 ? `S${s.currentSeason || 1} E${s.currentEpisode}` : 'Plan to watch');
        const section = (title, inner) => inner ? `<h2>${title}</h2><div class="grid">${inner}</div>` : '';

        const movies = watchlist.movies;
        const series = watchlist.series;
        const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reelcase Library</title>
<style>
body{font-family:Inter,-apple-system,'Segoe UI',Roboto,sans-serif;margin:0;background:#fafafa;color:#1a1a1a}
.wrap{max-width:1000px;margin:0 auto;padding:32px 20px}
h1{font-size:1.8rem;letter-spacing:-.02em;margin:0}
.sub{color:#737373;font-size:.9rem;margin:6px 0 24px}
h2{font-size:1.15rem;margin:28px 0 12px;padding-bottom:6px;border-bottom:1px solid #e5e5e5}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:14px}
.card{background:#fff;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden}
.card img{width:100%;aspect-ratio:2/3;object-fit:cover;display:block}
.noimg{aspect-ratio:2/3;display:flex;align-items:center;justify-content:center;color:#a3a3a3;font-size:.8rem;background:#f5f5f5}
.t{font-size:.82rem;font-weight:700;padding:8px 8px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.y{font-size:.74rem;color:#737373;padding:2px 8px 10px}
@media(prefers-color-scheme:dark){body{background:#0a0a0a;color:#e5e5e5}.card{background:#141414;border-color:#262626}.noimg{background:#1a1a1a}h2{border-color:#262626}.sub{color:#a3a3a3}.y{color:#a3a3a3}}
</style></head><body><div class="wrap">
<h1>Reelcase Library</h1>
<p class="sub">${movies.length} movies &bull; ${series.length} series &bull; exported ${new Date().toLocaleDateString()}</p>
${section(`Movies to Watch (${movies.filter(m => !m.watched).length})`, movies.filter(m => !m.watched).map(m => card(m)).join(''))}
${section(`Watched Movies (${movies.filter(m => m.watched).length})`, movies.filter(m => m.watched).map(m => card(m)).join(''))}
${section(`Currently Watching (${series.filter(s => !s.watched && (s.status === 'watching' || s.currentEpisode > 0)).length})`, series.filter(s => !s.watched && (s.status === 'watching' || s.currentEpisode > 0)).map(s => card(s, seriesExtra(s))).join(''))}
${section(`Plan to Watch (${series.filter(s => !s.watched && s.status !== 'watching' && !s.currentEpisode).length})`, series.filter(s => !s.watched && s.status !== 'watching' && !s.currentEpisode).map(s => card(s, seriesExtra(s))).join(''))}
${section(`Completed Series (${series.filter(s => s.watched || s.status === 'completed').length})`, series.filter(s => s.watched || s.status === 'completed').map(s => card(s, seriesExtra(s))).join(''))}
</div></body></html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reelcase-library.html';
        a.click();
        URL.revokeObjectURL(url);
    }, [watchlist]);

    const sortItems = useCallback((items) => {
        const arr = [...items];
        if (sortBy === 'title') arr.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        else if (sortBy === 'newest' || sortBy === 'oldest') {
            const yearOf = (i) => parseInt(String(i.year || i.release_date || i.first_air_date || '0').slice(0, 4)) || 0;
            arr.sort((a, b) => sortBy === 'newest' ? yearOf(b) - yearOf(a) : yearOf(a) - yearOf(b));
        }
        return arr;
    }, [sortBy]);

    // Series categorization (mutually exclusive, memoized: single O(n) pass each)
    const { watchingSeries, planToWatchSeries, completedSeries, unwatchedMovies, watchedMovies } = useMemo(() => {
        const watching = [];
        const plan = [];
        const completed = [];
        for (const s of watchlist.series) {
            if (s.watched === true || s.status === 'completed') completed.push(s);
            else if (s.status === 'watching' || (s.currentEpisode && s.currentEpisode > 0)) watching.push(s);
            else plan.push(s);
        }
        const unwatched = [];
        const watched = [];
        for (const m of watchlist.movies) {
            if (m.watched) watched.push(m);
            else unwatched.push(m);
        }
        const sort = (arr) => sortItems(arr);
        return { watchingSeries: sort(watching), planToWatchSeries: sort(plan), completedSeries: sort(completed), unwatchedMovies: sort(unwatched), watchedMovies: sort(watched) };
    }, [watchlist, sortItems]);

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
                    watchingCount={watchingSeries.length}
                    completedCount={completedSeries.length}
                />
            )}

            <div className="tabs desktop-only" role="tablist" aria-label="Library sections">
                <button 
                    role="tab"
                    aria-selected={activeTab === 'movies'}
                    className={`tab-button ${activeTab === 'movies' ? 'active' : ''}`}
                    onClick={() => setActiveTab('movies')}
                >
                    <Film size={18} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} /> Movies ({watchlist.movies.length})
                </button>
                <button 
                    role="tab"
                    aria-selected={activeTab === 'series'}
                    className={`tab-button ${activeTab === 'series' ? 'active' : ''}`}
                    onClick={() => setActiveTab('series')}
                >
                    <Tv size={18} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} /> Series ({watchlist.series.length})
                </button>
                <button 
                    role="tab"
                    aria-selected={activeTab === 'discover'}
                    className={`tab-button ${activeTab === 'discover' ? 'active' : ''}`}
                    onClick={() => setActiveTab('discover')}
                >
                    <Compass size={18} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} /> Discover
                </button>
            </div>

            <main>
                {!user ? (
                    <div className="auth-prompt">
                        <img src="/logo.svg" alt="Reelcase logo" className="auth-prompt-logo" width={72} height={72} />
                        <h2>Welcome to Reelcase</h2>
                        <p className="empty-hint">Please login to view your watchlist</p>
                        <button className="auth-btn email-btn" onClick={openAuthModal}>
                            Login
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
                                </div>
                                <div className="toolbar-actions">
                                    <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort items">
                                        <option value="added">Recently added</option>
                                        <option value="title">Title A–Z</option>
                                        <option value="newest">Newest</option>
                                        <option value="oldest">Oldest</option>
                                    </select>
                                    <button className="toolbar-btn" onClick={exportLibrary} title="Export library as a styled HTML page">
                                        <Download size={15} /> Export
                                    </button>
                                </div>
                                </div>
                            )}

                            {watchlist.movies.length === 0 ? (
                                <div className="list-category">
                                    <h2>Your Movies</h2>
                                    <p className="empty-msg">No movies in your list yet. Start searching above!</p>
                                </div>
                            ) : (
                                <>
                                    {(moviesFilter === 'all' || moviesFilter === 'unwatched') && (
                                        <div className="list-category">
                                            <h2>To Watch ({unwatchedMovies.length})</h2>
                                            {unwatchedMovies.length === 0 ? (
                                                <p className="empty-msg">No unwatched movies.</p>
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
                                                <p className="empty-msg">No watched movies yet.</p>
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
                                        All Series ({watchlist.series.length})
                                    </button>
                                    <button 
                                        className={`sub-filter-pill highlight ${seriesFilter === 'watching' ? 'active' : ''}`}
                                        onClick={() => setSeriesFilter('watching')}
                                    >
                                        <PlayCircle size={15} style={{ verticalAlign: 'text-bottom', marginRight: '4px' }} />
                                        Currently Watching ({watchingSeries.length})
                                    </button>
                                    <button 
                                        className={`sub-filter-pill ${seriesFilter === 'plan' ? 'active' : ''}`}
                                        onClick={() => setSeriesFilter('plan')}
                                    >
                                        <Clock size={15} style={{ verticalAlign: 'text-bottom', marginRight: '4px' }} />
                                        Plan to Watch ({planToWatchSeries.length})
                                    </button>
                                    <button 
                                        className={`sub-filter-pill ${seriesFilter === 'completed' ? 'active' : ''}`}
                                        onClick={() => setSeriesFilter('completed')}
                                    >
                                        <CheckCircle2 size={15} style={{ verticalAlign: 'text-bottom', marginRight: '4px' }} />
                                        Completed ({completedSeries.length})
                                    </button>
                                </div>
                                <div className="toolbar-actions">
                                    <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort items">
                                        <option value="added">Recently added</option>
                                        <option value="title">Title A–Z</option>
                                        <option value="newest">Newest</option>
                                        <option value="oldest">Oldest</option>
                                    </select>
                                    <button className="toolbar-btn" onClick={exportLibrary} title="Export library as a styled HTML page">
                                        <Download size={15} /> Export
                                    </button>
                                </div>
                                </div>
                            )}

                            {watchlist.series.length === 0 ? (
                                <div className="list-category">
                                    <h2>Your Series</h2>
                                    <p className="empty-msg">No series in your list yet. Start searching above!</p>
                                </div>
                            ) : (
                                <>
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
                                                    <p>You're not currently tracking any series.</p>
                                                    <span className="empty-hint">Open any series to update and track your episode progress!</span>
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

                        {/* DISCOVER TAB — trending, fetched only when opened */}
                        <div className={`bucket-list ${activeTab === 'discover' ? 'active' : ''}`}>
                            {activeTab === 'discover' && <DiscoverRow onSelect={handleSelectSearchItem} />}
                        </div>
                    </>
                )}
            </main>

            <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
            <Toaster />
            
            <Suspense fallback={null}>
                <AuthModal show={showAuthModal} onClose={handleCloseAuth} />
                <DetailModal show={showDetailModal} data={detailData} onClose={handleCloseDetail} />
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

