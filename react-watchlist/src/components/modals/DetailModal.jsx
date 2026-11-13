import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { tmdb, getPosterUrl, handleImageError, getYear } from '../../services/tmdb';
import { useWatchlist } from '../../contexts/WatchlistContext';
import { calculateSeriesProgress } from '../../utils/seriesProgress';
import { useAuth } from '../../contexts/AuthContext';
import { notify } from '../../utils/notifications';
import { 
    Check, 
    Plus, 
    Minus, 
    CheckCircle2, 
    Tv, 
    Trash2, 
    Play, 
    ChevronLeft, 
    ChevronRight, 
    Heart, 
    Share2, 
    X, 
    Star, 
    Eye,
    BookmarkCheck
} from 'lucide-react';

const DetailModal = ({ show, data, onClose }) => {
    const { 
        watchlist, 
        addToWatchlist, 
        updateSeriesProgress, 
        requestDelete, 
        toggleFavorite, 
        toggleWatched 
    } = useWatchlist();
    const { user } = useAuth();

    const [selectedSeason, setSelectedSeason] = useState(1);
    const [selectedEpisode, setSelectedEpisode] = useState(0);
    const [cast, setCast] = useState([]);
    const [trailerKey, setTrailerKey] = useState(null);
    const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
    const castRef = useRef(null);
    const castDrag = useRef({ down: false, startX: 0, startScroll: 0, moved: false });
    const [castCanLeft, setCastCanLeft] = useState(false);
    const [castCanRight, setCastCanRight] = useState(false);

    const isMovie = Boolean(data?.title || data?.original_title);
    const type = isMovie ? 'movie' : 'series';
    const listType = isMovie ? 'movies' : 'series';

    const watchlistItem = useMemo(() => {
        if (!user || !data) return null;
        return watchlist[listType]?.find(item => item.id === data.id) || null;
    }, [user, data, watchlist, listType]);

    const isInWatchlist = Boolean(watchlistItem);
    const isFavorite = Boolean(watchlistItem?.favorite);

    // Regular seasons for TV
    const regularSeasons = useMemo(() => {
        if (isMovie || !data?.seasons) return [];
        return data.seasons
            .filter(s => s.season_number > 0)
            .map(s => ({
                season_number: s.season_number,
                episode_count: s.episode_count || 0,
                name: s.name || `Season ${s.season_number}`
            }));
    }, [data?.seasons, isMovie]);

    const totalSeasons = data?.number_of_seasons || regularSeasons.length || 1;
    const totalEpisodes = data?.number_of_episodes || regularSeasons.reduce((acc, s) => acc + (s.episode_count || 0), 0) || 0;

    // Body scroll lock
    useEffect(() => {
        if (show) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
            setIsPlayingTrailer(false);
        }
        return () => {
            document.body.classList.remove('modal-open');
        };
    }, [show]);

    // Sync season & episode state
    const dataId = data?.id;
    const itemSeason = watchlistItem?.currentSeason;
    const itemEpisode = watchlistItem?.currentEpisode;
    const inList = Boolean(watchlistItem);

    useEffect(() => {
        if (!dataId || isMovie) return;
        if (inList) {
            setSelectedSeason(itemSeason || 1);
            setSelectedEpisode(itemEpisode !== undefined ? itemEpisode : 0);
        } else {
            setSelectedSeason(1);
            setSelectedEpisode(0);
        }
    }, [dataId, itemSeason, itemEpisode, isMovie, inList]);

    // Top-billed cast + trailer extraction
    useEffect(() => {
        if (!show || !dataId) return;
        let cancelled = false;
        setIsPlayingTrailer(false);

        // If credits were already appended to data
        if (data.credits?.cast) {
            setCast(data.credits.cast.slice(0, 10));
        } else {
            setCast([]);
            tmdb.getCredits(dataId, type).then(res => {
                if (!cancelled && res?.cast) setCast(res.cast.slice(0, 10));
            });
        }

        // If videos were already appended to data
        const findTrailer = (videoList) => {
            if (!videoList || !Array.isArray(videoList)) return null;
            const vid = videoList.find(v => v.site === 'YouTube' && v.type === 'Trailer')
                || videoList.find(v => v.site === 'YouTube' && v.type === 'Teaser')
                || videoList.find(v => v.site === 'YouTube');
            return vid ? vid.key : null;
        };

        if (data.videos?.results) {
            setTrailerKey(findTrailer(data.videos.results));
        } else {
            setTrailerKey(null);
            tmdb.getVideos(dataId, type).then(res => {
                if (!cancelled && res?.results) {
                    setTrailerKey(findTrailer(res.results));
                }
            });
        }

        return () => { cancelled = true; };
    }, [show, dataId, type, data]);

    // Esc closes modal
    useEffect(() => {
        if (!show) return;
        const onKey = (e) => { 
            if (e.key === 'Escape') {
                if (isPlayingTrailer) {
                    setIsPlayingTrailer(false);
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [show, isPlayingTrailer, onClose]);

    // Cast carousel scroll & drag
    const updateCastArrows = useCallback(() => {
        const el = castRef.current;
        if (!el) return;
        setCastCanLeft(el.scrollLeft > 4);
        setCastCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }, []);

    useEffect(() => { 
        updateCastArrows(); 
    }, [cast, updateCastArrows]);

    const onCastWheel = useCallback((e) => {
        const el = castRef.current;
        if (!el) return;
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
            const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
            const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && e.deltaY > 0;
            if (!atStart && !atEnd) {
                e.preventDefault();
                el.scrollBy({ left: e.deltaY, behavior: 'auto' });
            }
        }
    }, []);

    const onCastPointerDown = (e) => {
        const el = castRef.current;
        if (!el) return;
        castDrag.current = { down: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
    };

    const onCastPointerMove = (e) => {
        const d = castDrag.current;
        const el = castRef.current;
        if (!d.down || !el) return;
        const dx = e.clientX - d.startX;
        if (Math.abs(dx) > 6) d.moved = true;
        if (d.moved) el.scrollLeft = d.startScroll - dx;
    };

    const endCastDrag = () => { castDrag.current.down = false; };
    
    const onCastClick = (e) => {
        if (castDrag.current.moved) { 
            e.preventDefault(); 
            castDrag.current.moved = false; 
        }
    };

    const scrollCastBy = useCallback((dir) => {
        const el = castRef.current;
        if (!el) return;
        el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.75, 200), behavior: 'smooth' });
    }, []);

    if (!show || !data) return null;

    // Director or Creator extraction
    const directors = isMovie
        ? data.credits?.crew?.filter(c => c.job === 'Director').map(c => c.name).slice(0, 2).join(', ')
        : data.created_by?.map(c => c.name).slice(0, 2).join(', ') || data.credits?.crew?.filter(c => c.job === 'Executive Producer' || c.job === 'Creator').map(c => c.name).slice(0, 2).join(', ');

    // Watch providers calculation (prioritize India, then US)
    const watchResults = data['watch/providers']?.results || {};
    const regionCode = watchResults['IN'] ? 'IN' : 'US';
    const regionLabel = regionCode === 'IN' ? 'India' : 'U.S. (International)';
    const providersRaw = watchResults[regionCode];
    
    const dedupe = (list) => list
        ? [...new Map(list.map(p => [p.provider_name.replace(/\s+(Standard|Basic|Premium).*/i, '').trim(), p])).values()]
        : [];
        
    const flatrate = dedupe(providersRaw?.flatrate);
    const rent = dedupe(providersRaw?.rent);
    const buy = dedupe(providersRaw?.buy);
    const providerGroups = [
        flatrate.length > 0 ? { label: 'Stream', items: flatrate } : null,
        rent.length > 0 ? { label: 'Rent', items: rent } : null,
        buy.length > 0 ? { label: 'Buy', items: buy } : null,
    ].filter(Boolean);
    const watchLink = providersRaw?.link;
    const imdbId = data.external_ids?.imdb_id;

    // Live progress calculation for Series
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

    const handleToggleWatchedStatus = () => {
        if (isInWatchlist) {
            toggleWatched(data.id, type);
        }
    };

    const handleRemoveFromWatchlist = () => {
        if (watchlistItem) {
            requestDelete(watchlistItem, type);
            onClose();
        }
    };

    const handleToggleFavorite = () => {
        if (isInWatchlist) {
            toggleFavorite(data.id, type);
        } else {
            addToWatchlist(data, type, 'plan_to_watch', { favorite: true });
        }
    };

    const handleShare = async () => {
        const title = data.title || data.name;
        const year = getYear(data);
        const rating = data.vote_average ? `★ ${data.vote_average.toFixed(1)}/10` : '';
        const shareText = `Check out "${title}" (${year}) ${rating} on Reelcase!`;
        
        try {
            if (navigator.share) {
                await navigator.share({
                    title: `Reelcase | ${title}`,
                    text: shareText,
                    url: window.location.href
                });
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(`${shareText}\nhttps://www.themoviedb.org/${type}/${data.id}`);
                notify('Title and link copied to clipboard!', 'info');
            }
        } catch {
            // Ignore cancelled share
        }
    };

    // Determine active status pill
    let currentActiveStatus = 'plan_to_watch';
    if (watchlistItem?.watched || (progress && progress.percentage === 100)) {
        currentActiveStatus = 'completed';
    } else if (selectedEpisode > 0 || watchlistItem?.status === 'watching') {
        currentActiveStatus = 'watching';
    }

    const backdropUrl = data.backdrop_path ? getPosterUrl(data.backdrop_path, 'w1280') : null;
    const title = data.title || data.name;

    return (
        <div id="detailModalOverlay" className="modal-overlay show" onClick={handleBackdropClick} role="dialog" aria-modal="true">
            <div className="modal-container">
                {/* Hero Backdrop Banner with Multi-Directional Atmospheric Fade */}
                {backdropUrl && (
                    <div className="detail-hero" aria-hidden="true">
                        <img src={backdropUrl} alt="" onError={handleImageError} />
                        <div className="detail-hero-fade" />
                    </div>
                )}

                {/* Floating Close Button */}
                <button 
                    type="button" 
                    className="detail-close-btn" 
                    onClick={onClose} 
                    aria-label="Close modal"
                    title="Close (Esc)"
                >
                    <X size={20} />
                </button>

                <div className={`detail-content-wrapper${backdropUrl ? ' has-backdrop' : ''}`}>
                    {/* Left Poster Column */}
                    <div className="detail-poster-col">
                        <div className="detail-poster">
                            <img 
                                src={getPosterUrl(data, 'w500')} 
                                alt={title} 
                                loading="lazy"
                                decoding="async"
                                onError={handleImageError}
                            />
                        </div>

                        {/* Anchor Card under poster if in library */}
                        {isInWatchlist && (
                            <div className="poster-side-card">
                                <div className="poster-status-indicator">
                                    <BookmarkCheck size={16} className="bookmark-icon" />
                                    <span>{watchlistItem.watched ? 'Marked Watched' : 'In Library'}</span>
                                </div>
                                <button 
                                    type="button" 
                                    className="side-remove-btn"
                                    onClick={handleRemoveFromWatchlist}
                                >
                                    <Trash2 size={13} /> Remove
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right Info Column */}
                    <div className="detail-info">
                        <div className="detail-header-block">
                            <h1>{title}</h1>
                            {data.tagline && <p className="detail-tagline">“{data.tagline}”</p>}
                        </div>

                        {/* Metadata Ribbon */}
                        <div className="meta">
                            <span className="meta-pill year">{getYear(data) || 'N/A'}</span>
                            {isMovie && data.runtime ? (
                                <span className="meta-pill runtime">{data.runtime} min</span>
                            ) : null}
                            {!isMovie && (
                                <span className="meta-pill series-count">
                                    {totalSeasons} {totalSeasons === 1 ? 'Season' : 'Seasons'}
                                    {totalEpisodes > 0 ? ` &bull; ${totalEpisodes} Eps` : ''}
                                </span>
                            )}
                            {data.vote_average ? (
                                <span className="meta-pill rating">
                                    <Star size={13} fill="currentColor" /> {data.vote_average.toFixed(1)}
                                </span>
                            ) : null}
                            {data.status && <span className="meta-pill status">{data.status}</span>}
                        </div>

                        {/* Genres */}
                        {data.genres && data.genres.length > 0 && (
                            <div className="detail-genres-row">
                                {data.genres.map(g => (
                                    <span key={g.id || g.name} className="genre-pill">
                                        {g.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Director / Creator */}
                        {directors && (
                            <div className="detail-creators">
                                <span className="creators-label">{isMovie ? 'Directed by:' : 'Created by:'}</span>
                                <span className="creators-name">{directors}</span>
                            </div>
                        )}

                        {/* ========================================================
                            UNIFIED ACTION BAR (All controls in natural eye level)
                           ======================================================== */}
                        <div className="detail-actions-bar">
                            {!isInWatchlist ? (
                                <>
                                    <button 
                                        type="button"
                                        className="detail-action-btn primary" 
                                        onClick={handleAddWithProgress}
                                    >
                                        <Plus size={16} /> Add to Reelcase
                                    </button>
                                    <button 
                                        type="button"
                                        className="detail-action-btn secondary" 
                                        onClick={handleAlreadyWatched}
                                    >
                                        <CheckCircle2 size={16} /> Already Watched
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="detail-status-pill in-list">
                                        <Check size={16} />
                                        <span>{watchlistItem.watched ? 'Watched' : 'In Reelcase'}</span>
                                    </div>
                                    <button 
                                        type="button"
                                        className="detail-action-btn secondary" 
                                        onClick={handleToggleWatchedStatus}
                                        title={watchlistItem.watched ? "Mark as unwatched" : "Mark as watched"}
                                    >
                                        <Eye size={16} /> 
                                        {watchlistItem.watched ? 'Mark Unwatched' : 'Mark Watched'}
                                    </button>
                                </>
                            )}

                            {/* Watch Trailer Button */}
                            {trailerKey && (
                                <button 
                                    type="button" 
                                    className={`detail-action-btn trailer ${isPlayingTrailer ? 'active' : ''}`}
                                    onClick={() => setIsPlayingTrailer(!isPlayingTrailer)}
                                >
                                    <Play size={14} fill="currentColor" /> 
                                    {isPlayingTrailer ? 'Hide Trailer' : 'Watch Trailer'}
                                </button>
                            )}

                            {/* Favorite Button */}
                            <button 
                                type="button" 
                                className={`detail-icon-btn fav-btn ${isFavorite ? 'active' : ''}`}
                                onClick={handleToggleFavorite}
                                title={isFavorite ? "Favorited" : "Add to favorites"}
                                aria-label="Favorite"
                            >
                                <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
                            </button>

                            {/* Share Button */}
                            <button 
                                type="button" 
                                className="detail-icon-btn share-btn"
                                onClick={handleShare}
                                title="Share this title"
                                aria-label="Share"
                            >
                                <Share2 size={18} />
                            </button>

                            {/* Remove Button (if in library) */}
                            {isInWatchlist && (
                                <button 
                                    type="button" 
                                    className="detail-icon-btn danger-btn"
                                    onClick={handleRemoveFromWatchlist}
                                    title="Remove from Reelcase"
                                    aria-label="Remove from Reelcase"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>

                        {/* Inline Trailer Player View */}
                        {trailerKey && isPlayingTrailer && (
                            <div className="inline-trailer-player">
                                <div className="trailer-player-header">
                                    <span>Official Trailer</span>
                                    <button 
                                        type="button" 
                                        className="close-trailer-btn" 
                                        onClick={() => setIsPlayingTrailer(false)}
                                    >
                                        <X size={15} /> Close Player
                                    </button>
                                </div>
                                <div className="trailer-iframe-wrap">
                                    <iframe
                                        src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0`}
                                        title="Official Trailer"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                </div>
                            </div>
                        )}

                        {/* Interactive Manual Progress Tracker for TV Series */}
                        {!isMovie && (
                            <div className="modal-progress-section">
                                <div className="modal-progress-header">
                                    <div className="modal-progress-title">
                                        <Tv size={18} />
                                        <span>Interactive Episode Tracker</span>
                                    </div>
                                    <div className="modal-status-pills">
                                        <button 
                                            type="button"
                                            className={`status-pill ${currentActiveStatus === 'plan_to_watch' ? 'active' : ''}`}
                                            onClick={() => handleStatusPillClick('plan_to_watch')}
                                        >
                                            Plan to Watch
                                        </button>
                                        <button 
                                            type="button"
                                            className={`status-pill ${currentActiveStatus === 'watching' ? 'active' : ''}`}
                                            onClick={() => handleStatusPillClick('watching')}
                                        >
                                            Watching
                                        </button>
                                        <button 
                                            type="button"
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
                                            <label>Current Season</label>
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
                                                    type="button"
                                                    className="modal-stepper-btn minus"
                                                    onClick={handleStepMinus}
                                                    disabled={selectedEpisode <= 0}
                                                    title="Previous Episode"
                                                    aria-label="Previous episode"
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
                                                    type="button"
                                                    className="modal-stepper-btn plus"
                                                    onClick={handleStepPlus}
                                                    title="Next Episode"
                                                    aria-label="Next episode"
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

                        {/* Synopsis */}
                        <div className="detail-synopsis-section">
                            <h2>Synopsis</h2>
                            <p className="plot">{data.overview || 'No synopsis provided for this title.'}</p>
                        </div>
                        
                        {/* Where to Watch */}
                        <div className="detail-providers-section">
                            <h2>Where to Watch &bull; {regionLabel}</h2>
                            <div className="providers-list">
                                {providerGroups.length > 0 ? (
                                    providerGroups.map(group => (
                                        <div key={group.label} className="provider-group">
                                            <span className="provider-group-label">{group.label}</span>
                                            <div className="provider-logos">
                                                {group.items.map(p => (
                                                    watchLink ? (
                                                        <a
                                                            key={p.provider_id}
                                                            href={watchLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title={`${p.provider_name} — open streaming options`}
                                                            className="provider-logo-link"
                                                        >
                                                            <img
                                                                src={getPosterUrl(p.logo_path, 'w200')}
                                                                title={p.provider_name}
                                                                alt={p.provider_name}
                                                                loading="lazy"
                                                                decoding="async"
                                                                onError={handleImageError}
                                                            />
                                                        </a>
                                                    ) : (
                                                        <img
                                                            key={p.provider_id}
                                                            src={getPosterUrl(p.logo_path, 'w200')}
                                                            title={p.provider_name}
                                                            alt={p.provider_name}
                                                            loading="lazy"
                                                            decoding="async"
                                                            onError={handleImageError}
                                                        />
                                                    )
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="subtle">Not currently available on major digital/streaming platforms in this region.</p>
                                )}
                            </div>
                        </div>

                        {/* Top Billed Cast */}
                        {cast.length > 0 && (
                            <div className="detail-cast-section">
                                <div className="cast-header">
                                    <h2>Top Billed Cast</h2>
                                    <div className="cast-controls">
                                        <button 
                                            type="button"
                                            className="cast-arrow" 
                                            onClick={() => scrollCastBy(-1)} 
                                            disabled={!castCanLeft} 
                                            aria-label="Scroll cast left"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <button 
                                            type="button"
                                            className="cast-arrow" 
                                            onClick={() => scrollCastBy(1)} 
                                            disabled={!castCanRight} 
                                            aria-label="Scroll cast right"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div
                                    className="cast-row"
                                    ref={castRef}
                                    onScroll={updateCastArrows}
                                    onWheel={onCastWheel}
                                    onPointerDown={onCastPointerDown}
                                    onPointerMove={onCastPointerMove}
                                    onPointerUp={endCastDrag}
                                    onPointerLeave={endCastDrag}
                                >
                                    {cast.map(person => (
                                        <a
                                            key={person.cast_id || person.credit_id || person.id}
                                            className="cast-card"
                                            title={`${person.name} — search actor`}
                                            href={`https://www.google.com/search?q=${encodeURIComponent(person.name + ' actor')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={onCastClick}
                                        >
                                            <img
                                                src={person.profile_path ? getPosterUrl(person.profile_path, 'w200') : getPosterUrl(null)}
                                                alt={person.name}
                                                loading="lazy"
                                                decoding="async"
                                                onError={handleImageError}
                                            />
                                            <span className="cast-name">{person.name}</span>
                                            {person.character && <span className="cast-char">{person.character}</span>}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Ratings & External Links */}
                        <div className="detail-links-section">
                            <h2>Ratings & External Links</h2>
                            <div className="ratings">
                                <span className="rating-tag tmdb">
                                    TMDb: <b>{data.vote_average ? data.vote_average.toFixed(1) : 'N/A'}</b>/10
                                </span>
                                {imdbId && (
                                    <a 
                                        href={`https://www.imdb.com/title/${imdbId}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="imdb-link"
                                    >
                                        IMDb ↗
                                    </a>
                                )}
                                <a 
                                    href={`https://www.themoviedb.org/${type}/${data.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="tmdb-link"
                                >
                                    TMDb Page ↗
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetailModal;
