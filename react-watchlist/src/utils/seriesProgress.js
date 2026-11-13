// Utility to calculate series progress metrics and watch time statistics

export const calculateSeriesProgress = (item) => {
    if (!item) {
        return {
            watchedCount: 0,
            totalCount: 0,
            percentage: 0,
            currentSeason: 1,
            currentEpisode: 0,
            totalSeasons: 1,
            seasonEpisodeCount: 0,
            nextEpisode: null,
            remainingCount: 0,
            remainingHours: 0
        };
    }

    const seasonsDetail = item.seasons_detail || [];
    const totalSeasons = item.total_seasons || (seasonsDetail.length > 0 ? seasonsDetail.length : 1);

    // Total episodes in regular seasons
    let totalCount = item.total_episodes || 0;
    if (totalCount === 0 && seasonsDetail.length > 0) {
        totalCount = seasonsDetail.reduce((acc, s) => acc + (s.episode_count || 0), 0);
    }
    if (totalCount === 0) totalCount = 1; // Avoid division by 0

    const currentSeason = item.currentSeason || 1;
    const currentEpisode = item.currentEpisode || 0;

    // Current season's episode count
    const curSeasonObj = seasonsDetail.find(s => s.season_number === currentSeason);
    const seasonEpisodeCount = curSeasonObj?.episode_count || (seasonsDetail.length > 0 ? 0 : Math.ceil(totalCount / totalSeasons));

    // Calculate total episodes watched across all seasons
    let watchedCount = 0;
    const isCompleted = item.watched === true || item.status === 'completed';

    if (isCompleted) {
        watchedCount = totalCount;
    } else if (seasonsDetail.length > 0) {
        for (const s of seasonsDetail) {
            if (s.season_number < currentSeason) {
                watchedCount += (s.episode_count || 0);
            } else if (s.season_number === currentSeason) {
                watchedCount += Math.min(currentEpisode, s.episode_count || currentEpisode);
            }
        }
    } else {
        const avgPerSeason = totalCount / totalSeasons;
        watchedCount = Math.min(totalCount, Math.round(((currentSeason - 1) * avgPerSeason) + currentEpisode));
    }

    const percentage = Math.min(100, Math.max(0, Math.round((watchedCount / totalCount) * 100)));
    const remainingCount = Math.max(0, totalCount - watchedCount);
    const avgEpisodeDuration = item.episode_run_time?.[0] || 45; // default 45 mins
    const remainingHours = Math.round((remainingCount * avgEpisodeDuration) / 60 * 10) / 10;

    // Next up episode indicator
    let nextEpisode = null;
    if (isCompleted || percentage === 100) {
        nextEpisode = 'Completed';
    } else if (currentEpisode === 0) {
        nextEpisode = `Start S${currentSeason} E1`;
    } else if (seasonEpisodeCount > 0 && currentEpisode < seasonEpisodeCount) {
        nextEpisode = `Next: S${currentSeason} E${currentEpisode + 1}`;
    } else {
        const nextSeasonNum = currentSeason + 1;
        const nextSeasonExists = seasonsDetail.some(s => s.season_number === nextSeasonNum) || (nextSeasonNum <= totalSeasons);
        if (nextSeasonExists) {
            nextEpisode = `Next: S${nextSeasonNum} E1`;
        } else {
            nextEpisode = 'Final Episode Watched';
        }
    }

    return {
        watchedCount,
        totalCount,
        percentage,
        currentSeason,
        currentEpisode,
        totalSeasons,
        seasonEpisodeCount,
        nextEpisode,
        remainingCount,
        remainingHours
    };
};

export const calculateWatchTimeStats = (movies = [], series = []) => {
    // Watched movies: average 115 minutes or item.runtime
    let movieMinutes = 0;
    let watchedMoviesCount = 0;
    for (const m of movies) {
        if (m.watched) {
            watchedMoviesCount++;
            movieMinutes += (m.runtime || 115);
        }
    }

    // Series: sum watched episodes * episode runtime (~45 mins)
    let seriesMinutes = 0;
    let watchedEpisodesCount = 0;
    let completedSeriesCount = 0;
    let watchingSeriesCount = 0;

    for (const s of series) {
        if (s.watched || s.status === 'completed') {
            completedSeriesCount++;
        } else if (s.status === 'watching' || (s.currentEpisode && s.currentEpisode > 0)) {
            watchingSeriesCount++;
        }

        const prog = calculateSeriesProgress(s);
        watchedEpisodesCount += prog.watchedCount;
        seriesMinutes += prog.watchedCount * (s.episode_run_time?.[0] || 45);
    }

    const totalMinutes = movieMinutes + seriesMinutes;
    const totalHours = Math.floor(totalMinutes / 60);
    const days = Math.floor(totalHours / 24);
    const remHours = totalHours % 24;

    let formattedWatchTime = '0h';
    if (days > 0) {
        formattedWatchTime = `${days}d ${remHours}h`;
    } else if (totalHours > 0) {
        formattedWatchTime = `${totalHours}h`;
    } else if (totalMinutes > 0) {
        formattedWatchTime = `${totalMinutes}m`;
    }

    return {
        totalMinutes,
        totalHours,
        days,
        remHours,
        formattedWatchTime,
        watchedMoviesCount,
        watchedEpisodesCount,
        completedSeriesCount,
        watchingSeriesCount
    };
};

