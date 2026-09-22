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
import { PlayCircle, Clock, CheckCircle2, Film, Tv, Sparkles, Compass } from 'lucide-react';

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
        localStorage.getItem('isDarkMode') === 'true'
    );
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [detailData, setDetailData] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    useEffect(() => {
        localStorage.setItem('isDarkMode', isDarkMode);
    }, [isDarkMode]);

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
        return { watchingSeries: watching, planToWatchSeries: plan, completedSeries: completed, unwatchedMovies: unwatched, watchedMovies: watched };
    }, [watchlist]);

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

