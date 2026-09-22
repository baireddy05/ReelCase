import React, { memo } from 'react';
import { getPosterUrl, handleImageError, getYear } from '../services/tmdb';
import { useWatchlist, calculateSeriesProgress } from '../contexts/WatchlistContext';
import { Eye, Trash2, CheckCircle2 } from 'lucide-react';

const GridItem = memo(({ item, type, onClick }) => {
    const { requestDelete, toggleWatched } = useWatchlist();

    const handleRemove = (e) => {
        e.stopPropagation();
        requestDelete(item, type);
    };

    const handleToggleWatched = (e) => {
        e.stopPropagation();
        toggleWatched(item.id, type);
    };

    const isSeries = type === 'series';
    const progress = isSeries ? calculateSeriesProgress(item) : null;
    const yearDisplay = getYear(item);

    return (
        <div className={`grid-item ${item.watched ? 'item-watched' : ''}`}>
            <a className="poster-link" onClick={() => onClick(item, type)}>
                <img 
                    src={getPosterUrl(item, 'w200')} 
                    alt={item.title || ''} 
                    loading="lazy" 
                    decoding="async"
                    onError={handleImageError}
                />
                {isSeries && item.watched && (
                    <div className="grid-item-badge completed-badge">
                        <CheckCircle2 size={12} /> Completed
                    </div>
                )}
                {isSeries && !item.watched && item.currentEpisode > 0 && (
                    <div className="grid-item-badge progress-badge">
                        S{item.currentSeason || 1}:E{item.currentEpisode} ({progress?.percentage}%)
                    </div>
                )}
            </a>
            <div className="item-content">
                <div>
                    <div className="item-title" title={item.title}>{item.title}</div>
                    <div className="item-year">
                        {yearDisplay ? yearDisplay : 'N/A'}
                        {isSeries && item.total_seasons ? ` • ${item.total_seasons} ${item.total_seasons === 1 ? 'season' : 'seasons'}` : ''}
                    </div>
                </div>
                <div className="item-actions">
                    <button 
                        className={`action-btn toggle-watched ${item.watched ? 'watched' : ''}`}
                        title={item.watched ? "Mark as unwatched" : "Mark as watched"}
                        onClick={handleToggleWatched}
                    >
                        <Eye size={18} />
                    </button>
                    <button 
                        className="action-btn remove" 
                        title="Remove"
                        onClick={handleRemove}
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
});

GridItem.displayName = 'GridItem';

export default GridItem;

