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

    const displayName = user?.displayName || user?.email?.split('@')[0] || '';
    const initial = displayName ? displayName.charAt(0).toUpperCase() : 'U';

    return (
        <header>
            <div className="brand-logo" tabIndex={0} role="banner">
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
                <div className="brand-title-wrap">
                    <h1>Reelcase</h1>
                    <span className="brand-badge">Tracker</span>
                </div>
            </div>

            <div className="header-actions">
                <button 
                    type="button"
                    className="dark-mode-toggle" 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    aria-label="Toggle Dark Mode"
                >
                    {isDarkMode ? <Sun size={19} /> : <Moon size={19} />}
                </button>

                {user ? (
                    <div className="user-profile-header">
                        <div className="user-avatar" title={`Logged in as ${user.email}`}>
                            {user.photoURL ? (
                                <img src={user.photoURL} alt={displayName} className="user-avatar-img" />
                            ) : (
                                <span>{initial}</span>
                            )}
                        </div>
                        <button 
                            type="button" 
                            className="auth-btn outline logout-btn" 
                            onClick={logout}
                            title="Sign out of Reelcase"
                        >
                            <LogOut size={15} /> 
                            <span className="btn-label">Logout</span>
                        </button>
                    </div>
                ) : (
                    <button 
                        type="button" 
                        className="auth-btn outline login-btn" 
                        onClick={() => setShowAuthModal(true)}
                    >
                        <LogIn size={15} /> 
                        <span className="btn-label">Login</span>
                    </button>
                )}
            </div>
        </header>
    );
};

export default Header;
