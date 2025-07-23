class CustomModalSystem {
    constructor() {
        this.modals = new Map();
        this.modalContainer = null;
        this.activeModal = null;
        this.modalStack = [];
        
        this.createModalContainer();
        this.setupKeyboardHandlers();
        this.injectModalStyles();
    }

    // Create the main modal container
    createModalContainer() {
        if (this.modalContainer) return;

        this.modalContainer = document.createElement('div');
        this.modalContainer.id = 'modal-container';
        this.modalContainer.className = 'modal-container';
        document.body.appendChild(this.modalContainer);
    }

    // Inject modal styles
    injectModalStyles() {
        if (document.getElementById('modal-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'modal-styles';
        styles.textContent = `
            .modal-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                pointer-events: none;
            }

            .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                opacity: 0;
                transition: opacity 0.3s ease;
                pointer-events: auto;
                backdrop-filter: blur(4px);
            }

            .modal-overlay.active {
                opacity: 1;
            }

            .modal {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.8);
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow: hidden;
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                pointer-events: auto;
            }

            .modal.active {
                transform: translate(-50%, -50%) scale(1);
            }

            .modal-header {
                padding: 24px 24px 0 24px;
                border-bottom: none;
            }

            .modal-title {
                font-size: 20px;
                font-weight: 700;
                color: #2c3e50;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .modal-icon {
                font-size: 24px;
                flex-shrink: 0;
            }

            .modal-body {
                padding: 16px 24px 24px 24px;
                max-height: 50vh;
                overflow-y: auto;
            }

            .modal-message {
                font-size: 16px;
                line-height: 1.6;
                color: #495057;
                margin: 0;
                white-space: pre-wrap;
            }

            .modal-input {
                width: 100%;
                padding: 12px 16px;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                font-size: 16px;
                font-family: inherit;
                margin-top: 16px;
                transition: border-color 0.2s ease;
            }

            .modal-input:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }

            .modal-footer {
                padding: 0 24px 24px 24px;
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                flex-wrap: wrap;
            }

            .modal-button {
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                min-width: 100px;
            }

            .modal-button:focus {
                outline: 2px solid #667eea;
                outline-offset: 2px;
            }

            .modal-button:hover {
                transform: translateY(-1px);
            }

            .modal-button.primary {
                background: #667eea;
                color: white;
            }

            .modal-button.primary:hover {
                background: #5a6fd8;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.25);
            }

            .modal-button.danger {
                background: #dc3545;
                color: white;
            }

            .modal-button.danger:hover {
                background: #c82333;
                box-shadow: 0 4px 12px rgba(220, 53, 69, 0.25);
            }

            .modal-button.secondary {
                background: #6c757d;
                color: white;
            }

            .modal-button.secondary:hover {
                background: #545b62;
            }

            .modal-button.outline {
                background: transparent;
                color: #6c757d;
                border: 2px solid #e9ecef;
            }

            .modal-button.outline:hover {
                background: #f8f9fa;
                border-color: #6c757d;
            }

            /* Loading state */
            .modal-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 40px 24px;
            }

            .modal-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #e9ecef;
                border-top: 4px solid #667eea;
                border-radius: 50%;
                animation: modal-spin 1s linear infinite;
            }

            @keyframes modal-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            /* Mobile responsive */
            @media (max-width: 480px) {
                .modal {
                    width: 95%;
                    margin: 20px;
                }

                .modal-header,
                .modal-body,
                .modal-footer {
                    padding-left: 16px;
                    padding-right: 16px;
                }

                .modal-footer {
                    flex-direction: column;
                }

                .modal-button {
                    width: 100%;
                }
            }

            /* Animation classes */
            .modal-enter {
                animation: modalEnter 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            .modal-exit {
                animation: modalExit 0.2s ease-in;
            }

            @keyframes modalEnter {
                from {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
            }

            @keyframes modalExit {
                from {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                to {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
            }
        `;
        document.head.appendChild(styles);
    }

    // Setup keyboard event handlers
    setupKeyboardHandlers() {
        document.addEventListener('keydown', (e) => {
            if (!this.activeModal) return;

            switch (e.key) {
                case 'Escape':
                    e.preventDefault();
                    this.closeModal();
                    break;
                case 'Enter':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        const primaryButton = this.activeModal.querySelector('.modal-button.primary');
                        if (primaryButton) primaryButton.click();
                    }
                    break;
                case 'Tab':
                    this.handleTabNavigation(e);
                    break;
            }
        });
    }

    // Handle tab navigation within modal
    handleTabNavigation(e) {
        if (!this.activeModal) return;

        const focusableElements = this.activeModal.querySelectorAll(
            'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    // Show a confirmation dialog
    confirm(options = {}) {
        const {
            title = 'Confirm Action',
            message = 'Are you sure you want to proceed?',
            icon = '❓',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            type = 'primary',
            dangerousAction = false
        } = options;

        return new Promise((resolve) => {
            const modalId = this.generateModalId();
            
            const modalHTML = `
                <div class="modal-overlay">
                    <div class="modal">
                        <div class="modal-header">
                            <h3 class="modal-title">
                                <span class="modal-icon">${icon}</span>
                                ${this.escapeHtml(title)}
                            </h3>
                        </div>
                        <div class="modal-body">
                            <p class="modal-message">${this.escapeHtml(message)}</p>
                        </div>
                        <div class="modal-footer">
                            ${choiceButtons}
                            <button type="button" class="modal-button outline" data-action="cancel">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            `;

            this.showModal(modalId, modalHTML, {
                onAction: (action, button) => {
                    if (action === 'choice') {
                        const value = button.dataset.value;
                        this.closeModal(modalId);
                        resolve(value);
                    } else if (action === 'cancel') {
                        this.closeModal(modalId);
                        resolve(null);
                    }
                }
            });
        });
    }

    // Show progress modal with updates
    showProgress(options = {}) {
        const {
            title = 'Processing...',
            message = 'Please wait while we process your request.',
            icon = '⏳',
            showPercentage = true,
            cancellable = false
        } = options;

        const modalId = this.generateModalId();
        
        const modalHTML = `
            <div class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h3 class="modal-title">
                            <span class="modal-icon">${icon}</span>
                            ${this.escapeHtml(title)}
                        </h3>
                    </div>
                    <div class="modal-body">
                        <p class="modal-message">${this.escapeHtml(message)}</p>
                        ${showPercentage ? '<div class="progress-container"><div class="progress-bar"></div><span class="progress-text">0%</span></div>' : ''}
                    </div>
                    ${cancellable ? '<div class="modal-footer"><button type="button" class="modal-button outline" data-action="cancel">Cancel</button></div>' : ''}
                </div>
            </div>
        `;

        let onCancel = () => {};

        this.showModal(modalId, modalHTML, {
            closeOnOverlay: false,
            closeOnEscape: cancellable,
            onAction: (action) => {
                if (action === 'cancel') {
                    this.closeModal(modalId);
                    onCancel();
                }
            }
        });

        return {
            updateProgress: (percentage, message) => {
                const modal = this.modals.get(modalId);
                if (modal) {
                    const progressBar = modal.querySelector('.progress-bar');
                    const progressText = modal.querySelector('.progress-text');
                    const messageEl = modal.querySelector('.modal-message');
                    
                    if (progressBar) progressBar.style.width = `${percentage}%`;
                    if (progressText) progressText.textContent = `${Math.round(percentage)}%`;
                    if (message && messageEl) messageEl.textContent = message;
                }
            },
            close: () => this.closeModal(modalId),
            onCancel: (callback) => { onCancel = callback; }
        };
    }

    // Clean up modal system
    cleanup() {
        this.closeAllModals();
        
        if (this.modalContainer) {
            this.modalContainer.remove();
            this.modalContainer = null;
        }
        
        const styles = document.getElementById('modal-styles');
        if (styles) styles.remove();
    }
}

// Enhanced Toast Notification System
class ToastNotificationSystem {
    constructor() {
        this.toasts = [];
        this.container = null;
        this.createContainer();
    }

    createContainer() {
        if (this.container) return;

        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 400px;
            pointer-events: none;
        `;
        document.body.appendChild(this.container);
    }

    show(options = {}) {
        const {
            message = '',
            type = 'info',
            duration = 4000,
            icon = '',
            closable = true,
            actions = []
        } = options;

        const toastId = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            background: white;
            color: #495057;
            padding: 16px 20px;
            margin-bottom: 12px;
            border-radius: 12px;
            border-left: 4px solid ${this.getTypeColor(type)};
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            font-weight: 500;
            font-size: 14px;
            pointer-events: auto;
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            max-width: 100%;
            word-wrap: break-word;
        `;

        const actionsHTML = actions.length > 0 ? 
            `<div style="margin-top: 12px; display: flex; gap: 8px;">
                ${actions.map(action => 
                    `<button style="padding: 6px 12px; background: ${this.getTypeColor(type)}; color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;" onclick="${action.onClick}">${action.label}</button>`
                ).join('')}
            </div>` : '';

        toast.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                ${icon ? `<span style="font-size: 18px; flex-shrink: 0;">${icon}</span>` : ''}
                <div style="flex: 1;">
                    <div>${message}</div>
                    ${actionsHTML}
                </div>
                ${closable ? '<button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 18px; cursor: pointer; padding: 0; margin-left: 8px; color: #adb5bd;">×</button>' : ''}
            </div>
        `;

        this.container.appendChild(toast);
        this.toasts.push({ id: toastId, element: toast });

        // Animate in
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        });

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                this.remove(toastId);
            }, duration);
        }

        return toastId;
    }

    remove(toastId) {
        const toastIndex = this.toasts.findIndex(t => t.id === toastId);
        if (toastIndex === -1) return;

        const toast = this.toasts[toastIndex].element;
        
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            this.toasts.splice(toastIndex, 1);
        }, 300);
    }

    getTypeColor(type) {
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        return colors[type] || colors.info;
    }

    success(message, options = {}) {
        return this.show({
            message,
            type: 'success',
            icon: '✅',
            ...options
        });
    }

    error(message, options = {}) {
        return this.show({
            message,
            type: 'error',
            icon: '❌',
            ...options
        });
    }

    warning(message, options = {}) {
        return this.show({
            message,
            type: 'warning',
            icon: '⚠️',
            ...options
        });
    }

    info(message, options = {}) {
        return this.show({
            message,
            type: 'info',
            icon: 'ℹ️',
            ...options
        });
    }

    clear() {
        this.toasts.forEach(toast => {
            if (toast.element.parentNode) {
                toast.element.parentNode.removeChild(toast.element);
            }
        });
        this.toasts = [];
    }

    cleanup() {
        this.clear();
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }
}

// Export for global use
window.CustomModalSystem = CustomModalSystem;
window.ToastNotificationSystem = ToastNotificationSystem;