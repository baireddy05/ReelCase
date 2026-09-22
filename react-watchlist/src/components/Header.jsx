import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Moon, Sun, LogIn, LogOut } from 'lucide-react';

const Header = ({ setShowAuthModal, isDarkMode, setIsDarkMode }) => {
    const { user, logout } = useAuth();

    useEffect(() => {
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, [isDarkMode]);

    return (
        <header>
            <div className="brand-logo">
                <img 
                    src="/logo.svg" 
                    alt="Reelcase logo" 
                    className="app-logo-img"
                    width={38}
                    height={38}
                    fetchPriority="high"
                    onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/logo.png';
                    }}
                />
                <h1>Reelcase</h1>
            </div>
            <div className="header-actions">
                <button 
                    className="dark-mode-toggle" 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    title="Toggle Dark Mode"
                >
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                {user ? (
                    <button className="auth-btn outline" onClick={logout}>
                        <LogOut size={16} style={{ marginRight: '8px' }} /> Logout
                    </button>
                ) : (
                    <button className="auth-btn outline" onClick={() => setShowAuthModal(true)}>
                        <LogIn size={16} style={{ marginRight: '8px' }} /> Login
                    </button>
                )}
            </div>
        </header>
    );
};

export default Header;
