import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle2 } from 'lucide-react';

let toastId = 0;

export const notify = (message) => {
    window.dispatchEvent(new CustomEvent('reelcase:toast', { detail: { message, id: ++toastId } }));
};

const Toaster = () => {
    const [toasts, setToasts] = useState([]);

    const push = useCallback((message) => {
        const id = ++toastId;
        setToasts(prev => [...prev.slice(-2), { id, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 2600);
    }, []);

    useEffect(() => {
        const handler = (e) => {
            if (e?.detail?.message) push(e.detail.message);
        };
        window.addEventListener('reelcase:toast', handler);
        return () => window.removeEventListener('reelcase:toast', handler);
    }, [push]);

    if (toasts.length === 0) return null;

    return (
        <div className="toaster" aria-live="polite">
            {toasts.map(t => (
                <div key={t.id} className="toast">
                    <CheckCircle2 size={16} />
                    <span>{t.message}</span>
                </div>
            ))}
        </div>
    );
};

export default Toaster;
