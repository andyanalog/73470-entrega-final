/**
 * Enhanced Data Manager - Production Version
 * Handles all data operations with comprehensive error handling and caching
 */

class EnhancedDataManager {
    constructor() {
        this.cache = new Map();
        this.isOnline = navigator.onLine;
        this.loadingStates = new Map();
        this.errorRetryCount = new Map();
        this.maxRetries = 3;
        this.retryDelay = 1000;
        
        this.setupConnectionMonitoring();
        this.initializeCache();
    }

    /**
     * Initialize cache with default settings
     */
    initializeCache() {
        this.cache.set('notes', []);
        this.cache.set('categories', []);
        this.cache.set('templates', []);
        this.cache.set('settings', {});
    }

    /**
     * Generic fetch method with error handling and retry logic
     * @param {string} url - URL to fetch
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} Parsed JSON data
     */
    async fetchWithRetry(url, options = {}) {
        const retryKey = url;
        const currentRetries = this.errorRetryCount.get(retryKey) || 0;
        
        try {
            this.setLoadingState(url, true);
            
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            
            // Reset retry count on success
            this.errorRetryCount.delete(retryKey);
            this.setLoadingState(url, false);
            
            return data;
            
        } catch (error) {
            this.setLoadingState(url, false);
            
            // Retry logic
            if (currentRetries < this.maxRetries) {
                this.errorRetryCount.set(retryKey, currentRetries + 1);
                
                this.showMessage(
                    `Network error, retrying... (${currentRetries + 1}/${this.maxRetries})`,
                    'warning',
                    '🔄'
                );
                
                // Wait before retry with exponential backoff
                await this.delay(this.retryDelay * Math.pow(2, currentRetries));
                return this.fetchWithRetry(url, options);
            }
            
            // Max retries reached
            this.errorRetryCount.delete(retryKey);
            throw new Error(`Failed to fetch ${url} after ${this.maxRetries} attempts: ${error.message}`);
        }
    }

    /**
     * Load notes from JSON file
     * @returns {Promise<Array>} Array of notes
     */
    async loadNotes() {
        const cacheKey = 'notes';
        
        if (this.cache.has(cacheKey) && this.cache.get(cacheKey).length > 0) {
            return this.cache.get(cacheKey);
        }

        try {
            const data = await this.fetchWithRetry('./js/notes.json');
            const notes = data.notes || [];
            
            this.cache.set(cacheKey, notes);
            this.showMessage(`Loaded ${notes.length} notes from database`, 'success', '📝');
            
            return notes;
            
        } catch (error) {
            this.showMessage('Using offline sample data', 'info', 'ℹ️');
            
            const fallbackNotes = this.getFallbackNotes();
            this.cache.set(cacheKey, fallbackNotes);
            return fallbackNotes;
        }
    }

    /**
     * Load categories from JSON file
     * @returns {Promise<Array>} Array of categories
     */
    async loadCategories() {
        const cacheKey = 'categories';
        
        if (this.cache.has(cacheKey) && this.cache.get(cacheKey).length > 0) {
            return this.cache.get(cacheKey);
        }

        try {
            const data = await this.fetchWithRetry('./js/categories.json');
            const categories = data.categories || [];
            
            this.cache.set(cacheKey, categories);
            return categories;
            
        } catch (error) {
            const fallbackCategories = this.getFallbackCategories();
            this.cache.set(cacheKey, fallbackCategories);
            return fallbackCategories;
        }
    }

    /**
     * Load templates from JSON file
     * @returns {Promise<Array>} Array of templates
     */
    async loadTemplates() {
        const cacheKey = 'templates';
        
        if (this.cache.has(cacheKey) && this.cache.get(cacheKey).length > 0) {
            return this.cache.get(cacheKey);
        }

        try {
            const data = await this.fetchWithRetry('./js/templates.json');
            const templates = data.templates || [];
            
            this.cache.set(cacheKey, templates);
            return templates;
            
        } catch (error) {
            const fallbackTemplates = this.getFallbackTemplates();
            this.cache.set(cacheKey, fallbackTemplates);
            return fallbackTemplates;
        }
    }

    /**
     * Load app settings from JSON file
     * @returns {Promise<Object>} App settings object
     */
    async loadSettings() {
        const cacheKey = 'settings';
        
        if (this.cache.has(cacheKey) && Object.keys(this.cache.get(cacheKey)).length > 0) {
            return this.cache.get(cacheKey);
        }

        try {
            const data = await this.fetchWithRetry('./js/settings.json');
            const settings = data.appSettings || {};
            
            this.cache.set(cacheKey, settings);
            return settings;
            
        } catch (error) {
            const fallbackSettings = this.getFallbackSettings();
            this.cache.set(cacheKey, fallbackSettings);
            return fallbackSettings;
        }
    }

    /**
     * Get template by ID
     * @param {string} templateId - Template ID
     * @returns {Promise<Object|null>} Template object or null
     */
    async getTemplate(templateId) {
        try {
            const templates = await this.loadTemplates();
            return templates.find(template => template.id === templateId) || null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Get category by ID
     * @param {string} categoryId - Category ID
     * @returns {Promise<Object|null>} Category object or null
     */
    async getCategory(categoryId) {
        try {
            const categories = await this.loadCategories();
            return categories.find(category => category.id === categoryId) || null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Search notes with advanced filtering
     * @param {string} query - Search query
     * @param {Object} filters - Additional filters
     * @returns {Promise<Array>} Filtered notes
     */
    async searchNotes(query = '', filters = {}) {
        try {
            const notes = await this.loadNotes();
            
            if (!query && Object.keys(filters).length === 0) {
                return notes;
            }

            return notes.filter(note => {
                let matches = true;

                // Text search
                if (query) {
                    const searchText = query.toLowerCase();
                    const titleMatch = note.title.toLowerCase().includes(searchText);
                    const contentMatch = note.content.toLowerCase().includes(searchText);
                    const tagMatch = note.tags?.some(tag => tag.toLowerCase().includes(searchText));
                    
                    matches = matches && (titleMatch || contentMatch || tagMatch);
                }

                // Category filter
                if (filters.category) {
                    matches = matches && note.category === filters.category;
                }

                // Priority filter
                if (filters.priority) {
                    matches = matches && note.priority === filters.priority;
                }

                // Audio filter
                if (filters.hasAudio !== undefined) {
                    matches = matches && (!!note.audio === filters.hasAudio);
                }

                // Date range filter
                if (filters.dateFrom) {
                    matches = matches && new Date(note.createdAt) >= new Date(filters.dateFrom);
                }

                if (filters.dateTo) {
                    matches = matches && new Date(note.createdAt) <= new Date(filters.dateTo);
                }

                return matches;
            });
            
        } catch (error) {
            this.showMessage('Search failed. Please try again.', 'error', '❌');
            return [];
        }
    }

    /**
     * Get notes statistics
     * @returns {Promise<Object>} Statistics object
     */
    async getNotesStatistics() {
        try {
            const notes = await this.loadNotes();
            const categories = await this.loadCategories();
            
            const stats = {
                total: notes.length,
                withAudio: notes.filter(note => note.audio).length,
                withoutAudio: notes.filter(note => !note.audio).length,
                byCategory: {},
                byPriority: {},
                averageLength: 0,
                oldestNote: null,
                newestNote: null,
                totalCharacters: 0,
                publicNotes: notes.filter(note => note.isPublic).length
            };

            // Calculate by category
            categories.forEach(category => {
                stats.byCategory[category.id] = notes.filter(note => note.category === category.id).length;
            });

            // Calculate by priority
            ['high', 'medium', 'low'].forEach(priority => {
                stats.byPriority[priority] = notes.filter(note => note.priority === priority).length;
            });

            // Calculate text statistics
            if (notes.length > 0) {
                stats.totalCharacters = notes.reduce((sum, note) => sum + note.content.length, 0);
                stats.averageLength = Math.round(stats.totalCharacters / notes.length);

                const sortedByDate = notes
                    .filter(note => note.createdAt)
                    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

                if (sortedByDate.length > 0) {
                    stats.oldestNote = sortedByDate[0];
                    stats.newestNote = sortedByDate[sortedByDate.length - 1];
                }
            }

            return stats;
            
        } catch (error) {
            return {
                total: 0,
                withAudio: 0,
                withoutAudio: 0,
                byCategory: {},
                byPriority: {},
                averageLength: 0
            };
        }
    }

    /**
     * Export data in different formats
     * @param {Array} notes - Notes to export
     * @param {string} format - Export format (json, csv, txt)
     * @returns {Promise<string>} Exported data
     */
    async exportData(notes, format = 'json') {
        try {
            const settings = await this.loadSettings();
            const categories = await this.loadCategories();
            
            switch (format.toLowerCase()) {
                case 'json':
                    return JSON.stringify({
                        exportInfo: {
                            date: new Date().toISOString(),
                            version: settings.version || '2.1.0',
                            format: 'json',
                            totalNotes: notes.length
                        },
                        notes,
                        categories,
                        metadata: await this.getNotesStatistics()
                    }, null, 2);

                case 'csv':
                    return this.exportToCSV(notes);

                case 'txt':
                    return this.exportToTXT(notes);

                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }
            
        } catch (error) {
            throw new Error(`Export failed: ${error.message}`);
        }
    }

    /**
     * Export notes to CSV format
     * @param {Array} notes - Notes to export
     * @returns {string} CSV data
     */
    exportToCSV(notes) {
        const headers = [
            'ID', 'Title', 'Content', 'Category', 'Priority', 
            'Tags', 'Has Audio', 'Is Public', 'Created Date', 
            'Modified Date', 'Character Count'
        ];
        
        let csv = headers.join(',') + '\n';
        
        notes.forEach(note => {
            const row = [
                `"${note.id || ''}"`,
                `"${(note.title || '').replace(/"/g, '""')}"`,
                `"${(note.content || '').replace(/"/g, '""')}"`,
                `"${note.category || ''}"`,
                `"${note.priority || 'medium'}"`,
                `"${(note.tags || []).join('; ')}"`,
                note.audio ? 'Yes' : 'No',
                note.isPublic ? 'Yes' : 'No',
                `"${note.createdAt || ''}"`,
                `"${note.lastModified || ''}"`,
                (note.content || '').length
            ];
            csv += row.join(',') + '\n';
        });
        
        return csv;
    }

    /**
     * Export notes to TXT format
     * @param {Array} notes - Notes to export
     * @returns {string} TXT data
     */
    exportToTXT(notes) {
        let txt = `NOTES EXPORT - ${new Date().toLocaleString()}\n`;
        txt += `${'='.repeat(60)}\n\n`;
        txt += `Total Notes: ${notes.length}\n\n`;
        
        notes.forEach((note, index) => {
            txt += `NOTE ${index + 1}\n`;
            txt += `${'─'.repeat(40)}\n`;
            txt += `Title: ${note.title || 'Untitled'}\n`;
            txt += `Category: ${note.category || 'Uncategorized'}\n`;
            txt += `Priority: ${note.priority || 'Medium'}\n`;
            txt += `Tags: ${(note.tags || []).join(', ') || 'None'}\n`;
            txt += `Has Audio: ${note.audio ? 'Yes' : 'No'}\n`;
            txt += `Created: ${note.createdAt ? new Date(note.createdAt).toLocaleString() : 'Unknown'}\n`;
            txt += `Modified: ${note.lastModified ? new Date(note.lastModified).toLocaleString() : 'Unknown'}\n`;
            txt += `\nContent:\n${note.content || 'No content'}\n\n`;
            txt += `${'='.repeat(60)}\n\n`;
        });
        
        return txt;
    }

    /**
     * Download exported data as file
     * @param {string} data - Data to download
     * @param {string} filename - File name
     * @param {string} mimeType - MIME type
     */
    downloadFile(data, filename, mimeType = 'application/json') {
        try {
            const blob = new Blob([data], { type: mimeType });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            this.showMessage(`File "${filename}" downloaded successfully`, 'success', '📥');
            
        } catch (error) {
            this.showMessage(`Download failed: ${error.message}`, 'error', '❌');
        }
    }

    /**
     * Validate note data structure
     * @param {Object} note - Note to validate
     * @returns {Object} Validation result
     */
    async validateNote(note) {
        try {
            const settings = await this.loadSettings();
            const limits = settings.limits || {};
            
            const validation = {
                isValid: true,
                errors: [],
                warnings: []
            };

            // Required fields
            if (!note.title || typeof note.title !== 'string' || note.title.trim().length === 0) {
                validation.errors.push('Title is required');
                validation.isValid = false;
            }

            if (!note.content || typeof note.content !== 'string' || note.content.trim().length === 0) {
                validation.errors.push('Content is required');
                validation.isValid = false;
            }

            // Length limits
            if (note.title && note.title.length > (limits.maxNoteTitle || 200)) {
                validation.errors.push(`Title too long (max ${limits.maxNoteTitle || 200} characters)`);
                validation.isValid = false;
            }

            if (note.content && note.content.length > (limits.maxNoteContent || 50000)) {
                validation.errors.push(`Content too long (max ${limits.maxNoteContent || 50000} characters)`);
                validation.isValid = false;
            }

            // Tags validation
            if (note.tags && Array.isArray(note.tags)) {
                if (note.tags.length > (limits.maxTagsPerNote || 10)) {
                    validation.warnings.push(`Too many tags (max ${limits.maxTagsPerNote || 10} recommended)`);
                }
                
                note.tags.forEach(tag => {
                    if (typeof tag === 'string' && tag.length > (limits.maxTagLength || 30)) {
                        validation.warnings.push(`Tag "${tag}" is too long (max ${limits.maxTagLength || 30} characters)`);
                    }
                });
            }

            // Audio validation
            if (note.audio && typeof note.audio === 'string') {
                try {
                    const audioSize = (note.audio.length * 3) / 4; // Approximate base64 size
                    if (audioSize > (limits.maxAudioSize || 10485760)) {
                        validation.warnings.push('Audio file is very large and may affect performance');
                    }
                } catch (e) {
                    validation.warnings.push('Unable to validate audio data');
                }
            }

            return validation;
            
        } catch (error) {
            return {
                isValid: false,
                errors: ['Validation failed due to system error'],
                warnings: []
            };
        }
    }

    /**
     * Clear cache for specific data type
     * @param {string} dataType - Type of data to clear
     */
    clearCache(dataType = null) {
        if (dataType) {
            this.cache.delete(dataType);
            this.showMessage(`Cache cleared for ${dataType}`, 'info', '🗑️');
        } else {
            this.cache.clear();
            this.initializeCache();
            this.showMessage('All cache cleared', 'info', '🗑️');
        }
    }

    /**
     * Set loading state for a specific operation
     * @param {string} operation - Operation identifier
     * @param {boolean} isLoading - Loading state
     */
    setLoadingState(operation, isLoading) {
        this.loadingStates.set(operation, isLoading);
        
        // Dispatch custom event for UI updates
        window.dispatchEvent(new CustomEvent('dataManagerLoading', {
            detail: { operation, isLoading }
        }));
    }

    /**
     * Get loading state for an operation
     * @param {string} operation - Operation identifier
     * @returns {boolean} Loading state
     */
    isLoading(operation) {
        return this.loadingStates.get(operation) || false;
    }

    /**
     * Setup connection monitoring
     */
    setupConnectionMonitoring() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showMessage('Connection restored - syncing data...', 'success', '🌐');
            this.clearCache(); // Refresh data when back online
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showMessage('Working offline - using cached data', 'warning', '📴');
        });
    }

    /**
     * Utility delay function
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Show message to user with enhanced UX
     * @param {string} message - Message text
     * @param {string} type - Message type (success, error, warning, info)
     * @param {string} icon - Message icon
     */
    showMessage(message, type = 'info', icon = '') {
        // Create or find message container
        let messageContainer = document.getElementById('global-messages');
        
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'global-messages';
            messageContainer.className = 'global-messages';
            messageContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                max-width: 350px;
                pointer-events: none;
            `;
            document.body.appendChild(messageContainer);
        }

        const messageElement = document.createElement('div');
        messageElement.className = `global-message ${type}`;
        messageElement.style.cssText = `
            background: white;
            color: #495057;
            padding: 12px 16px;
            margin-bottom: 8px;
            border-radius: 8px;
            border-left: 4px solid ${this.getTypeColor(type)};
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            font-weight: 500;
            font-size: 13px;
            pointer-events: auto;
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s ease;
        `;
        messageElement.innerHTML = `${icon} ${message}`;
        
        messageContainer.appendChild(messageElement);

        // Trigger animation
        requestAnimationFrame(() => {
            messageElement.style.transform = 'translateX(0)';
            messageElement.style.opacity = '1';
        });

        // Auto-remove after delay
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.style.transform = 'translateX(100%)';
                messageElement.style.opacity = '0';
                
                setTimeout(() => {
                    if (messageElement.parentNode) {
                        messageElement.parentNode.removeChild(messageElement);
                    }
                }, 300);
            }
        }, 4000);
    }

    /**
     * Get color for message type
     * @param {string} type - Message type
     * @returns {string} Color code
     */
    getTypeColor(type) {
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        return colors[type] || colors.info;
    }

    /**
     * Fallback data methods
     */
    getFallbackNotes() {
        return [
            {
                id: "note_fallback_001",
                title: "Welcome to Notes App",
                content: "This app now supports:\n\n🎤 Voice notes with RecordRTC\n📁 Categories and templates\n🔍 Advanced search\n📤 Export functionality\n💾 Offline capability\n\nStart creating your notes!",
                audio: null,
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                category: "getting-started",
                tags: ["welcome", "features"],
                priority: "high",
                isPublic: false,
                template: "welcome"
            }
        ];
    }

    getFallbackCategories() {
        return [
            {
                id: "getting-started",
                name: "Getting Started",
                color: "#28a745",
                icon: "🚀",
                description: "Welcome and tutorial notes",
                isDefault: true,
                isActive: true,
                sortOrder: 1
            },
            {
                id: "personal",
                name: "Personal",
                color: "#ffc107",
                icon: "🏠",
                description: "Personal notes and reminders",
                isDefault: true,
                isActive: true,
                sortOrder: 2
            },
            {
                id: "work",
                name: "Work",
                color: "#007bff",
                icon: "💼",
                description: "Professional and work-related notes",
                isDefault: true,
                isActive: true,
                sortOrder: 3
            }
        ];
    }

    getFallbackTemplates() {
        return [
            {
                id: "blank",
                name: "Blank Note",
                category: "general",
                icon: "📝",
                description: "A blank template for free-form notes",
                title: "New Note",
                content: "",
                tags: ["blank"],
                isDefault: true,
                isActive: true
            },
            {
                id: "meeting",
                name: "Meeting Notes",
                category: "work",
                icon: "📅",
                description: "Template for meeting notes",
                title: "Meeting Notes - [Meeting Name]",
                content: "📅 Date: [Date]\n👥 Attendees: [List]\n\n📋 Agenda:\n• [Item 1]\n• [Item 2]\n\n📝 Notes:\n[Meeting notes here]\n\n📋 Action Items:\n• [Task 1] - [Person] - [Due Date]\n• [Task 2] - [Person] - [Due Date]",
                tags: ["meeting", "work"],
                isDefault: true,
                isActive: true
            }
        ];
    }

    getFallbackSettings() {
        return {
            version: "2.1.0",
            features: {
                voiceNotes: { enabled: true, maxDuration: 300 },
                categories: { enabled: true, maxCategories: 20 },
                search: { enabled: true, fuzzySearch: true },
                export: { enabled: true, formats: ["json", "txt", "csv"] },
                templates: { enabled: true, allowCustomTemplates: true }
            },
            limits: {
                maxNotesPerUser: 10000,
                maxNoteTitle: 200,
                maxNoteContent: 50000,
                maxAudioSize: 10485760,
                maxTagsPerNote: 10
            },
            ui: {
                theme: { current: "light" },
                layout: {
                    sidebar: { width: 320, collapsible: true },
                    editor: { fontSize: 16, autoSave: true, autoSaveDelay: 2000 }
                }
            }
        };
    }

    /**
     * Get system capabilities
     * @returns {Object} System capabilities
     */
    getSystemCapabilities() {
        return {
            mediaRecorder: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            webAudio: !!(window.AudioContext || window.webkitAudioContext),
            localStorage: !!window.localStorage,
            indexedDB: !!window.indexedDB,
            serviceWorker: !!navigator.serviceWorker,
            webShare: !!navigator.share,
            clipboard: !!navigator.clipboard,
            recordRTC: !!window.RecordRTC,
            isOnline: navigator.onLine
        };
    }

    /**
     * Perform system health check
     * @returns {Promise<Object>} Health check results
     */
    async performHealthCheck() {
        const healthCheck = {
            timestamp: new Date().toISOString(),
            status: 'healthy',
            issues: [],
            capabilities: this.getSystemCapabilities(),
            dataStatus: {
                notes: false,
                categories: false,
                templates: false,
                settings: false
            }
        };

        try {
            // Test data loading
            const dataTests = [
                { name: 'notes', loader: () => this.loadNotes() },
                { name: 'categories', loader: () => this.loadCategories() },
                { name: 'templates', loader: () => this.loadTemplates() },
                { name: 'settings', loader: () => this.loadSettings() }
            ];

            for (const test of dataTests) {
                try {
                    await test.loader();
                    healthCheck.dataStatus[test.name] = true;
                } catch (error) {
                    healthCheck.issues.push(`Failed to load ${test.name}: ${error.message}`);
                    healthCheck.dataStatus[test.name] = false;
                }
            }

            // Check critical capabilities
            if (!healthCheck.capabilities.localStorage) {
                healthCheck.issues.push('localStorage not available - data persistence may not work');
                healthCheck.status = 'warning';
            }

            if (!healthCheck.capabilities.mediaRecorder) {
                healthCheck.issues.push('Media recording not available - voice notes disabled');
                healthCheck.status = 'warning';
            }

            if (!healthCheck.capabilities.recordRTC) {
                healthCheck.issues.push('RecordRTC library not loaded - voice features limited');
                healthCheck.status = 'warning';
            }

            if (healthCheck.issues.length > 3) {
                healthCheck.status = 'critical';
            }

        } catch (error) {
            healthCheck.status = 'critical';
            healthCheck.issues.push(`Health check failed: ${error.message}`);
        }

        return healthCheck;
    }

    /**
     * Clean up resources
     */
    cleanup() {
        this.cache.clear();
        this.loadingStates.clear();
        this.errorRetryCount.clear();
        
        // Remove message container
        const messageContainer = document.getElementById('global-messages');
        if (messageContainer) {
            messageContainer.remove();
        }
    }
}

// Export for global use
window.EnhancedDataManager = EnhancedDataManager;