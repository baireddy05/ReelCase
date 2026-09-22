import React, { useState, useEffect, useMemo, memo } from 'react';
import { tmdb, getPosterUrl, handleImageError, getYear } from '../services/tmdb';
import { useWatchlist, calculateSeriesProgress } from '../contexts/WatchlistContext';
import { Plus, Minus, Check, Trash2, Sliders, CheckCircle2 } from 'lucide-react';

const SeriesProgressCard = memo(({ item, onClick }) => {
    const { incrementEpisode, decrementEpisode, updateSeriesProgress, requestDelete } = useWatchlist();
    const [isEditing, setIsEditing] = useState(false);
    const [selectedSeason, setSelectedSeason] = useState(item.currentSeason || 1);
    const [selectedEpisode, setSelectedEpisode] = useState(item.currentEpisode ?? 0);

    // Auto-fetch missing TMDb metadata for legacy series items
    useEffect(() => {
        if (!item.total_episodes || !item.seasons_detail || item.seasons_detail.length === 0) {
            tmdb.getDetails(item.id, 'series').then(data => {
                if (data) {
                    const regularSeasons = data.seasons 
                        ? data.seasons.filter(s => s.season_number > 0).map(s => ({
                            season_number: s.season_number,
                            episode_count: s.episode_count || 0,
                            name: s.name || `Season ${s.season_number}`
                        }))
                        : [];
                    const totalSeasons = data.number_of_seasons || regularSeasons.length || 1;
                    const totalEpisodes = data.number_of_episodes || regularSeasons.reduce((acc, s) => acc + (s.episode_count || 0), 0) || 0;

                    updateSeriesProgress(item.id, {
                        total_seasons: totalSeasons,
                        total_episodes: totalEpisodes,
                        seasons_detail: regularSeasons
                    });
                }
            });
        }
    }, [item.id]);

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

    const handleQuickIncrement = (e) => {
        e.stopPropagation();
        incrementEpisode(item.id);
    };

    const handleQuickDecrement = (e) => {
        e.stopPropagation();
        decrementEpisode(item.id);
    };

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

    return (
        <div className="watching-card">
            <div className="watching-poster-wrapper" onClick={() => onClick(item, 'series')}>
                <img 
                    src={getPosterUrl(item, 'w200')} 
                    alt={item.title || ''} 
                    loading="lazy"
                    decoding="async"
                    className="watching-poster"
                    onError={handleImageError}
                />
                <div className="watching-poster-overlay">
                    <span>View Info</span>
                </div>
            </div>

            <div className="watching-details">
                <div className="watching-header">
                    <div>
                        <h3 className="watching-title" onClick={() => onClick(item, 'series')} title={item.title}>
                            {item.title}
                        </h3>
                        <div className="watching-meta">
                            <span>{getYear(item) || 'Series'}</span>
                            <span> • </span>
                            <span>{progress.totalSeasons} {progress.totalSeasons === 1 ? 'Season' : 'Seasons'}</span>
                            <span> • </span>
                            <span>{progress.totalCount} Eps Total</span>
                        </div>
                    </div>
                    
                    <button 
                        className={`watching-edit-btn ${isEditing ? 'active' : ''}`}
                        title="Set specific season & episode"
                        onClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); }}
                    >
                        <Sliders size={16} />
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
                                <label>Episode</label>
                                <select 
                                    value={selectedEpisode} 
                                    onChange={(e) => setSelectedEpisode(Number(e.target.value))}
                                    className="edit-select"
                                >
                                    <option value={0}>0 (None)</option>
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
                                <span className="badge-highlight">S{item.currentSeason || 1} : Ep {item.currentEpisode || 0}</span>
                                {currentSeasonEpCount > 0 && (
                                    <span className="badge-subtle">of {currentSeasonEpCount} in Season {item.currentSeason || 1}</span>
                                )}
                            </div>
                            <div className="watching-stats">
                                <strong>{progress.watchedCount}</strong> / {progress.totalCount} eps watched 
                                <span className="watching-percent"> ({progress.percentage}%)</span>
                            </div>
                        </div>

                        <div className="watching-progress-bar-bg">
                            <div 
                                className="watching-progress-bar-fill"
                                style={{ width: `${progress.percentage}%` }}
                            />
                        </div>

                        <div className="watching-actions-toolbar">
                            <div className="episode-stepper">
                                <button 
                                    className="stepper-btn minus" 
                                    onClick={handleQuickDecrement}
                                    disabled={!item.currentEpisode || item.currentEpisode <= 0}
                                    title="Rewind 1 episode"
                                >
                                    <Minus size={16} />
                                </button>
                                <span className="stepper-label">
                                    Ep {item.currentEpisode || 0}
                                </span>
                                <button 
                                    className="stepper-btn plus" 
                                    onClick={handleQuickIncrement}
                                    title="Watch Next Episode"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>

                            <div className="watching-secondary-actions">
                                <button 
                                    className="action-icon-btn completed-btn"
                                    onClick={handleMarkCompleted}
                                    title="Mark entire series as completed"
                                >
                                    <CheckCircle2 size={18} />
                                </button>
                                <button 
                                    className="action-icon-btn delete-btn"
                                    onClick={handleRemove}
                                    title="Remove from watchlist"
                                >
                                    <Trash2 size={18} />
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
