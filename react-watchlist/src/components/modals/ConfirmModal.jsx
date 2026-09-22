import React, { useEffect } from 'react';
import { Trash2, X } from 'lucide-react';

const ConfirmModal = ({ show, item, type, onConfirm, onCancel }) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && show) {
                onCancel();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [show, onCancel]);

    if (!show || !item) return null;

    const itemTitle = item.title || item.name || 'this item';
    const typeLabel = type === 'movie' ? 'movie' : 'series';

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onCancel();
        }
    };

    return (
        <div 
            id="confirmModalOverlay" 
            className={`modal-overlay ${show ? 'show' : ''}`}
            onClick={handleBackdropClick}
        >
            <div className="modal-content confirm-modal-box">
                <button className="confirm-close-btn" onClick={onCancel} aria-label="Close">
                    <X size={18} />
                </button>
                
                <div className="confirm-icon-wrapper">
                    <div className="confirm-icon-pulse"></div>
                    <div className="confirm-icon-circle">
                        <Trash2 size={28} className="confirm-icon" />
                    </div>
                </div>

                <h2>Remove from Watchlist?</h2>
                
                <p className="confirm-message">
                    Are you sure you want to remove <span className="confirm-item-name">"{itemTitle}"</span> from your {typeLabel} list?
                </p>
                
                <p className="confirm-submessage">
                    This will delete all saved watch progress and records for this title.
                </p>

                <div className="modal-actions">
                    <button 
                        className="modal-btn cancel" 
                        onClick={onCancel}
                        type="button"
                    >
                        Cancel
                    </button>
                    <button 
                        className="modal-btn confirm" 
                        onClick={onConfirm}
                        type="button"
                        autoFocus
                    >
                        <Trash2 size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
                        Yes, Remove
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
