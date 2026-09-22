import React, { useEffect, useState, useRef, useCallback, memo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { tmdb, getPosterUrl, handleImageError } from '../services/tmdb';

const DiscoverRow = memo(({ onSelect }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(true);
    const scrollRef = useRef(null);
    const dragRef = useRef({ down: false, startX: 0, startScroll: 0, moved: false });

    useEffect(() => {
        const controller = new AbortController();
        (async () => {
            try {
                const data = await tmdb.trending('all', 'week');
                if (controller.signal.aborted) return;
                const picks = (data?.results || [])
                    .filter(r => (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path)
                    .slice(0, 12);
                setItems(picks);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        })();
        return () => controller.abort();
    }, []);

    const updateArrows = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanLeft(el.scrollLeft > 4);
        setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }, []);

    useEffect(() => {
        updateArrows();
        window.addEventListener('resize', updateArrows);
        return () => window.removeEventListener('resize', updateArrows);
    }, [items, updateArrows]);

    const scrollBy = useCallback((dir) => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 280), behavior: 'smooth' });
    }, []);

    // Shift vertical wheel into horizontal scroll so desktop mice can scroll the row
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

    // Drag-to-scroll (click suppressed if it was a drag)
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
        if (dragRef.current.moved) { dragRef.current.moved = false; return; }
        onSelect(item.id, item.media_type === 'tv' ? 'series' : 'movie');
    };

    if (!loading && items.length === 0) return null;

    return (
        <section className="discover-row" aria-label="Trending this week">
            <div className="discover-header">
                <h2>Trending this week</h2>
                <div className="discover-controls">
                    <span className="count-badge">TMDB</span>
                    <button className="discover-arrow" onClick={() => scrollBy(-1)} disabled={!canLeft} aria-label="Scroll left">
                        <ChevronLeft size={18} />
                    </button>
                    <button className="discover-arrow" onClick={() => scrollBy(1)} disabled={!canRight} aria-label="Scroll right">
                        <ChevronRight size={18} />
                    </button>
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
                        <div key={i} className="discover-skeleton" />
                    ))
                    : items.map(item => (
                        <button
                            key={`${item.media_type}-${item.id}`}
                            className="discover-card"
                            onClick={() => onCardClick(item)}
                            title={item.title || item.name}
                        >
                            <img
                                src={getPosterUrl(item.poster_path, 'w200')}
                                alt={item.title || item.name || ''}
                                loading="lazy"
                                decoding="async"
                                onError={handleImageError}
                            />
                            <span className="discover-title">{item.title || item.name}</span>
                        </button>
                    ))}
            </div>
        </section>
    );
});

DiscoverRow.displayName = 'DiscoverRow';

export default DiscoverRow;
