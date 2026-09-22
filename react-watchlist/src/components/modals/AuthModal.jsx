import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const AuthModal = ({ show, onClose }) => {
    const { loginWithGoogle, loginWithEmail, signupWithEmail } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (show) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }
    }, [show]);

    if (!show) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleGoogle = async () => {
        try {
            await loginWithGoogle();
            onClose();
        } catch (error) {
            alert(error.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            if (isLogin) {
                await loginWithEmail(email.trim(), password);
            } else {
                await signupWithEmail(email.trim(), password);
            }
            setEmail('');
            setPassword('');
            onClose();
        } catch (err) {
            setError(err?.message || 'Authentication failed. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={`modal-overlay show`} onClick={handleBackdropClick}>
            <div className="auth-container">
                <img src="/logo.svg" alt="Reelcase logo" className="auth-modal-logo" width={56} height={56} />
                <h2>{isLogin ? 'Login to Reelcase' : 'Join Reelcase'}</h2>
                <button className="google-btn" onClick={handleGoogle} type="button">
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.3h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.8-5 3.8-8.8z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.6 2.8v.1C3.5 21.3 7.5 24 12 24z"/><path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.6-2.8-.1.1C.5 8.7 0 10.2 0 12s.5 3.3 1.4 4.7l3.8-2.3z"/><path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.5 0 3.5 2.7 1.4 6.8l3.8 2.9c1-2.9 3.7-5 6.8-5z"/></svg> Continue with Google
                </button>
                <div className="divider"><span>OR</span></div>
                
                <form id="emailLoginForm" onSubmit={handleSubmit}>
                    {error && <p className="auth-error" style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</p>}
                    <input 
                        type="email" 
                        placeholder="Email Address" 
                        required 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        required 
                        minLength={6}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    <button type="submit" className="email-btn" disabled={busy}>
                        {busy ? 'Please wait...' : (isLogin ? 'Login with Email' : 'Sign Up with Email')}
                    </button>
                </form>
                
                <a 
                    href="#" 
                    className="toggle-auth" 
                    onClick={(e) => { e.preventDefault(); setError(''); setIsLogin(!isLogin); }}
                >
                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
                </a>
            </div>
        </div>
    );
};

export default AuthModal;
