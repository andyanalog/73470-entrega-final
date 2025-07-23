// Custom Modal System - Modern UX with SweetAlert2 Integration
// Replaces native browser dialogs with beautiful custom modals
// External Library: SweetAlert2 for enhanced notifications

class CustomModalSystem {
    constructor() {
        this.modals = new Map();
        this.modalContainer = null;
        this.activeModal = null;
        this.modalStack = [];
        
        this.createModalContainer();
        this.setupKeyboardHandlers();
        this.injectModalStyles();
        this.loadSweetAlert2();
    }

    // Load SweetAlert2 external library
    loadSweetAlert2() {
        if (!window.Swal) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sweetalert2/11.10.1/sweetalert2.min.js';
            script.onload = () => {
                // SweetAlert2 loaded successfully
                this.setupSweetAlertDefaults();
            };
            document.head.appendChild(script);

            const css = document.createElement('link');
            css.rel = 'stylesheet';
            css.href = 'https://cdnjs.cloudflare.com/ajax/libs/sweetalert2/11.10.1/sweetalert2.min.css';
            document.head.appendChild(css);
        } else {
            this.setupSweetAlertDefaults();
        }
    }

    // Setup SweetAlert2 default configurations
    setupSweetAlertDefaults() {
        if (window.Swal) {
            window.Swal.mixin({
                customClass: {
                    confirmButton: 'swal-confirm-btn',
                    cancelButton: 'swal-cancel-btn'
                },
                buttonsStyling: false
            });
        }
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

            /* SweetAlert2 custom styles */
            .swal-confirm-btn {
                background: #667eea !important;
                color: white !important;
                border: none !important;
                border-radius: 8px !important;
                padding: 12px 24px !important;
                font-weight: 600 !important;
                margin: 0 8px !important;
                transition: all 0.2s ease !important;
            }

            .swal-confirm-btn:hover {
                background: #5a6fd8 !important;
                transform: translateY(-1px) !important;
            }

            .swal-cancel-btn {
                background: #6c757d !important;
                color: white !important;
                border: none !important;
                border-radius: 8px !important;
                padding: 12px 24px !important;
                font-weight: 600 !important;
                margin: 0 8px !important;
                transition: all 0.2s ease !important;
            }

            .swal-cancel-btn:hover {
                background: #545b62 !important;
                transform: translateY(-1px) !important;
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

    // Generate unique modal ID
    generateModalId() {
        return `modal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Show a confirmation dialog (replaces native confirm)
    askConfirmation(options = {}) {
        const {
            title = 'Confirm Action',
            message = 'Are you sure you want to proceed?',
            icon = '❓',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            type = 'primary',
            dangerousAction = false
        } = options;

        // Use SweetAlert2 if available, otherwise fallback to custom modal
        if (window.Swal) {
            return window.Swal.fire({
                title: title,
                text: message,
                icon: dangerousAction ? 'warning' : 'question',
                showCancelButton: true,
                confirmButtonText: confirmText,
                cancelButtonText: cancelText,
                customClass: {
                    confirmButton: dangerousAction ? 'swal-danger-btn' : 'swal-confirm-btn',
                    cancelButton: 'swal-cancel-btn'
                }
            }).then((result) => result.isConfirmed);
        }

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
                            <button type="button" class="modal-button outline" data-action="cancel">
                                ${this.escapeHtml(cancelText)}
                            </button>
                            <button type="button" class="modal-button ${dangerousAction ? 'danger' : type}" data-action="confirm">
                                ${this.escapeHtml(confirmText)}
                            </button>
                        </div>
                    </div>
                </div>
            `;

            this.showModal(modalId, modalHTML, {
                onAction: (action) => {
                    this.closeModal(modalId);
                    resolve(action === 'confirm');
                },
                focusButton: dangerousAction ? 'cancel' : 'confirm'
            });
        });
    }

    // Show a notification dialog (replaces native alert)
    showNotification(options = {}) {
        const {
            title = 'Information',
            message = '',
            icon = 'ℹ️',
            buttonText = 'OK',
            type = 'primary'
        } = options;

        // Use SweetAlert2 if available
        if (window.Swal) {
            return window.Swal.fire({
                title: title,
                text: message,
                icon: 'info',
                confirmButtonText: buttonText,
                customClass: {
                    confirmButton: 'swal-confirm-btn'
                }
            });
        }

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
                            <button type="button" class="modal-button ${type}" data-action="ok">
                                ${this.escapeHtml(buttonText)}
                            </button>
                        </div>
                    </div>
                </div>
            `;

            this.showModal(modalId, modalHTML, {
                onAction: () => {
                    this.closeModal(modalId);
                    resolve();
                },
                focusButton: 'ok'
            });
        });
    }

    // Show an input dialog (replaces native prompt)
    requestInput(options = {}) {
        const {
            title = 'Input Required',
            message = 'Please enter a value:',
            icon = '✏️',
            placeholder = '',
            defaultValue = '',
            confirmText = 'OK',
            cancelText = 'Cancel',
            inputType = 'text',
            required = false,
            maxLength = null
        } = options;

        // Use SweetAlert2 if available
        if (window.Swal) {
            return window.Swal.fire({
                title: title,
                text: message,
                input: inputType,
                inputPlaceholder: placeholder,
                inputValue: defaultValue,
                showCancelButton: true,
                confirmButtonText: confirmText,
                cancelButtonText: cancelText,
                inputValidator: (value) => {
                    if (required && !value) {
                        return 'This field is required!';
                    }
                },
                customClass: {
                    confirmButton: 'swal-confirm-btn',
                    cancelButton: 'swal-cancel-btn'
                }
            }).then((result) => {
                return result.isConfirmed ? result.value : null;
            });
        }

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
                            <input 
                                type="${inputType}" 
                                class="modal-input" 
                                placeholder="${this.escapeHtml(placeholder)}"
                                value="${this.escapeHtml(defaultValue)}"
                                ${maxLength ? `maxlength="${maxLength}"` : ''}
                                ${required ? 'required' : ''}
                            >
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="modal-button outline" data-action="cancel">
                                ${this.escapeHtml(cancelText)}
                            </button>
                            <button type="button" class="modal-button primary" data-action="confirm">
                                ${this.escapeHtml(confirmText)}
                            </button>
                        </div>
                    </div>
                </div>
            `;

            this.showModal(modalId, modalHTML, {
                onAction: (action) => {
                    const input = this.activeModal.querySelector('.modal-input');
                    const value = input ? input.value.trim() : '';
                    
                    if (action === 'confirm') {
                        if (required && !value) {
                            input.style.borderColor = '#dc3545';
                            input.focus();
                            return; // Don't close modal
                        }
                        this.closeModal(modalId);
                        resolve(value);
                    } else {
                        this.closeModal(modalId);
                        resolve(null);
                    }
                },
                onShow: () => {
                    const input = this.activeModal.querySelector('.modal-input');
                    if (input) {
                        input.focus();
                        input.select();
                        
                        // Handle Enter key in input
                        input.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                const confirmButton = this.activeModal.querySelector('[data-action="confirm"]');
                                if (confirmButton) confirmButton.click();
                            }
                        });
                    }
                }
            });
        });
    }

    // Show a loading modal
    showLoading(options = {}) {
        const {
            title = 'Loading...',
            message = 'Please wait while we process your request.',
            icon = '⏳'
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
                    <div class="modal-loading">
                        <div class="modal-spinner"></div>
                    </div>
                    <div class="modal-body">
                        <p class="modal-message">${this.escapeHtml(message)}</p>
                    </div>
                </div>
            </div>
        `;

        this.showModal(modalId, modalHTML, {
            closeOnOverlay: false,
            closeOnEscape: false
        });

        // Return function to close loading modal
        return () => this.closeModal(modalId);
    }

    // Show custom choice dialog
    showChoice(options = {}) {
        const {
            title = 'Choose Option',
            message = 'Please select an option:',
            icon = '🤔',
            choices = [
                { value: 'option1', label: 'Option 1', type: 'primary' },
                { value: 'option2', label: 'Option 2', type: 'secondary' }
            ]
        } = options;

        return new Promise((resolve) => {
            const modalId = this.generateModalId();
            
            const choiceButtons = choices.map(choice => 
                `<button type="button" class="modal-button ${choice.type || 'outline'}" data-action="choice" data-value="${choice.value}">
                    ${this.escapeHtml(choice.label)}
                </button>`
            ).join('');
            
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

    // Show a custom modal
    showModal(modalId, html, options = {}) {
        const {
            onAction = () => {},
            onShow = () => {},
            onClose = () => {},
            closeOnOverlay = true,
            closeOnEscape = true,
            focusButton = null
        } = options;

        // Close existing modal if any
        if (this.activeModal) {
            this.modalStack.push(this.activeModal);
        }

        // Create modal element
        const modalElement = document.createElement('div');
        modalElement.className = 'modal-wrapper';
        modalElement.innerHTML = html;
        
        this.modalContainer.appendChild(modalElement);
        this.modals.set(modalId, modalElement);
        this.activeModal = modalElement;

        // Setup event listeners
        this.setupModalEventListeners(modalElement, {
            onAction,
            onClose,
            closeOnOverlay,
            closeOnEscape
        });

        // Show modal with animation
        requestAnimationFrame(() => {
            const overlay = modalElement.querySelector('.modal-overlay');
            const modal = modalElement.querySelector('.modal');
            
            if (overlay) overlay.classList.add('active');
            if (modal) modal.classList.add('active');
            
            // Focus management
            if (focusButton) {
                const button = modalElement.querySelector(`[data-action="${focusButton}"]`);
                if (button) {
                    setTimeout(() => button.focus(), 100);
                }
            }
            
            // Call onShow callback
            onShow();
        });
    }

    // Setup event listeners for a modal
    setupModalEventListeners(modalElement, options) {
        const { onAction, onClose, closeOnOverlay, closeOnEscape } = options;

        // Button click handlers
        modalElement.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action) {
                e.preventDefault();
                e.stopPropagation();
                onAction(action, e.target);
            }
        });

        // Overlay click handler
        if (closeOnOverlay) {
            const overlay = modalElement.querySelector('.modal-overlay');
            if (overlay) {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) {
                        this.closeModal();
                    }
                });
            }
        }
    }

    // Close a modal
    closeModal(modalId = null) {
        let modalToClose = modalId ? this.modals.get(modalId) : this.activeModal;
        
        if (!modalToClose) return;

        // Animate out
        const overlay = modalToClose.querySelector('.modal-overlay');
        const modal = modalToClose.querySelector('.modal');
        
        if (overlay) overlay.classList.remove('active');
        if (modal) {
            modal.classList.remove('active');
            modal.classList.add('modal-exit');
        }

        // Remove after animation
        setTimeout(() => {
            if (modalToClose.parentNode) {
                modalToClose.parentNode.removeChild(modalToClose);
            }
            
            if (modalId) {
                this.modals.delete(modalId);
            }
            
            // Handle modal stack
            if (this.activeModal === modalToClose) {
                this.activeModal = this.modalStack.pop() || null;
            }
        }, 200);
    }

    // Close all modals
    closeAllModals() {
        this.modals.forEach((modal, id) => {
            this.closeModal(id);
        });
        this.modalStack = [];
        this.activeModal = null;
    }

    // Convenience methods (renamed to avoid native dialog conflicts)
    showSuccess(message, options = {}) {
        return this.showNotification({
            title: 'Success',
            message,
            icon: '✅',
            type: 'primary',
            ...options
        });
    }

    showError(message, options = {}) {
        return this.showNotification({
            title: 'Error',
            message,
            icon: '❌',
            type: 'danger',
            ...options
        });
    }

    showWarning(message, options = {}) {
        return this.showNotification({
            title: 'Warning',
            message,
            icon: '⚠️',
            type: 'secondary',
            ...options
        });
    }

    showInfo(message, options = {}) {
        return this.showNotification({
            title: 'Information',
            message,
            icon: 'ℹ️',
            type: 'primary',
            ...options
        });
    }

    confirmDelete(itemName, options = {}) {
        return this.askConfirmation({
            title: 'Delete Confirmation',
            message: `Are you sure you want to delete "${itemName}"?\n\nThis action cannot be undone.`,
            icon: '🗑️',
            confirmText: 'Delete',
            cancelText: 'Keep',
            dangerousAction: true,
            ...options
        });
    }

    // Alias methods for backward compatibility
    confirm(options = {}) {
        return this.askConfirmation(options);
    }

    alert(options = {}) {
        return this.showNotification(options);
    }

    prompt(options = {}) {
        return this.requestInput(options);
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
// Enhanced Toast Notification System
// Provides beautiful, animated notifications for user feedback
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

    // Show persistent notification (doesn't auto-hide)
    showPersistent(message, type = 'info', icon = '') {
        return this.show({
            message,
            type,
            icon,
            duration: 0, // Never auto-hide
            closable: true
        });
    }

    // Show notification with custom action buttons
    showWithActions(message, actions, type = 'info', icon = '') {
        return this.show({
            message,
            type,
            icon,
            actions,
            duration: 8000, // Longer duration for actionable toasts
            closable: true
        });
    }

    // Batch show multiple notifications
    showBatch(notifications) {
        return notifications.map((notification, index) => {
            // Stagger the notifications slightly
            setTimeout(() => {
                this.show(notification);
            }, index * 100);
        });
    }

    // Show notification at specific position
    showAtPosition(message, position = 'top-right', options = {}) {
        const originalContainer = this.container;
        
        // Create temporary container at specified position
        const tempContainer = document.createElement('div');
        tempContainer.style.cssText = this.getPositionStyles(position);
        document.body.appendChild(tempContainer);
        
        // Temporarily switch container
        this.container = tempContainer;
        
        const toastId = this.show(options);
        
        // Restore original container after toast is shown
        setTimeout(() => {
            this.container = originalContainer;
            // Clean up temp container when toast is removed
            setTimeout(() => {
                if (tempContainer.parentNode && tempContainer.children.length === 0) {
                    tempContainer.remove();
                }
            }, 5000);
        }, 100);
        
        return toastId;
    }

    // Get position styles for different toast positions
    getPositionStyles(position) {
        const baseStyles = `
            position: fixed;
            z-index: 9999;
            max-width: 400px;
            pointer-events: none;
        `;
        
        switch (position) {
            case 'top-left':
                return baseStyles + 'top: 20px; left: 20px;';
            case 'top-center':
                return baseStyles + 'top: 20px; left: 50%; transform: translateX(-50%);';
            case 'top-right':
                return baseStyles + 'top: 20px; right: 20px;';
            case 'bottom-left':
                return baseStyles + 'bottom: 20px; left: 20px;';
            case 'bottom-center':
                return baseStyles + 'bottom: 20px; left: 50%; transform: translateX(-50%);';
            case 'bottom-right':
                return baseStyles + 'bottom: 20px; right: 20px;';
            default:
                return baseStyles + 'top: 20px; right: 20px;';
        }
    }

    // Show loading toast that can be updated
    showLoading(message = 'Loading...', options = {}) {
        const loadingToast = this.show({
            message,
            type: 'info',
            icon: '⏳',
            duration: 0, // Don't auto-hide
            closable: false,
            ...options
        });

        return {
            id: loadingToast,
            update: (newMessage) => {
                const toast = this.toasts.find(t => t.id === loadingToast);
                if (toast) {
                    const messageElement = toast.element.querySelector('div > div');
                    if (messageElement) {
                        messageElement.textContent = newMessage;
                    }
                }
            },
            complete: (successMessage = 'Complete!') => {
                this.remove(loadingToast);
                return this.success(successMessage);
            },
            error: (errorMessage = 'Error occurred') => {
                this.remove(loadingToast);
                return this.error(errorMessage);
            }
        };
    }

    // Show progress toast with percentage
    showProgress(message = 'Processing...', initialProgress = 0) {
        const progressId = `progress_${Date.now()}`;
        
        const toast = document.createElement('div');
        toast.id = progressId;
        toast.className = 'toast toast-info';
        toast.style.cssText = `
            background: white;
            color: #495057;
            padding: 16px 20px;
            margin-bottom: 12px;
            border-radius: 12px;
            border-left: 4px solid #17a2b8;
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

        toast.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span style="font-size: 18px; flex-shrink: 0;">📊</span>
                <div style="flex: 1;">
                    <div class="progress-message">${message}</div>
                    <div style="margin-top: 8px;">
                        <div style="background: #e9ecef; border-radius: 4px; height: 6px; overflow: hidden;">
                            <div class="progress-bar" style="background: #17a2b8; height: 100%; width: ${initialProgress}%; transition: width 0.3s ease;"></div>
                        </div>
                        <div class="progress-text" style="font-size: 12px; color: #6c757d; margin-top: 4px;">${initialProgress}%</div>
                    </div>
                </div>
            </div>
        `;

        this.container.appendChild(toast);
        this.toasts.push({ id: progressId, element: toast });

        // Animate in
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        });

        return {
            id: progressId,
            updateProgress: (percentage, newMessage = null) => {
                const progressBar = toast.querySelector('.progress-bar');
                const progressText = toast.querySelector('.progress-text');
                const messageElement = toast.querySelector('.progress-message');
                
                if (progressBar) progressBar.style.width = `${percentage}%`;
                if (progressText) progressText.textContent = `${percentage}%`;
                if (newMessage && messageElement) messageElement.textContent = newMessage;
            },
            complete: (successMessage = 'Complete!') => {
                this.remove(progressId);
                return this.success(successMessage);
            },
            error: (errorMessage = 'Error occurred') => {
                this.remove(progressId);
                return this.error(errorMessage);
            }
        };
    }

    // Clear all toasts
    clear() {
        this.toasts.forEach(toast => {
            if (toast.element.parentNode) {
                toast.element.parentNode.removeChild(toast.element);
            }
        });
        this.toasts = [];
    }

    // Clear toasts by type
    clearByType(type) {
        this.toasts.filter(toast => toast.element.classList.contains(`toast-${type}`))
                   .forEach(toast => this.remove(toast.id));
    }

    // Get count of active toasts
    getCount() {
        return this.toasts.length;
    }

    // Get count by type
    getCountByType(type) {
        return this.toasts.filter(toast => 
            toast.element.classList.contains(`toast-${type}`)
        ).length;
    }

    // Check if toast exists
    exists(toastId) {
        return this.toasts.some(toast => toast.id === toastId);
    }

    // Update existing toast
    updateToast(toastId, newMessage, newType = null) {
        const toast = this.toasts.find(t => t.id === toastId);
        if (!toast) return false;

        const messageElement = toast.element.querySelector('div > div');
        if (messageElement) {
            messageElement.textContent = newMessage;
        }

        if (newType) {
            toast.element.className = `toast toast-${newType}`;
            const borderColor = this.getTypeColor(newType);
            toast.element.style.borderLeftColor = borderColor;
        }

        return true;
    }

    // Set maximum number of visible toasts
    setMaxToasts(max) {
        this.maxToasts = max;
        
        // Remove excess toasts if current count exceeds max
        while (this.toasts.length > max) {
            this.remove(this.toasts[0].id);
        }
    }

    // Override show method to respect max toasts limit
    showWithLimit(options = {}) {
        if (this.maxToasts && this.toasts.length >= this.maxToasts) {
            // Remove oldest toast
            this.remove(this.toasts[0].id);
        }
        return this.show(options);
    }

    // Cleanup toast system
    cleanup() {
        this.clear();
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }

    // Debug method to get all active toasts info
    getDebugInfo() {
        return {
            totalToasts: this.toasts.length,
            toastIds: this.toasts.map(t => t.id),
            toastTypes: this.toasts.map(t => {
                const classList = Array.from(t.element.classList);
                return classList.find(cls => cls.startsWith('toast-'))?.replace('toast-', '') || 'unknown';
            }),
            containerExists: !!this.container
        };
    }
}

// Export for global use
window.CustomModalSystem = CustomModalSystem;
window.ToastNotificationSystem = ToastNotificationSystem;