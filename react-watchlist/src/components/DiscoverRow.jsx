import React, { useEffect, useState, memo } from 'react';
import { tmdb, getPosterUrl, handleImageError } from '../services/tmdb';

const DiscoverRow = memo(({ onSelect }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

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

    if (!loading && items.length === 0) return null;

    return (
        <section className="discover-row" aria-label="Trending this week">
            <div className="discover-header">
                <h2>Trending this week</h2>
                <span className="count-badge">TMDB</span>
            </div>
            <div className="discover-scroll">
                {loading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="discover-skeleton" />
                    ))
                    : items.map(item => (
                        <button
                            key={`${item.media_type}-${item.id}`}
                            className="discover-card"
                            onClick={() => onSelect(item.id, item.media_type === 'tv' ? 'series' : 'movie')}
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
