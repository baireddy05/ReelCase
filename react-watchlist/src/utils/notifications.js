// Global notification dispatcher for Reelcase toasts

let toastId = 0;

export const notify = (message, type = 'success') => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(
            new CustomEvent('reelcase:toast', {
                detail: {
                    message,
                    type,
                    id: ++toastId
                }
            })
        );
    }
};

