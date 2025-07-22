/**
 * Error Handling System - Production Version
 * Comprehensive error management with user-friendly feedback
 */

class ErrorHandlingSystem {
    constructor(modalSystem, toastSystem) {
        this.modalSystem = modalSystem;
        this.toastSystem = toastSystem;
        this.errorLog = [];
        this.errorCallbacks = new Map();
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        
        this.setupGlobalErrorHandlers();
        this.setupNetworkErrorHandling();
        this.initializeErrorCategories();
    }

    /**
     * Initialize error categories and their handling strategies
     */
    initializeErrorCategories() {
        this.errorCategories = {
            NETWORK: {
                title: 'Connection Issue',
                icon: '🌐',
                retryable: true,
                userMessage: 'There seems to be a connection problem. Please check your internet connection.',
                suggestedActions: ['Check internet connection', 'Try again in a moment', 'Work offline']
            },
            VALIDATION: {
                title: 'Input Error',
                icon: '⚠️',
                retryable: false,
                userMessage: 'Please check your input and try again.',
                suggestedActions: ['Review your input', 'Check required fields', 'Follow the format guidelines']
            },
            STORAGE: {
                title: 'Storage Issue',
                icon: '💾',
                retryable: true,
                userMessage: 'Unable to save your data. Your browser storage might be full.',
                suggestedActions: ['Clear browser cache', 'Free up storage space', 'Export your data as backup']
            },
            PERMISSION: {
                title: 'Permission Required',
                icon: '🔒',
                retryable: true,
                userMessage: 'Additional permissions are needed to complete this action.',
                suggestedActions: ['Grant the requested permission', 'Check browser settings', 'Reload the page']
            },
            AUDIO: {
                title: 'Audio Issue',
                icon: '🎤',
                retryable: true,
                userMessage: 'There was a problem with audio recording or playback.',
                suggestedActions: ['Check microphone permissions', 'Test your microphone', 'Try a different browser']
            },
            FILE: {
                title: 'File Error',
                icon: '📁',
                retryable: false,
                userMessage: 'There was a problem with the file operation.',
                suggestedActions: ['Check file format', 'Verify file size', 'Try a different file']
            },
            UNKNOWN: {
                title: 'Unexpected Error',
                icon: '❌',
                retryable: true,
                userMessage: 'Something unexpected happened. Don\'t worry, your data is safe.',
                suggestedActions: ['Try again', 'Refresh the page', 'Contact support if problem persists']
            }
        };
    }

    /**
     * Setup global error handlers
     */
    setupGlobalErrorHandlers() {
        // Handle uncaught JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleGlobalError({
                type: 'JAVASCRIPT_ERROR',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                category: 'UNKNOWN'
            });
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleGlobalError({
                type: 'UNHANDLED_REJECTION',
                message: event.reason?.message || 'Unhandled promise rejection',
                error: event.reason,
                category: this.categorizeError(event.reason)
            });
            
            // Prevent the default browser handling
            event.preventDefault();
        });

        // Handle resource loading errors
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.handleResourceError({
                    type: 'RESOURCE_ERROR',
                    element: event.target.tagName,
                    source: event.target.src || event.target.href,
                    message: `Failed to load ${event.target.tagName.toLowerCase()}`
                });
            }
        }, true);
    }

    /**
     * Setup network error handling
     */
    setupNetworkErrorHandling() {
        // Monitor online/offline status
        window.addEventListener('online', () => {
            this.handleNetworkRestore();
        });

        window.addEventListener('offline', () => {
            this.handleNetworkLoss();
        });
    }

    /**
     * Main error handling method
     * @param {Error|Object} error - Error object or error info
     * @param {Object} context - Additional context
     * @param {Object} options - Handling options
     */
    async handleError(error, context = {}, options = {}) {
        try {
            // Normalize error object
            const normalizedError = this.normalizeError(error, context);
            
            // Log the error (development only or specific cases)
            this.logError(normalizedError);
            
            // Categorize the error
            const category = this.categorizeError(normalizedError);
            normalizedError.category = category;
            
            // Apply error handling strategy
            const strategy = this.getHandlingStrategy(normalizedError, options);
            
            // Execute strategy
            await this.executeErrorStrategy(normalizedError, strategy);
            
            return {
                handled: true,
                category,
                strategy: strategy.type,
                errorId: normalizedError.id
            };
            
        } catch (handlingError) {
            this.showFallbackError();
            return { handled: false, error: handlingError };
        }
    }

    /**
     * Normalize error into consistent format
     * @param {Error|Object} error - Raw error
     * @param {Object} context - Additional context
     * @returns {Object} Normalized error
     */
    normalizeError(error, context = {}) {
        const normalized = {
            id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            context: { ...context },
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        if (error instanceof Error) {
            normalized.name = error.name;
            normalized.message = error.message;
            normalized.stack = error.stack;
            normalized.type = 'EXCEPTION';
        } else if (typeof error === 'object') {
            Object.assign(normalized, error);
        } else {
            normalized.message = String(error);
            normalized.type = 'UNKNOWN';
        }

        return normalized;
    }

    /**
     * Categorize error based on its characteristics
     * @param {Object} error - Normalized error
     * @returns {string} Error category
     */
    categorizeError(error) {
        const message = (error.message || '').toLowerCase();
        const name = (error.name || '').toLowerCase();
        
        // Network errors
        if (message.includes('fetch') || message.includes('network') || 
            message.includes('connection') || name.includes('networkerror')) {
            return 'NETWORK';
        }
        
        // Storage errors
        if (message.includes('storage') || message.includes('quota') || 
            name.includes('quotaexceedederror')) {
            return 'STORAGE';
        }
        
        // Permission errors
        if (message.includes('permission') || message.includes('denied') || 
            message.includes('not allowed') || name.includes('notallowederror')) {
            return 'PERMISSION';
        }
        
        // Audio/Media errors
        if (message.includes('audio') || message.includes('microphone') || 
            message.includes('media') || name.includes('mediaerror')) {
            return 'AUDIO';
        }
        
        // File errors
        if (message.includes('file') || message.includes('blob') || 
            message.includes('upload') || message.includes('download')) {
            return 'FILE';
        }
        
        // Validation errors
        if (message.includes('validation') || message.includes('invalid') || 
            message.includes('required') || error.type === 'VALIDATION') {
            return 'VALIDATION';
        }
        
        return 'UNKNOWN';
    }

    /**
     * Get handling strategy for error
     * @param {Object} error - Normalized error
     * @param {Object} options - Options
     * @returns {Object} Handling strategy
     */
    getHandlingStrategy(error, options = {}) {
        const category = this.errorCategories[error.category] || this.errorCategories.UNKNOWN;
        
        const strategy = {
            type: 'TOAST', // Default to toast notification
            showModal: false,
            allowRetry: category.retryable && !options.noRetry,
            autoRetry: false,
            showDetails: options.showDetails || false,
            silent: options.silent || false
        };

        // Determine strategy based on severity and context
        if (error.severity === 'critical' || error.context?.critical) {
            strategy.type = 'MODAL';
            strategy.showModal = true;
        } else if (error.category === 'VALIDATION') {
            strategy.type = 'INLINE';
            strategy.allowRetry = false;
        } else if (error.category === 'NETWORK' && navigator.onLine === false) {
            strategy.type = 'OFFLINE_BANNER';
        } else if (options.userInitiated) {
            strategy.type = 'MODAL';
            strategy.showModal = true;
            strategy.allowRetry = true;
        }

        // Auto-retry for certain categories
        if (error.category === 'NETWORK' && this.getRetryCount(error.context?.operation) < this.maxRetries) {
            strategy.autoRetry = true;
            strategy.retryDelay = Math.pow(2, this.getRetryCount(error.context?.operation)) * 1000;
        }

        return strategy;
    }

    /**
     * Execute error handling strategy
     * @param {Object} error - Normalized error
     * @param {Object} strategy - Handling strategy
     */
    async executeErrorStrategy(error, strategy) {
        if (strategy.silent) {
            return;
        }

        const category = this.errorCategories[error.category];
        
        switch (strategy.type) {
            case 'TOAST':
                await this.showToastError(error, category, strategy);
                break;
                
            case 'MODAL':
                await this.showModalError(error, category, strategy);
                break;
                
            case 'INLINE':
                await this.showInlineError(error, category, strategy);
                break;
                
            case 'OFFLINE_BANNER':
                await this.showOfflineBanner(error, category);
                break;
                
            default:
                await this.showToastError(error, category, strategy);
        }

        // Handle retry logic
        if (strategy.autoRetry) {
            setTimeout(() => {
                this.attemptRetry(error);
            }, strategy.retryDelay || 1000);
        }
    }

    /**
     * Show toast error notification
     * @param {Object} error - Error object
     * @param {Object} category - Error category
     * @param {Object} strategy - Strategy object
     */
    async showToastError(error, category, strategy) {
        const actions = [];
        
        if (strategy.allowRetry) {
            actions.push({
                label: 'Retry',
                onClick: `window.errorHandler.retryOperation('${error.id}')`
            });
        }
        
        if (strategy.showDetails) {
            actions.push({
                label: 'Details',
                onClick: `window.errorHandler.showErrorDetails('${error.id}')`
            });
        }

        this.toastSystem.error(category.userMessage, {
            duration: strategy.allowRetry ? 8000 : 4000,
            actions
        });
    }

    /**
     * Show modal error dialog
     * @param {Object} error - Error object
     * @param {Object} category - Error category
     * @param {Object} strategy - Strategy object
     */
    async showModalError(error, category, strategy) {
        const actions = [];
        
        if (strategy.allowRetry) {
            actions.push({
                label: 'Try Again',
                action: 'retry',
                type: 'primary'
            });
        }
        
        actions.push({
            label: 'OK',
            action: 'dismiss',
            type: 'outline'
        });

        const result = await this.modalSystem.showChoice({
            title: category.title,
            message: this.buildErrorMessage(error, category, strategy),
            icon: category.icon,
            choices: actions
        });

        if (result === 'retry') {
            await this.attemptRetry(error);
        }
    }

    /**
     * Show inline error (for form validation)
     * @param {Object} error - Error object
     * @param {Object} category - Error category
     * @param {Object} strategy - Strategy object
     */
    async showInlineError(error, category, strategy) {
        // This would be called with a specific form field context
        const targetElement = error.context?.element;
        if (targetElement) {
            this.highlightErrorField(targetElement, category.userMessage);
        } else {
            // Fallback to toast if no target element
            await this.showToastError(error, category, strategy);
        }
    }

    /**
     * Show offline banner
     * @param {Object} error - Error object
     * @param {Object} category - Error category
     */
    async showOfflineBanner(error, category) {
        const banner = this.createOfflineBanner();
        document.body.appendChild(banner);
    }

    /**
     * Build comprehensive error message
     * @param {Object} error - Error object
     * @param {Object} category - Error category
     * @param {Object} strategy - Strategy object
     * @returns {string} Formatted message
     */
    buildErrorMessage(error, category, strategy) {
        let message = category.userMessage;
        
        if (strategy.showDetails && error.message) {
            message += `\n\nTechnical details: ${error.message}`;
        }
        
        if (category.suggestedActions.length > 0) {
            message += '\n\nSuggested actions:\n';
            message += category.suggestedActions.map(action => `• ${action}`).join('\n');
        }
        
        return message;
    }

    /**
     * Highlight form field with error
     * @param {HTMLElement} element - Target element
     * @param {string} message - Error message
     */
    highlightErrorField(element, message) {
        // Add error styling
        element.style.borderColor = '#dc3545';
        element.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.1)';
        
        // Show error message
        let errorElement = element.parentNode.querySelector('.field-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            errorElement.style.cssText = `
                color: #dc3545;
                font-size: 12px;
                margin-top: 4px;
                font-weight: 500;
            `;
            element.parentNode.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
        
        // Remove error styling when user starts typing
        const clearError = () => {
            element.style.borderColor = '';
            element.style.boxShadow = '';
            if (errorElement) {
                errorElement.remove();
            }
            element.removeEventListener('input', clearError);
            element.removeEventListener('focus', clearError);
        };
        
        element.addEventListener('input', clearError);
        element.addEventListener('focus', clearError);
    }

    /**
     * Create offline banner
     * @returns {HTMLElement} Banner element
     */
    createOfflineBanner() {
        const banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #ffc107;
            color: #212529;
            padding: 12px 20px;
            text-align: center;
            font-weight: 600;
            z-index: 9999;
            transform: translateY(-100%);
            transition: transform 0.3s ease;
        `;
        
        banner.innerHTML = `
            <span>📴 You're currently offline. Some features may be limited.</span>
            <button onclick="this.parentElement.remove()" style="
                background: none;
                border: none;
                color: inherit;
                font-size: 18px;
                cursor: pointer;
                margin-left: 20px;
            ">×</button>
        `;
        
        // Animate in
        setTimeout(() => {
            banner.style.transform = 'translateY(0)';
        }, 100);
        
        return banner;
    }

    /**
     * Attempt to retry a failed operation
     * @param {Object} error - Original error
     */
    async attemptRetry(error) {
        const operation = error.context?.operation;
        if (!operation) return;
        
        const retryCount = this.incrementRetryCount(operation);
        
        if (retryCount > this.maxRetries) {
            this.toastSystem.error('Maximum retry attempts reached. Please try again later.');
            return;
        }
        
        this.toastSystem.info(`Retrying... (${retryCount}/${this.maxRetries})`);
        
        try {
            // Execute the retry callback if available
            const callback = this.errorCallbacks.get(operation);
            if (callback) {
                await callback();
                this.toastSystem.success('Operation completed successfully!');
                this.resetRetryCount(operation);
            }
        } catch (retryError) {
            await this.handleError(retryError, { 
                ...error.context, 
                isRetry: true,
                retryCount
            });
        }
    }

    /**
     * Register retry callback for an operation
     * @param {string} operation - Operation identifier
     * @param {Function} callback - Retry callback
     */
    registerRetryCallback(operation, callback) {
        this.errorCallbacks.set(operation, callback);
    }

    /**
     * Handle storage quota errors
     * @param {Object} error - Storage error
     */
    async handleStorageError(error) {
        const choices = [
            { value: 'clear_cache', label: 'Clear Cache', type: 'primary' },
            { value: 'export_data', label: 'Export Data First', type: 'secondary' },
            { value: 'continue', label: 'Continue Anyway', type: 'outline' }
        ];
        
        const choice = await this.modalSystem.showChoice({
            title: 'Storage Full',
            message: 'Your browser storage is full. Choose an action to continue:',
            icon: '💾',
            choices
        });
        
        switch (choice) {
            case 'clear_cache':
                await this.clearStorageCache();
                break;
            case 'export_data':
                window.exportNotes?.();
                break;
        }
    }

    /**
     * Global error handlers for specific scenarios
     */
    handleGlobalError(error) {
        // Don't show UI for certain types of errors
        if (this.shouldIgnoreError(error)) {
            this.logError(error);
            return;
        }
        
        // Handle critical errors immediately
        if (error.type === 'JAVASCRIPT_ERROR' && error.message?.includes('Script error')) {
            // Generic script error, probably from CORS
            return;
        }
        
        this.handleError(error, { global: true });
    }

    handleResourceError(error) {
        this.logError(error);
        
        // Only show notification for critical resources
        if (error.element === 'SCRIPT' || error.element === 'LINK') {
            this.toastSystem.warning(`Failed to load ${error.element.toLowerCase()}. Some features may not work properly.`);
        }
    }

    handleNetworkLoss() {
        this.toastSystem.warning('Connection lost. Working offline...', {
            duration: 0, // Persistent until connection restored
            id: 'offline-notification'
        });
    }

    handleNetworkRestore() {
        // Remove offline notification
        this.toastSystem.remove('offline-notification');
        
        this.toastSystem.success('Connection restored!');
        
        // Retry any pending operations
        this.retryPendingOperations();
    }

    /**
     * Utility methods
     */
    shouldIgnoreError(error) {
        const ignoredMessages = [
            'Script error',
            'Non-Error promise rejection captured',
            'ResizeObserver loop limit exceeded',
            'Uncaught TypeError: Cannot read property'
        ];
        
        return ignoredMessages.some(msg => 
            error.message?.includes(msg)
        );
    }

    logError(error) {
        this.errorLog.unshift({
            ...error,
            logged: new Date().toISOString()
        });
        
        // Keep only last 100 errors
        if (this.errorLog.length > 100) {
            this.errorLog = this.errorLog.slice(0, 100);
        }
    }

    getRetryCount(operation) {
        return this.retryAttempts.get(operation) || 0;
    }

    incrementRetryCount(operation) {
        const current = this.getRetryCount(operation);
        this.retryAttempts.set(operation, current + 1);
        return current + 1;
    }

    resetRetryCount(operation) {
        this.retryAttempts.delete(operation);
    }

    async clearStorageCache() {
        try {
            // Clear various storage types
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }
            
            // Clear some localStorage items (but keep user data)
            const keysToRemove = Object.keys(localStorage).filter(key => 
                key.startsWith('cache_') || key.startsWith('temp_')
            );
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            this.toastSystem.success('Cache cleared successfully!');
            
        } catch (error) {
            this.toastSystem.error('Failed to clear cache. Please try manually clearing your browser data.');
        }
    }

    retryPendingOperations() {
        // This would retry operations that were queued during offline state
        // Implementation depends on specific app architecture
    }

    showFallbackError() {
        // Last resort error display if error handling system itself fails
        const fallback = document.createElement('div');
        fallback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 16px;
            border-radius: 8px;
            z-index: 10001;
            max-width: 300px;
        `;
        fallback.innerHTML = `
            <strong>System Error</strong><br>
            An unexpected error occurred. Please refresh the page.
            <button onclick="location.reload()" style="
                background: white;
                color: #dc3545;
                border: none;
                padding: 4px 8px;
                border-radius: 4px;
                margin-left: 8px;
                cursor: pointer;
            ">Refresh</button>
        `;
        
        document.body.appendChild(fallback);
        
        setTimeout(() => {
            if (fallback.parentNode) {
                fallback.parentNode.removeChild(fallback);
            }
        }, 10000);
    }

    // Public API methods for manual error reporting

    /**
     * Report a validation error
     * @param {string} field - Field name
     * @param {string} message - Error message
     * @param {HTMLElement} element - Target element
     */
    reportValidationError(field, message, element = null) {
        this.handleError({
            type: 'VALIDATION',
            message,
            field,
            category: 'VALIDATION'
        }, {
            element,
            userInitiated: true
        });
    }

    /**
     * Report a network operation failure
     * @param {string} operation - Operation name
     * @param {Error} error - Network error
     * @param {Function} retryCallback - Retry function
     */
    reportNetworkError(operation, error, retryCallback = null) {
        if (retryCallback) {
            this.registerRetryCallback(operation, retryCallback);
        }
        
        this.handleError(error, {
            operation,
            category: 'NETWORK',
            userInitiated: true
        });
    }

    /**
     * Report a critical system error
     * @param {string} message - Error message
     * @param {Object} details - Additional details
     */
    reportCriticalError(message, details = {}) {
        this.handleError({
            message,
            severity: 'critical',
            ...details
        }, {
            critical: true,
            userInitiated: false
        });
    }

    /**
     * Get error statistics
     * @returns {Object} Error statistics
     */
    getErrorStatistics() {
        const stats = {
            total: this.errorLog.length,
            byCategory: {},
            recent: this.errorLog.slice(0, 10),
            mostCommon: null
        };
        
        // Count by category
        this.errorLog.forEach(error => {
            const category = error.category || 'UNKNOWN';
            stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
        });
        
        // Find most common category
        stats.mostCommon = Object.entries(stats.byCategory)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || null;
        
        return stats;
    }

    /**
     * Export error log
     * @returns {string} Error log as JSON
     */
    exportErrorLog() {
        return JSON.stringify({
            exported: new Date().toISOString(),
            errors: this.errorLog,
            statistics: this.getErrorStatistics()
        }, null, 2);
    }

    /**
     * Clear error log
     */
    clearErrorLog() {
        this.errorLog = [];
        this.retryAttempts.clear();
    }

    /**
     * Cleanup error handling system
     */
    cleanup() {
        this.clearErrorLog();
        this.errorCallbacks.clear();
        
        // Remove offline banner if present
        const banner = document.getElementById('offline-banner');
        if (banner) banner.remove();
    }
}

// Export for global use
window.ErrorHandlingSystem = ErrorHandlingSystem;