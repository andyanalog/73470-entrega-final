class DarkModeManager {
    constructor() {
        this.darkmode = null;
        this.options = {
            bottom: '32px',
            right: '32px',
            left: 'unset',
            time: '0.3s',
            mixColor: '#fff',
            backgroundColor: '#fff',
            buttonColorDark: '#100f2c',
            buttonColorLight: '#fff',
            saveInCookies: true,
            label: '🌓',
            autoMatchOSTheme: false
        };
        
        this.initialize();
    }

    // Initialize dark mode when DOM is ready
    initialize() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupDarkMode());
        } else {
            this.setupDarkMode();
        }
    }

    // Setup dark mode widget and event listeners
    setupDarkMode() {
        // Check if Darkmode library is available
        if (typeof Darkmode === 'undefined') {
            this.setupFallbackDarkMode();
            return;
        }

        try {
            // Initialize Darkmode widget
            this.darkmode = new Darkmode(this.options);
            this.darkmode.showWidget();
            
            // Setup theme change listeners
            this.setupThemeListeners();
            
            // Update initial app state
            this.updateAppState();
            
        } catch (error) {
            this.setupFallbackDarkMode();
        }
    }

    // Setup event listeners for theme changes
    setupThemeListeners() {
        const darkmodeToggle = document.querySelector('.darkmode-toggle');
        
        if (darkmodeToggle) {
            darkmodeToggle.addEventListener('click', () => {
                // Small delay to allow darkmode to update classes
                setTimeout(() => {
                    this.handleThemeChange();
                }, 100);
            });
        }

        // Listen for system theme changes if auto-match is enabled
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                if (this.options.autoMatchOSTheme) {
                    this.handleSystemThemeChange(e.matches);
                }
            });
        }
    }

    // Handle theme change events
    handleThemeChange() {
        const isDark = this.isDarkModeActive();
        const theme = isDark ? 'dark' : 'light';
        
        // Update app state if available
        this.updateAppState(theme);
        
        // Dispatch custom event for other components
        this.dispatchThemeEvent(theme);
        
        // Store preference in localStorage
        this.saveThemePreference(theme);
        
        // Update any custom theme-dependent elements
        this.updateCustomElements(theme);
    }

    // Handle system theme changes
    handleSystemThemeChange(isDarkPreferred) {
        const theme = isDarkPreferred ? 'dark' : 'light';
        
        if (this.darkmode) {
            if (isDarkPreferred) {
                this.darkmode.toggle();
            }
        }
        
        this.updateAppState(theme);
        this.dispatchThemeEvent(theme);
    }

    // Check if dark mode is currently active
    isDarkModeActive() {
        return document.body.classList.contains('darkmode--activated');
    }

    // Update global app state
    updateAppState(theme = null) {
        if (window.appState) {
            const currentTheme = theme || (this.isDarkModeActive() ? 'dark' : 'light');
            window.appState.ui.theme = currentTheme;
        }
    }

    // Dispatch theme change event
    dispatchThemeEvent(theme) {
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { 
                theme,
                timestamp: new Date().toISOString(),
                source: 'darkModeManager'
            }
        }));
    }

    // Save theme preference to localStorage
    saveThemePreference(theme) {
        try {
            localStorage.setItem('notes-app-theme', theme);
        } catch (error) {
        }
    }

    // Load saved theme preference
    loadThemePreference() {
        try {
            return localStorage.getItem('notes-app-theme') || 'light';
        } catch (error) {
            return 'light';
        }
    }

    // Update custom elements that depend on theme
    updateCustomElements(theme) {
        // Update sidebar notes if they exist
        const sidebarNotes = document.querySelectorAll('.sidebar-note-item');
        sidebarNotes.forEach(note => {
            if (theme === 'dark') {
                note.style.setProperty('--note-bg-color', '#2c3e50');
                note.style.setProperty('--note-text-color', '#ecf0f1');
            } else {
                note.style.removeProperty('--note-bg-color');
                note.style.removeProperty('--note-text-color');
            }
        });

        // Update modal overlays if they exist
        const modalOverlays = document.querySelectorAll('.modal-overlay');
        modalOverlays.forEach(overlay => {
            if (theme === 'dark') {
                overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            } else {
                overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            }
        });

        // Update toast notifications
        this.updateToastTheme(theme);
    }

    // Update toast notification theme
    updateToastTheme(theme) {
        const toasts = document.querySelectorAll('[id^="toast_"]');
        toasts.forEach(toast => {
            if (theme === 'dark') {
                toast.style.backgroundColor = '#34495e';
                toast.style.color = '#ecf0f1';
            } else {
                toast.style.backgroundColor = 'white';
                toast.style.color = '#495057';
            }
        });
    }

    // Setup fallback dark mode without external library
    setupFallbackDarkMode() {
        
        // Create a simple toggle button
        this.createFallbackToggle();
        
        // Load saved preference
        const savedTheme = this.loadThemePreference();
        if (savedTheme === 'dark') {
            this.enableFallbackDarkMode();
        }
    }

    // Create fallback dark mode toggle button
    createFallbackToggle() {
        const toggle = document.createElement('button');
        toggle.id = 'fallback-darkmode-toggle';
        toggle.innerHTML = '🌓';
        toggle.title = 'Toggle Dark Mode';
        toggle.style.cssText = `
            position: fixed;
            bottom: 32px;
            right: 32px;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            border: none;
            background: #667eea;
            color: white;
            font-size: 20px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 9999;
            transition: all 0.3s ease;
        `;

        toggle.addEventListener('click', () => {
            this.toggleFallbackDarkMode();
        });

        toggle.addEventListener('mouseenter', () => {
            toggle.style.transform = 'scale(1.1)';
        });

        toggle.addEventListener('mouseleave', () => {
            toggle.style.transform = 'scale(1)';
        });

        document.body.appendChild(toggle);
    }

    // Toggle fallback dark mode
    toggleFallbackDarkMode() {
        const isDark = document.body.classList.contains('fallback-dark-mode');
        
        if (isDark) {
            this.disableFallbackDarkMode();
        } else {
            this.enableFallbackDarkMode();
        }
    }

    // Enable fallback dark mode
    enableFallbackDarkMode() {
        document.body.classList.add('fallback-dark-mode');
        this.injectFallbackStyles();
        this.handleThemeChange();
    }

    // Disable fallback dark mode
    disableFallbackDarkMode() {
        document.body.classList.remove('fallback-dark-mode');
        this.removeFallbackStyles();
        this.handleThemeChange();
    }

    // Inject fallback dark mode styles
    injectFallbackStyles() {
        if (document.getElementById('fallback-dark-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'fallback-dark-styles';
        styles.textContent = `
            .fallback-dark-mode {
                background: #2c3e50 !important;
                color: #ecf0f1 !important;
            }
            
            .fallback-dark-mode .container {
                background: #34495e !important;
            }
            
            .fallback-dark-mode .section {
                background: #34495e !important;
                color: #ecf0f1 !important;
            }
            
            .fallback-dark-mode .note-item {
                background: #3c5772 !important;
                color: #ecf0f1 !important;
                border-color: #4a6741 !important;
            }
            
            .fallback-dark-mode input,
            .fallback-dark-mode textarea {
                background: #3c5772 !important;
                color: #ecf0f1 !important;
                border-color: #4a6741 !important;
            }
            
            .fallback-dark-mode .sidebar-note-item {
                background: #3c5772 !important;
                color: #ecf0f1 !important;
                border-color: #4a6741 !important;
            }
            
            .fallback-dark-mode .modal {
                background: #34495e !important;
                color: #ecf0f1 !important;
            }
            
            .fallback-dark-mode .modal-overlay {
                background: rgba(0, 0, 0, 0.8) !important;
            }
        `;
        
        document.head.appendChild(styles);
    }

    // Remove fallback dark mode styles
    removeFallbackStyles() {
        const styles = document.getElementById('fallback-dark-styles');
        if (styles) {
            styles.remove();
        }
    }

    // Public API methods

    // Get current theme
    getCurrentTheme() {
        if (this.darkmode) {
            return this.isDarkModeActive() ? 'dark' : 'light';
        } else {
            return document.body.classList.contains('fallback-dark-mode') ? 'dark' : 'light';
        }
    }

    // Programmatically set theme
    setTheme(theme) {
        const currentTheme = this.getCurrentTheme();
        
        if (currentTheme !== theme) {
            if (this.darkmode) {
                this.darkmode.toggle();
            } else {
                this.toggleFallbackDarkMode();
            }
        }
    }

    // Enable auto OS theme matching
    enableAutoOSTheme() {
        this.options.autoMatchOSTheme = true;
        
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const isDarkPreferred = mediaQuery.matches;
            
            if (this.getCurrentTheme() !== (isDarkPreferred ? 'dark' : 'light')) {
                this.setTheme(isDarkPreferred ? 'dark' : 'light');
            }
        }
    }

    // Disable auto OS theme matching
    disableAutoOSTheme() {
        this.options.autoMatchOSTheme = false;
    }

    // Check if auto OS theme matching is enabled
    isAutoOSThemeEnabled() {
        return this.options.autoMatchOSTheme;
    }

    // Get theme statistics
    getThemeStats() {
        return {
            currentTheme: this.getCurrentTheme(),
            autoOSTheme: this.isAutoOSThemeEnabled(),
            hasExternalLibrary: typeof Darkmode !== 'undefined',
            savedPreference: this.loadThemePreference(),
            supportsDarkMode: true
        };
    }

    // Cleanup method
    cleanup() {
        // Remove event listeners
        const toggle = document.getElementById('fallback-darkmode-toggle');
        if (toggle) {
            toggle.remove();
        }

        // Remove fallback styles
        this.removeFallbackStyles();

        // Clear darkmode instance
        if (this.darkmode) {
            // Note: Darkmode.js doesn't have a built-in cleanup method
            const darkmodeToggle = document.querySelector('.darkmode-toggle');
            if (darkmodeToggle) {
                darkmodeToggle.remove();
            }
        }
    }
}

// Initialize dark mode manager when script loads
let darkModeManager = null;

// Function to get or create dark mode manager instance
function getDarkModeManager() {
    if (!darkModeManager) {
        darkModeManager = new DarkModeManager();
    }
    return darkModeManager;
}

// Initialize immediately
darkModeManager = new DarkModeManager();

// Make dark mode manager globally available
window.darkModeManager = darkModeManager;
window.DarkModeManager = DarkModeManager;

// Export for module systems if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DarkModeManager;
}