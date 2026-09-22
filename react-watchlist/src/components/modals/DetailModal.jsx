import React, { useState, useEffect } from 'react';
import { config, getPosterUrl, handleImageError, getYear } from '../../services/tmdb';
import { useWatchlist, calculateSeriesProgress } from '../../contexts/WatchlistContext';
import { useAuth } from '../../contexts/AuthContext';
import { Check, Plus, Minus, CheckCircle2, Tv, Trash2 } from 'lucide-react';

const DetailModal = ({ show, data, onClose }) => {
    const { watchlist, addToWatchlist, updateSeriesProgress, requestDelete } = useWatchlist();
    const { user } = useAuth();

    const [selectedSeason, setSelectedSeason] = useState(1);
    const [selectedEpisode, setSelectedEpisode] = useState(0);

    const isMovie = Boolean(data?.title);
    const type = isMovie ? 'movie' : 'series';
    const listType = isMovie ? 'movies' : 'series';

    const watchlistItem = user && data ? watchlist[listType]?.find(item => item.id === data.id) : null;
    const isInWatchlist = Boolean(watchlistItem);

    // Regular seasons for TV
    const regularSeasons = (!isMovie && data?.seasons)
        ? data.seasons.filter(s => s.season_number > 0).map(s => ({
            season_number: s.season_number,
            episode_count: s.episode_count || 0,
            name: s.name || `Season ${s.season_number}`
        }))
        : [];
    const totalSeasons = data?.number_of_seasons || regularSeasons.length || 1;
    const totalEpisodes = data?.number_of_episodes || regularSeasons.reduce((acc, s) => acc + (s.episode_count || 0), 0) || 0;

    useEffect(() => {
        if (show) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }
    }, [show]);

    // Sync season & episode state when data or watchlist changes
    useEffect(() => {
        if (!data || isMovie) return;
        if (watchlistItem) {
            setSelectedSeason(watchlistItem.currentSeason || 1);
            setSelectedEpisode(watchlistItem.currentEpisode !== undefined ? watchlistItem.currentEpisode : 0);
        } else {
            setSelectedSeason(1);
            setSelectedEpisode(0);
        }
    }, [data?.id, watchlistItem?.currentSeason, watchlistItem?.currentEpisode, isMovie]);

    if (!show || !data) return null;

    const providers = data['watch/providers']?.results[config.region] || data['watch/providers']?.results['US'];
    const imdbId = data.external_ids?.imdb_id;

    // Calculate live progress for series
    const liveSeriesItem = {
        total_seasons: totalSeasons,
        total_episodes: totalEpisodes,
        seasons_detail: regularSeasons,
        currentSeason: selectedSeason,
        currentEpisode: selectedEpisode
    };
    const progress = !isMovie ? calculateSeriesProgress(liveSeriesItem) : null;

    const curSeasonObj = regularSeasons.find(s => s.season_number === selectedSeason);
    const curSeasonMaxEp = curSeasonObj?.episode_count || (regularSeasons.length > 0 ? 0 : Math.ceil(totalEpisodes / totalSeasons));

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleSeasonChange = (newSeason) => {
        const sNum = Number(newSeason);
        setSelectedSeason(sNum);
        const targetSeasonObj = regularSeasons.find(s => s.season_number === sNum);
        const maxEpInSeason = targetSeasonObj?.episode_count || 30;
        const newEp = selectedEpisode > maxEpInSeason ? maxEpInSeason : selectedEpisode;
        setSelectedEpisode(newEp);

        if (isInWatchlist) {
            updateSeriesProgress(data.id, {
                currentSeason: sNum,
                currentEpisode: newEp,
                status: newEp > 0 ? 'watching' : 'plan_to_watch',
                watched: false
            });
        }
    };

    const handleEpisodeChange = (newEp) => {
        const epNum = Number(newEp);
        setSelectedEpisode(epNum);

        if (isInWatchlist) {
            const lastSeason = regularSeasons.length > 0 ? regularSeasons[regularSeasons.length - 1] : null;
            const lastSeasonNum = lastSeason ? lastSeason.season_number : totalSeasons;
            const isAllDone = selectedSeason === lastSeasonNum && epNum >= curSeasonMaxEp && curSeasonMaxEp > 0;

            updateSeriesProgress(data.id, {
                currentSeason: selectedSeason,
                currentEpisode: epNum,
                status: isAllDone ? 'completed' : (epNum > 0 ? 'watching' : 'plan_to_watch'),
                watched: isAllDone
            });
        }
    };

    const handleStepMinus = () => {
        if (selectedEpisode > 0) {
            handleEpisodeChange(selectedEpisode - 1);
        }
    };

    const handleStepPlus = () => {
        const effectiveMax = curSeasonMaxEp > 0 ? curSeasonMaxEp : 30;
        if (selectedEpisode < effectiveMax) {
            handleEpisodeChange(selectedEpisode + 1);
        } else {
            // Next season if available
            const curIdx = regularSeasons.findIndex(s => s.season_number === selectedSeason);
            if (curIdx >= 0 && curIdx < regularSeasons.length - 1) {
                const nextSeason = regularSeasons[curIdx + 1];
                setSelectedSeason(nextSeason.season_number);
                setSelectedEpisode(1);
                if (isInWatchlist) {
                    updateSeriesProgress(data.id, {
                        currentSeason: nextSeason.season_number,
                        currentEpisode: 1,
                        status: 'watching',
                        watched: false
                    });
                }
            } else {
                // Last episode of last season -> mark completed
                const lastSeason = regularSeasons.length > 0 ? regularSeasons[regularSeasons.length - 1] : null;
                const lastSeasonNum = lastSeason ? lastSeason.season_number : totalSeasons;
                const lastMax = lastSeason ? (lastSeason.episode_count || 1) : effectiveMax;
                setSelectedSeason(lastSeasonNum);
                setSelectedEpisode(lastMax);
                if (isInWatchlist) {
                    updateSeriesProgress(data.id, {
                        currentSeason: lastSeasonNum,
                        currentEpisode: lastMax,
                        status: 'completed',
                        watched: true
                    });
                }
            }
        }
    };

    const handleStatusPillClick = (newStatus) => {
        const lastSeason = regularSeasons.length > 0 ? regularSeasons[regularSeasons.length - 1] : null;
        const lastSeasonNum = lastSeason ? lastSeason.season_number : totalSeasons;
        const lastSeasonEpCount = lastSeason ? lastSeason.episode_count : 1;

        if (newStatus === 'completed') {
            setSelectedSeason(lastSeasonNum);
            setSelectedEpisode(lastSeasonEpCount);
            if (isInWatchlist) {
                updateSeriesProgress(data.id, {
                    currentSeason: lastSeasonNum,
                    currentEpisode: lastSeasonEpCount,
                    status: 'completed',
                    watched: true
                });
            }
        } else if (newStatus === 'watching') {
            const ep = selectedEpisode > 0 ? selectedEpisode : 1;
            setSelectedEpisode(ep);
            if (isInWatchlist) {
                updateSeriesProgress(data.id, {
                    currentSeason: selectedSeason,
                    currentEpisode: ep,
                    status: 'watching',
                    watched: false
                });
            }
        } else {
            // plan_to_watch
            setSelectedEpisode(0);
            if (isInWatchlist) {
                updateSeriesProgress(data.id, {
                    currentSeason: selectedSeason,
                    currentEpisode: 0,
                    status: 'plan_to_watch',
                    watched: false
                });
            }
        }
    };

    const handleAddWithProgress = () => {
        const lastSeason = regularSeasons.length > 0 ? regularSeasons[regularSeasons.length - 1] : null;
        const lastSeasonNum = lastSeason ? lastSeason.season_number : totalSeasons;
        const isDone = selectedSeason === lastSeasonNum && selectedEpisode >= curSeasonMaxEp && curSeasonMaxEp > 0;
        const status = isDone ? 'completed' : (selectedEpisode > 0 ? 'watching' : 'plan_to_watch');

        addToWatchlist(data, type, status, {
            currentSeason: selectedSeason,
            currentEpisode: selectedEpisode
        });
    };

    const handleAlreadyWatched = () => {
        addToWatchlist(data, type, 'completed');
    };

    const handleRemoveFromWatchlist = () => {
        if (watchlistItem) {
            requestDelete(watchlistItem, type);
            onClose();
        }
    };

    // Determine active status pill
    let currentActiveStatus = 'plan_to_watch';
    if (watchlistItem?.watched || (progress && progress.percentage === 100)) {
        currentActiveStatus = 'completed';
    } else if (selectedEpisode > 0 || watchlistItem?.status === 'watching') {
        currentActiveStatus = 'watching';
    }

    return (
        <div id="detailModalOverlay" className="modal-overlay show" onClick={handleBackdropClick}>
            <div className="modal-container">
                <button className="close-detail-btn" onClick={onClose}>&times;</button>
                <div className="detail-content-wrapper">
                    <div className="detail-poster">
                        <img 
                            src={getPosterUrl(data, 'w500')} 
                            alt={data.title || data.name || ''} 
                            loading="lazy"
                            decoding="async"
                            onError={handleImageError}
                        />
                    </div>
                    <div className="detail-info">
                        <h1>{data.title || data.name}</h1>
                        <div className="meta">
                            <span>{getYear(data)}</span>
                            {isMovie && data.runtime ? <span> &bull; {data.runtime} min</span> : null}
                            {!isMovie && (
                                <span>
                                    {' '}&bull; {totalSeasons} {totalSeasons === 1 ? 'Season' : 'Seasons'}
                                    {totalEpisodes > 0 ? ` • ${totalEpisodes} Episodes` : ''}
                                </span>
                            )}
                        </div>

                        {/* Interactive Manual Progress Tracker for TV Series */}
                        {!isMovie && (
                            <div className="modal-progress-section">
                                <div className="modal-progress-header">
                                    <div className="modal-progress-title">
                                        <Tv size={18} />
                                        <span>Track Your Progress</span>
                                    </div>
                                    <div className="modal-status-pills">
                                        <button 
                                            className={`status-pill ${currentActiveStatus === 'plan_to_watch' ? 'active' : ''}`}
                                            onClick={() => handleStatusPillClick('plan_to_watch')}
                                        >
                                            Plan to Watch
                                        </button>
                                        <button 
                                            className={`status-pill ${currentActiveStatus === 'watching' ? 'active' : ''}`}
                                            onClick={() => handleStatusPillClick('watching')}
                                        >
                                            Watching
                                        </button>
                                        <button 
                                            className={`status-pill ${currentActiveStatus === 'completed' ? 'active' : ''}`}
                                            onClick={() => handleStatusPillClick('completed')}
                                        >
                                            Completed
                                        </button>
                                    </div>
                                </div>

                                <div className="modal-progress-body">
                                    <div className="modal-selectors-grid">
                                        <div className="modal-selector-box">
                                            <label>Season</label>
                                            <select 
                                                value={selectedSeason}
                                                onChange={(e) => handleSeasonChange(e.target.value)}
                                                className="modal-select"
                                            >
                                                {regularSeasons.length > 0 ? (
                                                    regularSeasons.map(s => (
                                                        <option key={s.season_number} value={s.season_number}>
                                                            {s.name || `Season ${s.season_number}`} ({s.episode_count} eps)
                                                        </option>
                                                    ))
                                                ) : (
                                                    Array.from({ length: totalSeasons }, (_, i) => i + 1).map(s => (
                                                        <option key={s} value={s}>Season {s}</option>
                                                    ))
                                                )}
                                            </select>
                                        </div>

                                        <div className="modal-selector-box">
                                            <label>Watched Episode</label>
                                            <div className="modal-ep-stepper">
                                                <button 
                                                    className="modal-stepper-btn minus"
                                                    onClick={handleStepMinus}
                                                    disabled={selectedEpisode <= 0}
                                                    title="Previous Episode"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <select 
                                                    value={selectedEpisode}
                                                    onChange={(e) => handleEpisodeChange(e.target.value)}
                                                    className="modal-select inline-select"
                                                >
                                                    <option value={0}>0 (Not started)</option>
                                                    {Array.from({ length: curSeasonMaxEp || 30 }, (_, i) => i + 1).map(ep => (
                                                        <option key={ep} value={ep}>Ep {ep}</option>
                                                    ))}
                                                </select>
                                                <button 
                                                    className="modal-stepper-btn plus"
                                                    onClick={handleStepPlus}
                                                    title="Next Episode"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {progress && (
                                        <div className="modal-bar-container">
                                            <div className="modal-bar-labels">
                                                <span>Progress: <strong>{progress.watchedCount}</strong> / {progress.totalCount} episodes</span>
                                                <span className="modal-bar-percent">{progress.percentage}%</span>
                                            </div>
                                            <div className="watching-progress-bar-bg">
                                                <div 
                                                    className="watching-progress-bar-fill"
                                                    style={{ width: `${progress.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <h2>Synopsis</h2>
                        <p className="plot">{data.overview || 'Not available.'}</p>
                        
                        <h2>Ratings</h2>
                        <div className="ratings">
                            <span>TMDb: <b>{data.vote_average ? data.vote_average.toFixed(1) : 'N/A'}</b>/10</span>
                            {imdbId && (
                                <a href={`https://www.imdb.com/title/${imdbId}`} target="_blank" rel="noopener noreferrer" className="imdb-link">
                                    IMDb
                                </a>
                            )}
                        </div>
                        
                        <h2>Where to Watch</h2>
                        <div className="providers-list">
                            {providers?.flatrate ? (
                                providers.flatrate.map(p => (
                                    <img 
                                        key={p.provider_id} 
                                        src={getPosterUrl(p.logo_path, 'w200')} 
                                        title={p.provider_name}
                                        alt={p.provider_name}
                                        loading="lazy"
                                        decoding="async"
                                        onError={handleImageError}
                                    />
                                ))
                            ) : (
                                <p className="subtle">Not available for streaming.</p>
                            )}
                        </div>
                    </div>
                    
                    <div className="add-btn-container">
                        {!isInWatchlist ? (
                            <div className="detail-add-actions">
                                <button 
                                    className="add-to-list-btn" 
                                    onClick={handleAddWithProgress}
                                >
                                    <Plus size={16} /> Add to Watchlist
                                </button>
                                <button 
                                    className="add-to-list-btn already-watched-btn" 
                                    onClick={handleAlreadyWatched}
                                >
                                    <CheckCircle2 size={16} /> Already Watched
                                </button>
                            </div>
                        ) : (
                            <div className="detail-in-watchlist-status">
                                <p className="success-text">
                                    <Check size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
                                    {watchlistItem.watched ? 'Marked as Watched' : 'In Watchlist'}
                                </p>
                                <button 
                                    type="button" 
                                    className="detail-remove-btn"
                                    onClick={handleRemoveFromWatchlist}
                                >
                                    <Trash2 size={15} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
                                    Remove from Watchlist
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetailModal;
