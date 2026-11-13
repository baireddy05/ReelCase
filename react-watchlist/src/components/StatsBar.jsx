import React, { useMemo, memo } from 'react';
import { Film, Tv, PlayCircle, CheckCircle2, Clock, Check } from 'lucide-react';
import { calculateWatchTimeStats } from '../utils/seriesProgress';

const StatsBar = memo(({ movies = [], series = [] }) => {
    const stats = useMemo(() => calculateWatchTimeStats(movies, series), [movies, series]);
    const totalTitles = movies.length + series.length;

    if (totalTitles === 0) return null;

    const totalWatchedTitles = stats.watchedMoviesCount + stats.completedSeriesCount;
    const completionPct = totalTitles > 0 ? Math.round((totalWatchedTitles / totalTitles) * 100) : 0;

    return (
        <section className="stats-bar" aria-label="Library stats dashboard">
            <div className="stat stat-movies" title={`${stats.watchedMoviesCount} of ${movies.length} movies watched`}>
                <div className="stat-icon-wrapper">
                    <Film size={17} />
                </div>
                <div className="stat-text">
                    <div className="stat-value">
                        <strong>{movies.length}</strong>
                        <span className="stat-sub">({stats.watchedMoviesCount} <Check size={11} className="inline-check" />)</span>
                    </div>
                    <span className="stat-label">Movies</span>
                </div>
            </div>

            <div className="stat stat-series" title={`${stats.watchingSeriesCount} currently watching, ${stats.completedSeriesCount} completed`}>
                <div className="stat-icon-wrapper">
                    <Tv size={17} />
                </div>
                <div className="stat-text">
                    <div className="stat-value">
                        <strong>{series.length}</strong>
                        <span className="stat-sub">({stats.watchingSeriesCount} active)</span>
                    </div>
                    <span className="stat-label">Series</span>
                </div>
            </div>

            <div className="stat stat-episodes" title={`${stats.watchedEpisodesCount} total episodes watched`}>
                <div className="stat-icon-wrapper">
                    <PlayCircle size={17} />
                </div>
                <div className="stat-text">
                    <div className="stat-value">
                        <strong>{stats.watchedEpisodesCount}</strong>
                    </div>
                    <span className="stat-label">Eps Watched</span>
                </div>
            </div>

            <div className="stat stat-time" title="Estimated cumulative watch time">
                <div className="stat-icon-wrapper">
                    <Clock size={17} />
                </div>
                <div className="stat-text">
                    <div className="stat-value">
                        <strong>{stats.formattedWatchTime}</strong>
                    </div>
                    <span className="stat-label">Watch Time</span>
                </div>
            </div>

            <div className="stat stat-completion" title={`${completionPct}% overall library completion rate`}>
                <div className="stat-icon-wrapper completion-icon">
                    <CheckCircle2 size={17} />
                </div>
                <div className="stat-text">
                    <div className="stat-value">
                        <strong>{completionPct}%</strong>
                    </div>
                    <span className="stat-label">Completed</span>
                </div>
            </div>
        </section>
    );
});

StatsBar.displayName = 'StatsBar';

export default StatsBar;
