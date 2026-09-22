export const SVG_PLACEHOLDER = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750" fill="%23181824"><rect width="500" height="750" fill="%2312121a"/><rect x="30" y="40" width="440" height="670" rx="16" fill="%231c1c28" stroke="%232e2e42" stroke-width="2"/><circle cx="250" cy="310" r="44" fill="%232a2a3e"/><polygon points="242,295 268,310 242,325" fill="%23818cf8"/><text x="250" y="415" dominant-baseline="middle" text-anchor="middle" fill="%23e2e8f0" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="22" font-weight="700">No Poster</text><text x="250" y="450" dominant-baseline="middle" text-anchor="middle" fill="%2364748b" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="15">Image Unavailable</text></svg>`;

export const config = {
    tmdbApiKey: import.meta.env.VITE_TMDB_API_KEY || 'a6eb2bf522ddc0f66b5a3433b55d22a5',
    tmdbBaseUrl: 'https://api.themoviedb.org/3',
    tmdbImageBaseUrl: 'https://image.tmdb.org/t/p/w500',
    placeholder: SVG_PLACEHOLDER,
    region: 'US'
};

export const getPosterUrl = (posterOrItem, size = 'w500') => {
    if (!posterOrItem) return SVG_PLACEHOLDER;
    
    let path = typeof posterOrItem === 'object' 
        ? (posterOrItem.poster_path || posterOrItem.poster) 
        : posterOrItem;

    if (!path) return SVG_PLACEHOLDER;
    path = String(path).trim();
    if (!path || path === 'null' || path === 'undefined') return SVG_PLACEHOLDER;

    // Already a data URI or full URL
    if (path.startsWith('data:') || path.startsWith('blob:')) return path;
    if (path.startsWith('http://') || path.startsWith('https://')) {
        // Fix any duplicate prefix
        if (path.includes('image.tmdb.org/t/p/w500https://image.tmdb.org/t/p/w500')) {
            return path.replace('https://image.tmdb.org/t/p/w500https://image.tmdb.org/t/p/w500', 'https://image.tmdb.org/t/p/w500');
        }
        return path;
    }

    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `https://image.tmdb.org/t/p/${size}${cleanPath}`;
};

export const handleImageError = (e) => {
    const img = e.currentTarget;
    if (!img) return;

    const currentSrc = img.src || '';
    // If direct TMDB image failed (e.g. ISP blockage or network error), try wsrv.nl proxy mirror
    if (currentSrc.includes('image.tmdb.org') && !currentSrc.includes('wsrv.nl')) {
        img.src = `https://wsrv.nl/?url=${encodeURIComponent(currentSrc)}&w=500&output=webp`;
    } else {
        // Fallback to embedded SVG placeholder
        img.onerror = null;
        img.src = SVG_PLACEHOLDER;
    }
};

export const getYear = (dateOrItem) => {
    if (!dateOrItem) return '';
    
    // If passed a movie/series item object
    if (typeof dateOrItem === 'object') {
        const raw = dateOrItem.release_date || dateOrItem.first_air_date || dateOrItem.year || dateOrItem.releaseDate;
        return getYear(raw);
    }
    
    const str = String(dateOrItem).trim();
    if (!str || str === 'null' || str === 'undefined' || str === 'N/A' || str === 'NaN') return '';

    // If it's already a 4-digit number like "2024" or 2024
    if (/^\d{4}$/.test(str)) {
        return str;
    }

    // If it starts with YYYY (e.g., "2023-11-03" or "2023/05/10")
    const match = str.match(/^(\d{4})/);
    if (match) {
        return match[1];
    }

    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
        return String(parsed.getFullYear());
    }

    return '';
};

const cache = new Map();
const MAX_CACHE_ENTRIES = 120;

const setCache = (key, value) => {
    if (cache.has(key)) cache.delete(key); // refresh LRU order
    cache.set(key, value);
    if (cache.size > MAX_CACHE_ENTRIES) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
    }
};

export const tmdb = {
    async fetch(endpoint, params = '', options = {}) {
        try {
            const url = `${config.tmdbBaseUrl}${endpoint}?api_key=${config.tmdbApiKey}${params ? '&' + params : ''}`;
            const response = await fetch(url, { signal: options.signal });
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            return await response.json();
        } catch (error) {
            if (error?.name === 'AbortError') return null;
            console.error("API Fetch Error:", error);
            return null;
        }
    },
    
    search(query, options = {}) {
        return this.fetch(`/search/multi`, `query=${encodeURIComponent(query)}`, options);
    },

    async trending(mediaType = 'all', window = 'week') {
        const cacheKey = `trending-${mediaType}-${window}`;
        if (cache.has(cacheKey)) return cache.get(cacheKey);
        const data = await this.fetch(`/trending/${mediaType}/${window}`);
        if (data?.results) setCache(cacheKey, data);
        return data;
    },
    
    async getDetails(id, type) {
        const endpointType = type === 'series' ? 'tv' : type;
        const cacheKey = `${endpointType}-${id}`;
        
        if (cache.has(cacheKey)) {
            return cache.get(cacheKey);
        }
        
        const data = await this.fetch(`/${endpointType}/${id}`, `append_to_response=watch/providers,external_ids`);
        if (data) {
            setCache(cacheKey, data);
        }
        return data;
    },

    async getSeasonDetails(tvId, seasonNumber) {
        const cacheKey = `tv-${tvId}-season-${seasonNumber}`;
        if (cache.has(cacheKey)) {
            return cache.get(cacheKey);
        }
        const data = await this.fetch(`/tv/${tvId}/season/${seasonNumber}`);
        if (data) {
            setCache(cacheKey, data);
        }
        return data;
    }
};
