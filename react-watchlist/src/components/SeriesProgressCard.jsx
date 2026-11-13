import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { tmdb, getPosterUrl, handleImageError, getYear } from '../services/tmdb';
import { useWatchlist } from '../contexts/WatchlistContext';
import { calculateSeriesProgress } from '../utils/seriesProgress';
import { Plus, Minus, Check, Trash2, Sliders, CheckCircle2, Heart, Clock, Play } from 'lucide-react';

const SeriesProgressCard = memo(({ item, onClick }) => {
    const { incrementEpisode, decrementEpisode, updateSeriesProgress, requestDelete, toggleFavorite } = useWatchlist();
    const [isEditing, setIsEditing] = useState(false);
    const [selectedSeason, setSelectedSeason] = useState(item.currentSeason || 1);
    const [selectedEpisode, setSelectedEpisode] = useState(item.currentEpisode ?? 0);

    // Auto-fetch missing TMDb metadata for legacy series items without violating hook rules
    const itemId = item.id;
    const hasMetadata = Boolean(item.total_episodes && item.seasons_detail?.length);

    useEffect(() => {
        if (!hasMetadata) {
            let active = true;
            tmdb.getDetails(itemId, 'series').then(data => {
                if (!active || !data) return;
                const regularSeasons = data.seasons 
                    ? data.seasons.filter(s => s.season_number > 0).map(s => ({
                        season_number: s.season_number,
                        episode_count: s.episode_count || 0,
                        name: s.name || `Season ${s.season_number}`
                    }))
                    : [];
                const totalSeasons = data.number_of_seasons || regularSeasons.length || 1;
                const totalEpisodes = data.number_of_episodes || regularSeasons.reduce((acc, s) => acc + (s.episode_count || 0), 0) || 0;

                updateSeriesProgress(itemId, {
                    total_seasons: totalSeasons,
                    total_episodes: totalEpisodes,
                    seasons_detail: regularSeasons
                });
            });
            return () => { active = false; };
        }
    }, [itemId, hasMetadata, updateSeriesProgress]);

    useEffect(() => {
        setSelectedSeason(item.currentSeason || 1);
        setSelectedEpisode(item.currentEpisode ?? 0);
    }, [item.currentSeason, item.currentEpisode]);

    const progress = useMemo(() => calculateSeriesProgress(item), [item]);
    const seasonsDetail = item.seasons_detail || [];
    
    // Find current season info
    const currentSeasonObj = seasonsDetail.find(s => s.season_number === (item.currentSeason || 1));
    const currentSeasonEpCount = currentSeasonObj?.episode_count || progress.seasonEpisodeCount || 10;

    // Selected season info for edit mode
    const selectedSeasonObj = seasonsDetail.find(s => s.season_number === Number(selectedSeason));
    const selectedSeasonMaxEpisodes = selectedSeasonObj?.episode_count || 30;

    const handleQuickIncrement = useCallback((e) => {
        e.stopPropagation();
        incrementEpisode(item.id);
    }, [incrementEpisode, item.id]);

    const handleQuickDecrement = useCallback((e) => {
        e.stopPropagation();
        decrementEpisode(item.id);
    }, [decrementEpisode, item.id]);

    const handleSaveManualProgress = (e) => {
        e.stopPropagation();
        const seasonNum = Number(selectedSeason);
        const epNum = Number(selectedEpisode);
        updateSeriesProgress(item.id, {
            currentSeason: seasonNum,
            currentEpisode: epNum,
            status: epNum > 0 ? 'watching' : 'plan_to_watch',
            watched: false
        });
        setIsEditing(false);
    };

    const handleMarkCompleted = (e) => {
        e.stopPropagation();
        const lastSeason = seasonsDetail.length > 0 ? seasonsDetail[seasonsDetail.length - 1] : null;
        const lastSeasonNum = lastSeason ? lastSeason.season_number : progress.totalSeasons;
        const lastEpCount = lastSeason ? (lastSeason.episode_count || 1) : progress.totalCount;
        updateSeriesProgress(item.id, {
            currentSeason: lastSeasonNum,
            currentEpisode: lastEpCount,
            status: 'completed',
            watched: true
        });
    };

    const handleRemove = (e) => {
        e.stopPropagation();
        requestDelete(item, 'series');
    };

    const handleToggleFav = (e) => {
        e.stopPropagation();
        toggleFavorite(item.id, 'series');
    };

    return (
        <div className={`watching-card ${item.favorite ? 'is-favorite' : ''}`} onMouseEnter={handleMouseEnter}>
            <div className="watching-poster-wrapper" onClick={() => onClick(item, 'series')}>
                <img 
                    src={getPosterUrl(item, 'w500')} 
                    alt={item.title || ''} 
                    loading="lazy" 
                    decoding="async"
                    className="watching-poster"
                    onError={handleImageError}
                />
                <button 
                    type="button" 
                    className={`poster-fav-btn ${item.favorite ? 'active' : ''}`}
                    onClick={handleToggleFav}
                    title={item.favorite ? "Favorited" : "Add to favorites"}
                    aria-label="Toggle favorite"
                >
                    <Heart size={15} fill={item.favorite ? "currentColor" : "none"} />
                </button>
            </div>

            <div className="watching-details">
                <div className="watching-header">
                    <div className="watching-title-block">
                        <h3 className="watching-title" onClick={() => onClick(item, 'series')} title={item.title}>
                            {item.title}
                        </h3>
                        <div className="watching-meta">
                            <span>{getYear(item) || 'Series'}</span>
                            <span> &bull; </span>
                            <span>{progress.totalSeasons} {progress.totalSeasons === 1 ? 'Season' : 'Seasons'}</span>
                            <span> &bull; </span>
                            <span>{progress.totalCount} Eps Total</span>
                        </div>
                    </div>
                    
                    <button 
                        className={`watching-edit-btn ${isEditing ? 'active' : ''}`}
                        title="Set specific season & episode"
                        onClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); }}
                        aria-label="Edit progress manually"
                    >
                        <Sliders size={15} />
                    </button>
                </div>

                {isEditing ? (
                    <div className="watching-edit-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="edit-controls-row">
                            <div className="edit-control-group">
                                <label>Season</label>
                                <select 
                                    value={selectedSeason} 
                                    onChange={(e) => {
                                        setSelectedSeason(Number(e.target.value));
                                        setSelectedEpisode(1);
                                    }}
                                    className="edit-select"
                                >
                                    {seasonsDetail.length > 0 ? (
                                        seasonsDetail.map(s => (
                                            <option key={s.season_number} value={s.season_number}>
                                                Season {s.season_number} ({s.episode_count} eps)
                                            </option>
                                        ))
                                    ) : (
                                        Array.from({ length: progress.totalSeasons || 1 }, (_, i) => i + 1).map(s => (
                                            <option key={s} value={s}>Season {s}</option>
                                        ))
                                    )}
                                </select>
                            </div>

                            <div className="edit-control-group">
                                <label>Watched Episode</label>
                                <select 
                                    value={selectedEpisode} 
                                    onChange={(e) => setSelectedEpisode(Number(e.target.value))}
                                    className="edit-select"
                                >
                                    <option value={0}>0 (Not started)</option>
                                    {Array.from({ length: selectedSeasonMaxEpisodes || 30 }, (_, i) => i + 1).map(ep => (
                                        <option key={ep} value={ep}>Ep {ep}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="edit-actions-row">
                            <button className="edit-save-btn" onClick={handleSaveManualProgress}>
                                <Check size={14} /> Update
                            </button>
                            <button className="edit-cancel-btn" onClick={() => setIsEditing(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="watching-progress-badge-row">
                            <div className="watching-current-badge">
                                <span className="badge-highlight">S{item.currentSeason || 1} &bull; Ep {item.currentEpisode || 0}</span>
                                {currentSeasonEpCount > 0 && (
                                    <span className="badge-subtle">of {currentSeasonEpCount} in Season {item.currentSeason || 1}</span>
                                )}
                            </div>
                            <div className="watching-stats">
                                <strong>{progress.watchedCount}</strong>/{progress.totalCount}
                                <span className="watching-percent"> ({progress.percentage}%)</span>
                            </div>
                        </div>

                        <div className="watching-progress-bar-bg" title={`${progress.percentage}% completed`}>
                            <div 
                                className="watching-progress-bar-fill"
                                style={{ width: `${progress.percentage}%` }}
                            />
                        </div>

                        <div className="watching-next-up-strip">
                            <div className="next-up-indicator">
                                <Play size={11} className="next-up-icon" />
                                <span>{progress.nextEpisode}</span>
                            </div>
                            {progress.remainingCount > 0 && (
                                <div className="remaining-indicator">
                                    <Clock size={11} />
                                    <span>{progress.remainingCount} left (~{progress.remainingHours}h)</span>
                                </div>
                            )}
                        </div>

                        <div className="watching-actions-toolbar">
                            <div className="episode-stepper">
                                <button 
                                    type="button"
                                    className="stepper-btn minus" 
                                    onClick={handleQuickDecrement}
                                    disabled={!item.currentEpisode || item.currentEpisode <= 0}
                                    title="Rewind 1 episode"
                                    aria-label="Previous episode"
                                >
                                    <Minus size={15} />
                                </button>
                                <span className="stepper-label">
                                    Ep {item.currentEpisode || 0}
                                </span>
                                <button 
                                    type="button"
                                    className="stepper-btn plus" 
                                    onClick={handleQuickIncrement}
                                    title="Watch Next Episode (+1)"
                                    aria-label="Next episode"
                                >
                                    <Plus size={15} />
                                </button>
                            </div>

                            <div className="watching-secondary-actions">
                                <button 
                                    type="button"
                                    className="action-icon-btn completed-btn"
                                    onClick={handleMarkCompleted}
                                    title="Mark entire series as completed"
                                    aria-label="Mark complete"
                                >
                                    <CheckCircle2 size={17} />
                                </button>
                                <button 
                                    type="button"
                                    className="action-icon-btn delete-btn"
                                    onClick={handleRemove}
                                    title="Remove from watchlist"
                                    aria-label="Remove series"
                                >
                                    <Trash2 size={17} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
});

SeriesProgressCard.displayName = 'SeriesProgressCard';

export default SeriesProgressCard;
