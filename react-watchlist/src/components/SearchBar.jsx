import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, Film, Tv, Star, Plus, Check } from 'lucide-react';
import { tmdb, getPosterUrl, handleImageError, getYear } from '../services/tmdb';
import { useWatchlist } from '../contexts/WatchlistContext';
import { useAuth } from '../contexts/AuthContext';

const SearchBar = ({ onSelect }) => {
    const { watchlist, addToWatchlist } = useWatchlist();
    const { user } = useAuth();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isActive, setIsActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const searchRef = useRef(null);
    const inputRef = useRef(null);

    // Dismiss dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsActive(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Debounced search query
    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length < 2) {
            setResults([]);
            setIsActive(false);
            setLoading(false);
            setHighlightedIndex(-1);
            return;
        }

        setLoading(true);
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const data = await tmdb.search(trimmed, { signal: controller.signal });
                if (!controller.signal.aborted) {
                    if (data && data.results) {
                        const valid = data.results.filter(item => 
                            item.media_type === 'movie' || item.media_type === 'tv'
                        ).slice(0, 8);
                        setResults(valid);
                        setIsActive(true);
                    } else {
                        setResults([]);
                        setIsActive(true);
                    }
                    setLoading(false);
                    setHighlightedIndex(-1);
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setLoading(false);
                }
            }
        }, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query]);

    const handleSelect = useCallback((item) => {
        setIsActive(false);
        setQuery('');
        setHighlightedIndex(-1);
        onSelect(item.id, item.media_type === 'tv' ? 'series' : 'movie', item);
    }, [onSelect]);

    const handleClear = useCallback(() => {
        setQuery('');
        setResults([]);
        setIsActive(false);
        setHighlightedIndex(-1);
        inputRef.current?.focus();
    }, []);

    const handleKeyDown = (e) => {
        if (!isActive || results.length === 0) {
            if (e.key === 'Escape') {
                setIsActive(false);
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < results.length) {
                handleSelect(results[highlightedIndex]);
            } else if (results.length > 0) {
                handleSelect(results[0]);
            }
        } else if (e.key === 'Escape') {
            setIsActive(false);
        }
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
        <div className="search-section" ref={searchRef}>
            <div className="search-input-wrapper">
                <Search size={18} className="search-icon-left" />
                <input 
                    ref={inputRef}
                    type="text" 
                    id="searchInput" 
                    placeholder="Search movies & TV series... (Press / to focus)" 
                    autoComplete="off"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => { if (results.length > 0 || query.trim().length >= 2) setIsActive(true); }}
                    onKeyDown={handleKeyDown}
                    aria-label="Search movies and series"
                />
                
                <div className="search-input-actions">
                    {loading && <Loader2 size={16} className="search-spinner" />}
                    {query && !loading && (
                        <button 
                            type="button" 
                            className="search-clear-btn" 
                            onClick={handleClear}
                            title="Clear search"
                            aria-label="Clear search query"
                        >
                            <X size={15} />
                        </button>
                    )}
                    <kbd className="search-kbd-shortcut" title="Press / to search">/</kbd>
                </div>
            </div>
            
            {isActive && (
                <div className="search-results active">
                    {results.length > 0 ? (
                        <ul role="listbox">
                            {results.map((item, idx) => {
                                const isSeries = item.media_type === 'tv';
                                const inList = isItemInWatchlist(item);
                                const isHighlighted = idx === highlightedIndex;
                                const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
                                
                                return (
                                    <li 
                                        key={`${item.media_type}-${item.id}`} 
                                        className={`search-result-item ${isHighlighted ? 'highlighted' : ''}`}
                                        onClick={() => handleSelect(item)}
                                        onMouseEnter={() => { setHighlightedIndex(index); if (item?.id) tmdb.getDetails(item.id, item.media_type === 'tv' ? 'series' : 'movie'); }}
                                        role="option"
                                        aria-selected={isHighlighted}
                                    >
                                        <img 
                                            src={getPosterUrl(item, 'w200')} 
                                            alt="" 
                                            loading="lazy" 
                                            onError={handleImageError} 
                                        />
                                        <div className="item-info">
                                            <div className="title-row">
                                                <span className="title">{item.title || item.name}</span>
                                                <span className={`media-badge ${isSeries ? 'series' : 'movie'}`}>
                                                    {isSeries ? <Tv size={11} /> : <Film size={11} />}
                                                    {isSeries ? 'Series' : 'Movie'}
                                                </span>
                                            </div>
                                            <div className="meta-row">
                                                <span className="year">{getYear(item) || 'N/A'}</span>
                                                {rating && (
                                                    <span className="rating-pill">
                                                        <Star size={11} className="star-icon" fill="currentColor" /> {rating}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="search-item-action">
                                            {inList ? (
                                                <span className="in-list-badge" title="Already in your library">
                                                    <Check size={14} /> Added
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="quick-add-btn"
                                                    onClick={(e) => handleQuickAdd(e, item)}
                                                    title="Quick add to Watchlist"
                                                    aria-label="Add to watchlist"
                                                >
                                                    <Plus size={14} /> Add
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        query.trim().length >= 2 && !loading && (
                            <div className="search-empty-state">
                                <p>No movies or TV shows found matching <strong>"{query}"</strong></p>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchBar;
