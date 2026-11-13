import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { db, doc, onSnapshot, setDoc } from '../services/firebase';
import { notify } from '../utils/notifications';

const WatchlistContext = createContext();

export const useWatchlist = () => useContext(WatchlistContext);

const normalizeItem = (item) => {
    if (!item) return item;
    const posterVal = item.poster_path || item.poster || null;
    const yearVal = item.release_date || item.first_air_date || item.year || item.releaseDate || null;
    return {
        ...item,
        poster_path: posterVal,
        poster: posterVal,
        release_date: yearVal,
        first_air_date: yearVal,
        year: yearVal,
        favorite: Boolean(item.favorite)
    };
};

export const WatchlistProvider = ({ children }) => {
    const { user } = useAuth();
    const [watchlist, setWatchlist] = useState({ movies: [], series: [] });
    const [deleteModalState, setDeleteModalState] = useState({ show: false, item: null, type: null });

    useEffect(() => {
        if (!user) {
            setWatchlist({ movies: [], series: [] });
            return;
        }

        // Sync any offline edits saved while Firestore writes failed
        const offlineRaw = localStorage.getItem('offline_watchlist');
        if (offlineRaw) {
            try {
                const parsed = JSON.parse(offlineRaw);
                if (parsed && (parsed.movies?.length > 0 || parsed.series?.length > 0)) {
                    setDoc(doc(db, "watchlists", user.uid), parsed).catch(() => {});
                }
                localStorage.removeItem('offline_watchlist');
            } catch { localStorage.removeItem('offline_watchlist'); }
        }

        const docRef = doc(db, "watchlists", user.uid);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() || {};
                const rawMovies = Array.isArray(data.movies) ? data.movies : [];
                const rawSeries = Array.isArray(data.series) ? data.series : [];
                setWatchlist({
                    movies: rawMovies.map(normalizeItem),
                    series: rawSeries.map(normalizeItem)
                });
            } else {
                setDoc(docRef, { movies: [], series: [] });
                setWatchlist({ movies: [], series: [] });
            }
        });

        return unsubscribe;
    }, [user]);

    const saveWatchlistData = useCallback(async (updatedList) => {
        if (!user) return;
        try {
            await setDoc(doc(db, "watchlists", user.uid), updatedList);
        } catch (error) {
            console.error("Error saving watchlist:", error);
            localStorage.setItem('offline_watchlist', JSON.stringify(updatedList));
            setWatchlist(updatedList);
        }
    }, [user]);

    const requestDelete = useCallback((item, type) => {
        if (!item) return;
        setDeleteModalState({
            show: true,
            item,
            type: type || (item.total_seasons !== undefined ? 'series' : 'movie')
        });
    }, []);

    const cancelDelete = useCallback(() => {
        setDeleteModalState({ show: false, item: null, type: null });
    }, []);

    const removeFromWatchlist = useCallback(async (id, type) => {
        if (!user) return;
        const listType = type === 'movie' ? 'movies' : 'series';
        const removed = watchlist[listType].find(i => i.id === id);
        
        const updatedList = {
            ...watchlist,
            [listType]: watchlist[listType].filter(i => i.id !== id)
        };

        setWatchlist(updatedList);
        await saveWatchlistData(updatedList);
        notify(`Removed “${removed?.title || 'title'}” from library`, 'info');
    }, [user, watchlist, saveWatchlistData]);

    const confirmDelete = useCallback(async () => {
        const toDelete = { ...deleteModalState };
        setDeleteModalState({ show: false, item: null, type: null });
        if (toDelete.item && toDelete.type) {
            await removeFromWatchlist(toDelete.item.id, toDelete.type);
        }
    }, [deleteModalState, removeFromWatchlist]);

    const addToWatchlist = useCallback(async (item, type, initialStatus = 'plan_to_watch', customData = {}) => {
        if (!user) return false;
        
        const listType = type === 'movie' ? 'movies' : 'series';
        if (watchlist[listType].some(i => i.id === item.id)) {
            notify(`“${item.title || item.name}” is already in your library`, 'info');
            return true;
        }

        let newItem;
        const isCompleted = initialStatus === 'completed' || initialStatus === 'watched';
        const posterVal = item.poster_path || item.poster || null;
        const dateVal = item.release_date || item.first_air_date || item.year || null;

        if (type === 'movie') {
            newItem = {
                id: item.id,
                title: item.title || item.name,
                poster_path: posterVal,
                poster: posterVal,
                release_date: dateVal,
                first_air_date: dateVal,
                year: dateVal,
                vote_average: item.vote_average || null,
                runtime: item.runtime || null,
                overview: item.overview || '',
                favorite: Boolean(customData.favorite),
                watched: isCompleted
            };
        } else {
            // TV Series
            const regularSeasons = item.seasons 
                ? item.seasons.filter(s => s.season_number > 0).map(s => ({
                    season_number: s.season_number,
                    episode_count: s.episode_count || 0,
                    name: s.name || `Season ${s.season_number}`
                }))
                : (item.seasons_detail || []);
            
            const totalSeasons = item.number_of_seasons || regularSeasons.length || 1;
            const totalEpisodes = item.number_of_episodes || regularSeasons.reduce((acc, s) => acc + (s.episode_count || 0), 0) || 0;

            const lastSeason = regularSeasons.length > 0 ? regularSeasons[regularSeasons.length - 1] : null;
            const lastSeasonNum = lastSeason ? lastSeason.season_number : totalSeasons;
            const lastSeasonEpCount = lastSeason ? lastSeason.episode_count : 1;

            const seasonToUse = isCompleted 
                ? lastSeasonNum 
                : (customData.currentSeason !== undefined ? customData.currentSeason : 1);

            const episodeToUse = isCompleted 
                ? lastSeasonEpCount 
                : (customData.currentEpisode !== undefined ? customData.currentEpisode : (initialStatus === 'watching' ? 1 : 0));

            let statusToUse = initialStatus;
            if (isCompleted) {
                statusToUse = 'completed';
            } else if (episodeToUse > 0) {
                statusToUse = 'watching';
            } else {
                statusToUse = 'plan_to_watch';
            }

            newItem = {
                id: item.id,
                title: item.title || item.name,
                poster_path: posterVal,
                poster: posterVal,
                release_date: dateVal,
                first_air_date: dateVal,
                year: dateVal,
                vote_average: item.vote_average || null,
                overview: item.overview || '',
                total_seasons: totalSeasons,
                total_episodes: totalEpisodes,
                seasons_detail: regularSeasons,
                currentSeason: seasonToUse,
                currentEpisode: episodeToUse,
                status: statusToUse,
                favorite: Boolean(customData.favorite),
                watched: isCompleted
            };
        }

        const updatedList = {
            ...watchlist,
            [listType]: [newItem, ...watchlist[listType]]
        };

        setWatchlist(updatedList);
        await saveWatchlistData(updatedList);
        notify(`Added “${newItem.title || 'title'}” to Reelcase`, 'success');
        return true;
    }, [user, watchlist, saveWatchlistData]);

    const toggleWatched = useCallback(async (id, type) => {
        if (!user) return;
        const listType = type === 'movie' ? 'movies' : 'series';
        
        const updatedList = {
            ...watchlist,
            [listType]: watchlist[listType].map(i => {
                if (i.id !== id) return i;
                
                if (type === 'movie') {
                    const nextWatched = !i.watched;
                    notify(nextWatched ? `Marked “${i.title}” as watched` : `Marked “${i.title}” as unwatched`, 'info');
                    return { ...i, watched: nextWatched };
                } else {
                    const willBeWatched = !i.watched;
                    if (!willBeWatched) {
                        notify(`Moved “${i.title}” back to Plan to Watch`, 'info');
                        return {
                            ...i,
                            watched: false,
                            status: 'plan_to_watch',
                            currentEpisode: 0
                        };
                    }
                    const seasons = i.seasons_detail || [];
                    const lastSeason = seasons.length > 0 ? seasons[seasons.length - 1] : null;
                    const lastSeasonNum = lastSeason ? lastSeason.season_number : (i.total_seasons || i.currentSeason || 1);
                    const lastEpCount = lastSeason ? (lastSeason.episode_count || 1) : (i.total_episodes || 1);
                    notify(`Marked all of “${i.title}” as completed!`, 'success');
                    return {
                        ...i,
                        watched: true,
                        status: 'completed',
                        currentSeason: lastSeasonNum,
                        currentEpisode: lastEpCount
                    };
                }
            })
        };

        setWatchlist(updatedList);
        await saveWatchlistData(updatedList);
    }, [user, watchlist, saveWatchlistData]);

    const toggleFavorite = useCallback(async (id, type) => {
        if (!user) return;
        const listType = type === 'movie' ? 'movies' : 'series';
        
        let isFavNow = false;
        const updatedList = {
            ...watchlist,
            [listType]: watchlist[listType].map(i => {
                if (i.id !== id) return i;
                isFavNow = !i.favorite;
                return { ...i, favorite: isFavNow };
            })
        };

        setWatchlist(updatedList);
        await saveWatchlistData(updatedList);
        notify(isFavNow ? 'Added to favorites' : 'Removed from favorites', 'info');
    }, [user, watchlist, saveWatchlistData]);

    const updateSeriesProgress = useCallback(async (id, updates) => {
        if (!user) return;

        const updatedList = {
            ...watchlist,
            series: watchlist.series.map(s => {
                if (s.id !== id) return s;

                const merged = { ...s, ...updates };
                
                if (updates.status) {
                    merged.status = updates.status;
                    merged.watched = updates.status === 'completed';
                } else if (updates.watched !== undefined) {
                    merged.watched = updates.watched;
                    merged.status = updates.watched ? 'completed' : (merged.currentEpisode > 0 ? 'watching' : 'plan_to_watch');
                } else if (merged.currentEpisode > 0) {
                    if (merged.status !== 'completed') {
                        merged.status = 'watching';
                        merged.watched = false;
                    }
                } else if (merged.currentEpisode === 0 && merged.status === 'watching') {
                    merged.status = 'plan_to_watch';
                    merged.watched = false;
                }

                return merged;
            })
        };

        setWatchlist(updatedList);
        await saveWatchlistData(updatedList);
    }, [user, watchlist, saveWatchlistData]);

    const incrementEpisode = useCallback(async (id) => {
        if (!user) return;
        const seriesItem = watchlist.series.find(s => s.id === id);
        if (!seriesItem) return;

        const curSeason = seriesItem.currentSeason || 1;
        const curEp = seriesItem.currentEpisode || 0;
        const seasons = seriesItem.seasons_detail || [];
        const curSeasonObj = seasons.find(s => s.season_number === curSeason);
        const curSeasonMaxEp = curSeasonObj?.episode_count || (seriesItem.total_episodes ? Math.ceil(seriesItem.total_episodes / (seriesItem.total_seasons || 1)) : 99);

        if (curEp < curSeasonMaxEp) {
            await updateSeriesProgress(id, {
                currentSeason: curSeason,
                currentEpisode: curEp + 1,
                status: 'watching',
                watched: false
            });
            notify(`Watched S${curSeason} E${curEp + 1}`, 'info');
        } else {
            const nextSeasonNumber = curSeason + 1;
            const hasMoreSeasons = seasons.some(s => s.season_number === nextSeasonNumber) || 
                                   (seriesItem.total_seasons && nextSeasonNumber <= seriesItem.total_seasons);

            if (hasMoreSeasons) {
                await updateSeriesProgress(id, {
                    currentSeason: nextSeasonNumber,
                    currentEpisode: 1,
                    status: 'watching',
                    watched: false
                });
                notify(`Started Season ${nextSeasonNumber}!`, 'info');
            } else {
                await updateSeriesProgress(id, {
                    currentSeason: curSeason,
                    currentEpisode: curSeasonMaxEp,
                    status: 'completed',
                    watched: true
                });
                notify(`Completed “${seriesItem.title}”! 🎉`, 'success');
            }
        }
    }, [user, watchlist, updateSeriesProgress]);

    const decrementEpisode = useCallback(async (id) => {
        if (!user) return;
        const seriesItem = watchlist.series.find(s => s.id === id);
        if (!seriesItem) return;

        const curSeason = seriesItem.currentSeason || 1;
        const curEp = seriesItem.currentEpisode || 0;
        const seasons = seriesItem.seasons_detail || [];

        if (curEp > 1) {
            await updateSeriesProgress(id, {
                currentSeason: curSeason,
                currentEpisode: curEp - 1,
                status: 'watching',
                watched: false
            });
        } else if (curEp === 1) {
            if (curSeason > 1) {
                const prevSeasonNumber = curSeason - 1;
                const prevSeasonObj = seasons.find(s => s.season_number === prevSeasonNumber);
                const prevSeasonMaxEp = prevSeasonObj?.episode_count || 1;
                await updateSeriesProgress(id, {
                    currentSeason: prevSeasonNumber,
                    currentEpisode: prevSeasonMaxEp,
                    status: 'watching',
                    watched: false
                });
            } else {
                await updateSeriesProgress(id, {
                    currentSeason: 1,
                    currentEpisode: 0,
                    status: 'plan_to_watch',
                    watched: false
                });
            }
        }
    }, [user, watchlist, updateSeriesProgress]);

    const importWatchlist = useCallback(async (importedData) => {
        if (!user) return false;
        try {
            if (!importedData || (!Array.isArray(importedData.movies) && !Array.isArray(importedData.series))) {
                throw new Error("Invalid library backup file format.");
            }

            const mergedMoviesMap = new Map();
            watchlist.movies.forEach(m => mergedMoviesMap.set(m.id, m));
            (importedData.movies || []).forEach(m => {
                if (m && m.id) mergedMoviesMap.set(m.id, normalizeItem(m));
            });

            const mergedSeriesMap = new Map();
            watchlist.series.forEach(s => mergedSeriesMap.set(s.id, s));
            (importedData.series || []).forEach(s => {
                if (s && s.id) mergedSeriesMap.set(s.id, normalizeItem(s));
            });

            const updatedList = {
                movies: Array.from(mergedMoviesMap.values()),
                series: Array.from(mergedSeriesMap.values())
            };

            setWatchlist(updatedList);
            await saveWatchlistData(updatedList);
            notify(`Restored ${updatedList.movies.length} movies & ${updatedList.series.length} series!`, 'success');
            return true;
        } catch (err) {
            console.error("Import error:", err);
            notify(err.message || "Failed to import library", 'error');
            return false;
        }
    }, [user, watchlist, saveWatchlistData]);

    const value = {
        watchlist,
        addToWatchlist,
        removeFromWatchlist,
        toggleWatched,
        toggleFavorite,
        updateSeriesProgress,
        incrementEpisode,
        decrementEpisode,
        deleteModalState,
        requestDelete,
        cancelDelete,
        confirmDelete,
        importWatchlist
    };

    return (
        <WatchlistContext.Provider value={value}>
            {children}
        </WatchlistContext.Provider>
    );
};
