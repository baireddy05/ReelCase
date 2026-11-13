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
        <section className="stats-dashboard" aria-label="Library stats dashboard">
            {/* 1. MOVIES STAT */}
            <div className="stat-card stat-movies" title={`${stats.watchedMoviesCount} of ${movies.length} movies watched`}>
                <div className="stat-card-header">
                    <div className="stat-icon-badge movies-badge">
                        <Film size={16} />
                    </div>
                    <span className="stat-card-label">Movies</span>
                </div>
                <div className="stat-card-body">
                    <div className="stat-main-number">{movies.length}</div>
                    <div className="stat-card-pill movies-pill">
                        <Check size={11} /> {stats.watchedMoviesCount} watched
                    </div>
                </div>
            </div>

            {/* 2. SERIES STAT */}
            <div className="stat-card stat-series" title={`${stats.watchingSeriesCount} currently watching, ${stats.completedSeriesCount} completed`}>
                <div className="stat-card-header">
                    <div className="stat-icon-badge series-badge">
                        <Tv size={16} />
                    </div>
                    <span className="stat-card-label">Series</span>
                </div>
                <div className="stat-card-body">
                    <div className="stat-main-number">{series.length}</div>
                    <div className="stat-card-pill series-pill">
                        {stats.watchingSeriesCount} active
                    </div>
                </div>
            </div>

            {/* 3. EPISODES STAT */}
            <div className="stat-card stat-episodes" title={`${stats.watchedEpisodesCount} total episodes watched`}>
                <div className="stat-card-header">
                    <div className="stat-icon-badge episodes-badge">
                        <PlayCircle size={16} />
                    </div>
                    <span className="stat-card-label">Episodes</span>
                </div>
                <div className="stat-card-body">
                    <div className="stat-main-number">{stats.watchedEpisodesCount}</div>
                    <span className="stat-card-subtext">watched total</span>
                </div>
            </div>

            {/* 4. WATCH TIME STAT */}
            <div className="stat-card stat-time" title="Estimated cumulative watch time">
                <div className="stat-card-header">
                    <div className="stat-icon-badge time-badge">
                        <Clock size={16} />
                    </div>
                    <span className="stat-card-label">Watch Time</span>
                </div>
                <div className="stat-card-body">
                    <div className="stat-main-number time-number">{stats.formattedWatchTime}</div>
                    <span className="stat-card-subtext">estimated</span>
                </div>
            </div>

            {/* 5. COMPLETION PROGRESS */}
            <div className="stat-card stat-completion" title={`${completionPct}% overall library completion rate`}>
                <div className="stat-card-header">
                    <div className="stat-icon-badge completion-badge">
                        <CheckCircle2 size={16} />
                    </div>
                    <span className="stat-card-label">Completed</span>
                </div>
                <div className="stat-card-body">
                    <div className="stat-main-number completion-number">{completionPct}%</div>
                    <div className="stat-mini-progress-bg">
                        <div 
                            className="stat-mini-progress-fill" 
                            style={{ width: `${completionPct}%` }}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
});

StatsBar.displayName = 'StatsBar';

export default StatsBar;
