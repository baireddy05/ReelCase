import React from 'react';
import { Film, Tv, Compass } from 'lucide-react';

const BottomNav = ({ activeTab, setActiveTab }) => {
    return (
        <nav className="bottom-nav mobile-only">
            <button 
                className={`nav-item ${activeTab === 'movies' ? 'active' : ''}`}
                onClick={() => setActiveTab('movies')}
            >
                <Film size={20} />
                <span>Movies</span>
            </button>
            <button 
                className={`nav-item ${activeTab === 'series' ? 'active' : ''}`}
                onClick={() => setActiveTab('series')}
            >
                <Tv size={20} />
                <span>Series</span>
            </button>
            <button 
                className={`nav-item ${activeTab === 'discover' ? 'active' : ''}`}
                onClick={() => setActiveTab('discover')}
            >
                <Compass size={20} />
                <span>Discover</span>
            </button>
        </nav>
    );
};

export default BottomNav;
