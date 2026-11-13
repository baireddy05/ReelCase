import React, { memo } from 'react';
import { getPosterUrl, handleImageError, getYear } from '../services/tmdb';
import { useWatchlist } from '../contexts/WatchlistContext';
import { calculateSeriesProgress } from '../utils/seriesProgress';
import { Eye, Trash2, CheckCircle2, Heart, Star, Check } from 'lucide-react';

const GridItem = memo(({ item, type, onClick }) => {
    const { requestDelete, toggleWatched, toggleFavorite } = useWatchlist();

    const handleRemove = (e) => {
        e.stopPropagation();
        requestDelete(item, type);
    };

    const handleToggleWatched = (e) => {
        e.stopPropagation();
        toggleWatched(item.id, type);
    };

    const handleToggleFav = (e) => {
        e.stopPropagation();
        toggleFavorite(item.id, type);
    };

    const isSeries = type === 'series';
    const progress = isSeries ? calculateSeriesProgress(item) : null;
    const yearDisplay = getYear(item);
    const rating = item.vote_average ? Number(item.vote_average).toFixed(1) : null;

    return (
        <div className={`grid-item ${item.watched ? 'item-watched' : ''} ${item.favorite ? 'is-fav' : ''}`}>
            <div className="poster-link" onClick={() => onClick(item, type)} role="button" tabIndex={0}>
                <img 
                    src={getPosterUrl(item, 'w500')} 
                    alt={item.title || ''} 
                    loading="lazy" 
                    decoding="async"
                    onError={handleImageError}
                />
                
                <button 
                    type="button" 
                    className={`grid-fav-btn ${item.favorite ? 'active' : ''}`}
                    onClick={handleToggleFav}
                    title={item.favorite ? "Favorited" : "Add to favorites"}
                    aria-label="Toggle favorite"
                >
                    <Heart size={14} fill={item.favorite ? "currentColor" : "none"} />
                </button>

                {rating && (
                    <div className="grid-rating-badge">
                        <Star size={10} fill="currentColor" /> {rating}
                    </div>
                )}

                {/* Badges */}
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
                {!isSeries && item.watched && (
                    <div className="grid-item-badge watched-badge">
                        <Check size={12} /> Watched
                    </div>
                )}

                <div className="grid-hover-overlay">
                    <span>View Info</span>
                </div>
            </div>

            <div className="item-content">
                <div className="item-details" onClick={() => onClick(item, type)}>
                    <div className="item-title" title={item.title}>{item.title}</div>
                    <div className="item-year">
                        {yearDisplay ? yearDisplay : 'N/A'}
                        {isSeries && item.total_seasons ? ` &bull; ${item.total_seasons} ${item.total_seasons === 1 ? 'season' : 'seasons'}` : ''}
                        {!isSeries && item.runtime ? ` &bull; ${item.runtime}m` : ''}
                    </div>
                </div>

                <div className="item-actions">
                    <button 
                        type="button"
                        className={`action-btn toggle-watched ${item.watched ? 'watched' : ''}`}
                        title={item.watched ? "Mark as unwatched" : "Mark as watched"}
                        onClick={handleToggleWatched}
                        aria-label={item.watched ? "Mark unwatched" : "Mark watched"}
                    >
                        <Eye size={16} />
                    </button>
                    <button 
                        type="button"
                        className="action-btn remove" 
                        title="Remove from library"
                        onClick={handleRemove}
                        aria-label="Remove item"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
});

GridItem.displayName = 'GridItem';

export default GridItem;
