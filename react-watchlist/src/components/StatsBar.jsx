import React, { memo } from 'react';
import { Film, Tv, PlayCircle, CheckCircle2 } from 'lucide-react';

const StatsBar = memo(({ movies, series, watchingCount, completedCount }) => {
    const total = movies.length + series.length;
    if (total === 0) return null;
    const watchedTotal = movies.filter(m => m.watched).length + completedCount;
    const pct = Math.round((watchedTotal / total) * 100);

    return (
        <section className="stats-bar" aria-label="Library stats">
            <div className="stat">
                <Film size={16} />
                <strong>{movies.length}</strong><span>Movies</span>
            </div>
            <div className="stat">
                <Tv size={16} />
                <strong>{series.length}</strong><span>Series</span>
            </div>
            <div className="stat">
                <PlayCircle size={16} />
                <strong>{watchingCount}</strong><span>Watching</span>
            </div>
            <div className="stat">
                <CheckCircle2 size={16} />
                <strong>{pct}%</strong><span>Done</span>
            </div>
        </section>
    );
});

StatsBar.displayName = 'StatsBar';

export default StatsBar;
