import React, { useEffect, useState, useRef, useCallback, memo } from 'react';
import { ChevronLeft, ChevronRight, Star, Plus, Check, Sparkles, TrendingUp, Trophy } from 'lucide-react';
import { tmdb, getPosterUrl, handleImageError, getYear } from '../services/tmdb';
import { useWatchlist } from '../contexts/WatchlistContext';
import { useAuth } from '../contexts/AuthContext';

const DiscoverRow = memo(({ onSelect }) => {
    const { watchlist, addToWatchlist } = useWatchlist();
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('all'); // 'all' | 'movies' | 'tv' | 'top_rated'
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(true);
    const scrollRef = useRef(null);
    const dragRef = useRef({ down: false, startX: 0, startScroll: 0, moved: false });

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);

        (async () => {
            try {
                let data;
                if (category === 'top_rated') {
                    data = await tmdb.topRated('movie');
                } else if (category === 'movies') {
                    data = await tmdb.trending('movie', 'week');
                } else if (category === 'tv') {
                    data = await tmdb.trending('tv', 'week');
                } else {
                    data = await tmdb.trending('all', 'week');
                }

                if (controller.signal.aborted) return;

                const defaultMediaType = category === 'movies' || category === 'top_rated' ? 'movie' : (category === 'tv' ? 'tv' : 'movie');
                const rawList = (data?.results || [])
                    .map(r => ({ ...r, media_type: r.media_type || defaultMediaType }))
                    .filter(r => (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path)
                    .slice(0, 16);

                setItems(rawList);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        })();

        return () => controller.abort();
    }, [category]);

    const updateArrows = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanLeft(el.scrollLeft > 6);
        setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
    }, []);

    useEffect(() => {
        updateArrows();
        window.addEventListener('resize', updateArrows);
        return () => window.removeEventListener('resize', updateArrows);
    }, [items, updateArrows]);

    const scrollBy = useCallback((dir) => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.75, 280), behavior: 'smooth' });
    }, []);

    // Shift vertical wheel into horizontal scroll
    const onWheel = useCallback((e) => {
        const el = scrollRef.current;
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

    // Drag-to-scroll
    const onPointerDown = (e) => {
        const el = scrollRef.current;
        if (!el) return;
        dragRef.current = { down: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
    };

    const onPointerMove = (e) => {
        const d = dragRef.current;
        const el = scrollRef.current;
        if (!d.down || !el) return;
        const dx = e.clientX - d.startX;
        if (Math.abs(dx) > 6) d.moved = true;
        if (d.moved) el.scrollLeft = d.startScroll - dx;
    };

    const endDrag = () => { dragRef.current.down = false; };

    const onCardClick = (item) => {
        if (dragRef.current.moved) { 
            dragRef.current.moved = false; 
            return; 
        }
        onSelect(item.id, item.media_type === 'tv' ? 'series' : 'movie', item);
    };

    const isItemInWatchlist = (item) => {
        if (!user) return false;
        const list = item.media_type === 'tv' ? watchlist.series : watchlist.movies;
        return list.some(i => i.id === item.id);
    };

    const handleQuickAdd = async (e, item) => {
        e.stopPropagation();
        if (!user) {
            onSelect(item.id, item.media_type === 'tv' ? 'series' : 'movie', item);
            return;
        }
        await addToWatchlist(item, item.media_type === 'tv' ? 'series' : 'movie', 'plan_to_watch');
    };

    return (
        <section className="discover-row" aria-label="Discover entertainment">
            <div className="discover-header">
                <div className="discover-title-wrap">
                    <div className="discover-title-icon-badge">
                        <Sparkles size={18} />
                    </div>
                    <div>
                        <h2>Discover & Trending</h2>
                        <p className="discover-subtitle">Explore what's popular and critically acclaimed</p>
                    </div>
                </div>

                <div className="discover-controls">
                    <div className="discover-filter-chips">
                        <button 
                            className={`filter-chip ${category === 'all' ? 'active' : ''}`}
                            onClick={() => setCategory('all')}
                        >
                            <TrendingUp size={13} /> Trending
                        </button>
                        <button 
                            className={`filter-chip ${category === 'movies' ? 'active' : ''}`}
                            onClick={() => setCategory('movies')}
                        >
                            Movies
                        </button>
                        <button 
                            className={`filter-chip ${category === 'tv' ? 'active' : ''}`}
                            onClick={() => setCategory('tv')}
                        >
                            TV Shows
                        </button>
                        <button 
                            className={`filter-chip ${category === 'top_rated' ? 'active' : ''}`}
                            onClick={() => setCategory('top_rated')}
                        >
                            <Trophy size={13} /> Top Rated
                        </button>
                    </div>

                    <div className="discover-nav-buttons">
                        <button className="discover-arrow" onClick={() => scrollBy(-1)} disabled={!canLeft} aria-label="Scroll left">
                            <ChevronLeft size={18} />
                        </button>
                        <button className="discover-arrow" onClick={() => scrollBy(1)} disabled={!canRight} aria-label="Scroll right">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <div
                className="discover-scroll"
                ref={scrollRef}
                onScroll={updateArrows}
                onWheel={onWheel}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerLeave={endDrag}
            >
                {loading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="discover-skeleton-card">
                            <div className="skeleton-poster" />
                            <div className="skeleton-title" />
                            <div className="skeleton-meta" />
                        </div>
                    ))
                    : items.map(item => {
                        const inList = isItemInWatchlist(item);
                        const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
                        const year = getYear(item);

                        return (
                            <div
                                key={`${item.media_type}-${item.id}`}
                                className="discover-card"
                                onClick={() => onCardClick(item)}
                                onMouseEnter={() => { if (item?.id) tmdb.getDetails(item.id, item.media_type === 'tv' ? 'series' : 'movie'); }}
                                title={item.title || item.name}
                            >
                                <div className="discover-card-poster-wrap">
                                    <img
                                        src={getPosterUrl(item.poster_path, 'w500')}
                                        alt={item.title || item.name || ''}
                                        loading="lazy"
                                        decoding="async"
                                        onError={handleImageError}
                                    />
                                    {rating && (
                                        <div className="discover-rating-badge">
                                            <Star size={11} fill="currentColor" /> {rating}
                                        </div>
                                    )}
                                    <div className="discover-hover-overlay">
                                        <button 
                                            type="button" 
                                            className={`discover-quick-add ${inList ? 'added' : ''}`}
                                            onClick={(e) => handleQuickAdd(e, item)}
                                            title={inList ? "Already in your library" : "Quick add to Watchlist"}
                                            aria-label="Add to watchlist"
                                        >
                                            {inList ? <Check size={16} /> : <Plus size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="discover-card-details">
                                    <span className="discover-title">{item.title || item.name}</span>
                                    <div className="discover-card-meta">
                                        <span>{year || 'N/A'}</span>
                                        <span>&bull;</span>
                                        <span className="discover-media-tag">{item.media_type === 'tv' ? 'Series' : 'Movie'}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
            </div>
        </section>
    );
});

DiscoverRow.displayName = 'DiscoverRow';

export default DiscoverRow;
