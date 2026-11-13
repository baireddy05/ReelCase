import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { notify } from '../../utils/notifications';
import { Eye, EyeOff, X, Lock, Mail } from 'lucide-react';

const formatAuthError = (err) => {
    const code = err?.code || '';
    if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) {
        return 'Invalid email or password. Please check your credentials.';
    }
    if (code.includes('email-already-in-use')) {
        return 'An account with this email already exists. Try signing in.';
    }
    if (code.includes('weak-password')) {
        return 'Password should be at least 6 characters.';
    }
    if (code.includes('invalid-email')) {
        return 'Please enter a valid email address.';
    }
    if (code.includes('popup-closed-by-user')) {
        return 'Sign-in cancelled.';
    }
    return err?.message || 'Authentication failed. Please try again.';
};

const AuthModal = ({ show, onClose }) => {
    const { loginWithGoogle, loginWithEmail, signupWithEmail, resetPassword } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [isResetMode, setIsResetMode] = useState(false);

    useEffect(() => {
        if (show) {
            document.body.classList.add('modal-open');
            setError('');
        } else {
            document.body.classList.remove('modal-open');
        }
        return () => {
            document.body.classList.remove('modal-open');
        };
    }, [show]);

    if (!show) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleGoogle = async () => {
        setError('');
        try {
            await loginWithGoogle();
            notify('Signed in with Google!', 'success');
            onClose();
        } catch (err) {
            setError(formatAuthError(err));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setBusy(true);

        try {
            if (isResetMode) {
                if (!email.trim()) {
                    setError('Please enter your account email address.');
                    setBusy(false);
                    return;
                }
                await resetPassword(email.trim());
                notify('Password reset email sent! Check your inbox.', 'success');
                setIsResetMode(false);
                setBusy(false);
                return;
            }

            if (isLogin) {
                await loginWithEmail(email.trim(), password);
                notify('Welcome back to Reelcase!', 'success');
            } else {
                await signupWithEmail(email.trim(), password);
                notify('Account created successfully!', 'success');
            }
            setEmail('');
            setPassword('');
            onClose();
        } catch (err) {
            setError(formatAuthError(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="modal-overlay show" onClick={handleBackdropClick} role="dialog" aria-modal="true">
            <div className="auth-container">
                <button type="button" className="auth-close-btn" onClick={onClose} aria-label="Close">
                    <X size={18} />
                </button>

                <div className="auth-brand-header">
                    <img src="/logo.svg" alt="Reelcase" className="auth-modal-logo" width={48} height={48} />
                    <h2>{isResetMode ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Create Your Account')}</h2>
                    <p className="auth-subtitle">
                        {isResetMode 
                            ? 'Enter your email to receive password reset instructions'
                            : 'Sync your movies and series across all your devices'}
                    </p>
                </div>

                {!isResetMode && (
                    <div className="auth-mode-tabs">
                        <button 
                            type="button" 
                            className={`auth-mode-tab ${isLogin ? 'active' : ''}`}
                            onClick={() => { setIsLogin(true); setError(''); }}
                        >
                            Sign In
                        </button>
                        <button 
                            type="button" 
                            className={`auth-mode-tab ${!isLogin ? 'active' : ''}`}
                            onClick={() => { setIsLogin(false); setError(''); }}
                        >
                            Sign Up
                        </button>
                    </div>
                )}

                {!isResetMode && (
                    <>
                        <button className="google-btn" onClick={handleGoogle} type="button">
                            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                                <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.3h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.8-5 3.8-8.8z"/>
                                <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.6 2.8v.1C3.5 21.3 7.5 24 12 24z"/>
                                <path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.6-2.8-.1.1C.5 8.7 0 10.2 0 12s.5 3.3 1.4 4.7l3.8-2.3z"/>
                                <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.5 0 3.5 2.7 1.4 6.8l3.8 2.9c1-2.9 3.7-5 6.8-5z"/>
                            </svg>
                            Continue with Google
                        </button>
                        
                        <div className="divider"><span>OR WITH EMAIL</span></div>
                    </>
                )}
                
                <form id="emailLoginForm" onSubmit={handleSubmit}>
                    {error && <div className="auth-error-box">{error}</div>}
                    
                    <div className="input-group">
                        <Mail size={16} className="input-icon" />
                        <input 
                            type="email" 
                            placeholder="Email address" 
                            required 
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            autoComplete="email"
                        />
                    </div>

                    {!isResetMode && (
                        <div className="input-group">
                            <Lock size={16} className="input-icon" />
                            <input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="Password" 
                                required 
                                minLength={6}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                autoComplete={isLogin ? "current-password" : "new-password"}
                            />
                            <button 
                                type="button" 
                                className="toggle-password-btn" 
                                onClick={() => setShowPassword(!showPassword)}
                                title={showPassword ? "Hide password" : "Show password"}
                                aria-label="Toggle password visibility"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    )}

                    {isLogin && !isResetMode && (
                        <div className="forgot-password-row">
                            <button 
                                type="button" 
                                className="forgot-password-link" 
                                onClick={() => { setIsResetMode(true); setError(''); }}
                            >
                                Forgot password?
                            </button>
                        </div>
                    )}

                    <button type="submit" className="email-btn" disabled={busy}>
                        {busy ? 'Please wait...' : (
                            isResetMode ? 'Send Reset Link' : (isLogin ? 'Sign In' : 'Create Account')
                        )}
                    </button>
                </form>
                
                {isResetMode ? (
                    <button 
                        type="button" 
                        className="toggle-auth back-to-login" 
                        onClick={() => { setIsResetMode(false); setError(''); }}
                    >
                        Back to Sign In
                    </button>
                ) : (
                    <button 
                        type="button" 
                        className="toggle-auth" 
                        onClick={() => { setError(''); setIsLogin(!isLogin); }}
                    >
                        {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                    </button>
                )}
            </div>
        </div>
    );
};

export default AuthModal;
