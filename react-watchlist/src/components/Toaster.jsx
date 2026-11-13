import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const Toaster = () => {
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const push = useCallback((detail) => {
        const id = detail.id || Date.now();
        const message = typeof detail === 'string' ? detail : detail.message;
        const type = detail.type || 'success';
        
        setToasts(prev => [...prev.slice(-3), { id, message, type }]);

        setTimeout(() => {
            removeToast(id);
        }, 3200);
    }, [removeToast]);

    useEffect(() => {
        const handler = (e) => {
            if (e?.detail) push(e.detail);
        };
        window.addEventListener('reelcase:toast', handler);
        return () => window.removeEventListener('reelcase:toast', handler);
    }, [push]);

    if (toasts.length === 0) return null;

    return (
        <div className="toaster" aria-live="polite">
            {toasts.map(t => (
                <div key={t.id} className={`toast toast-${t.type}`}>
                    {t.type === 'error' ? (
                        <AlertCircle size={16} className="toast-icon error" />
                    ) : t.type === 'info' ? (
                        <Info size={16} className="toast-icon info" />
                    ) : (
                        <CheckCircle2 size={16} className="toast-icon success" />
                    )}
                    <span className="toast-message">{t.message}</span>
                    <button 
                        type="button" 
                        className="toast-close-btn" 
                        onClick={() => removeToast(t.id)}
                        aria-label="Dismiss toast"
                    >
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default Toaster;
