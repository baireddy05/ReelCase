import React from 'react';
import { Film, Tv, Compass } from 'lucide-react';
import { useWatchlist } from '../contexts/WatchlistContext';

const BottomNav = ({ activeTab, setActiveTab }) => {
    const { watchlist } = useWatchlist();

    return (
        <nav className="bottom-nav mobile-only" aria-label="Mobile Navigation">
            <button 
                type="button"
                className={`nav-item ${activeTab === 'movies' ? 'active' : ''}`}
                onClick={() => setActiveTab('movies')}
                aria-selected={activeTab === 'movies'}
            >
                <div className="nav-icon-wrap">
                    <Film size={20} />
                    {watchlist.movies.length > 0 && (
                        <span className="nav-badge">{watchlist.movies.length}</span>
                    )}
                </div>
                <span>Movies</span>
            </button>
            <button 
                type="button"
                className={`nav-item ${activeTab === 'series' ? 'active' : ''}`}
                onClick={() => setActiveTab('series')}
                aria-selected={activeTab === 'series'}
            >
                <div className="nav-icon-wrap">
                    <Tv size={20} />
                    {watchlist.series.length > 0 && (
                        <span className="nav-badge">{watchlist.series.length}</span>
                    )}
                </div>
                <span>Series</span>
            </button>
            <button 
                type="button"
                className={`nav-item ${activeTab === 'discover' ? 'active' : ''}`}
                onClick={() => setActiveTab('discover')}
                aria-selected={activeTab === 'discover'}
            >
                <div className="nav-icon-wrap">
                    <Compass size={20} />
                </div>
                <span>Discover</span>
            </button>
        </nav>
    );
};

export default BottomNav;
