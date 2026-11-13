import React, { useEffect } from 'react';
import { Trash2, X } from 'lucide-react';
import { getPosterUrl, handleImageError, getYear } from '../../services/tmdb';

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

    const itemTitle = item.title || item.name || 'this title';
    const typeLabel = type === 'movie' ? 'movie' : 'series';
    const year = getYear(item);

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
            role="alertdialog"
            aria-modal="true"
        >
            <div className="modal-content confirm-modal-box">
                <button className="confirm-close-btn" onClick={onCancel} aria-label="Close">
                    <X size={18} />
                </button>
                
                <div className="confirm-icon-wrapper">
                    <div className="confirm-icon-pulse"></div>
                    <div className="confirm-icon-circle">
                        <Trash2 size={26} className="confirm-icon" />
                    </div>
                </div>

                <h2>Remove from Reelcase?</h2>

                {/* Preview Card */}
                <div className="confirm-preview-card">
                    <img 
                        src={getPosterUrl(item, 'w200')} 
                        alt="" 
                        onError={handleImageError} 
                        className="confirm-preview-poster"
                    />
                    <div className="confirm-preview-meta">
                        <span className="confirm-preview-title">{itemTitle}</span>
                        <span className="confirm-preview-sub">
                            {year ? `${year} &bull; ` : ''}{typeLabel.toUpperCase()}
                        </span>
                    </div>
                </div>
                
                <p className="confirm-message">
                    Are you sure you want to remove <span className="confirm-item-name">"{itemTitle}"</span> from your {typeLabel} collection?
                </p>
                
                <p className="confirm-submessage">
                    All watch progress, episode tracking, and status for this title will be deleted.
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
                        className="modal-btn confirm danger" 
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
