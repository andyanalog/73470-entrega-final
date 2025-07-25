class VoiceNoteUI {
    constructor(audioManager) {
        this.audioManager = audioManager;
        this.recordingTimer = null;
        this.recordingStartTime = null;
        this.currentAudio = null;
        this.currentContext = null; // Track which context we're in
    }

    // Creates the audio recording interface in the specified container with context
    createRecordingInterface(containerId, context = 'new') {
        const container = document.getElementById(containerId);
        if (!container) {
            return;
        }

        // Store current context
        this.currentContext = context;

        // Check compatibility
        if (!AudioManager.isSupported()) {
            container.innerHTML = `
                <div class="audio-section">
                    <p class="audio-error">Your browser does not support audio recording or RecordRTC is not available</p>
                </div>
            `;
            return;
        }

        // Use context-specific IDs to avoid conflicts
        const idSuffix = context === 'edit' ? '-edit' : '';
        
        const audioHTML = `
            <div class="audio-section" data-context="${context}">
                <h3>Voice Note (Optional)</h3>
                <div class="audio-controls">
                    <button type="button" id="record-btn${idSuffix}" class="btn-audio btn-record">
                        🎤 Record
                    </button>
                    <button type="button" id="stop-btn${idSuffix}" class="btn-audio btn-stop" disabled>
                        ⏹️ Stop
                    </button>
                    <span id="recording-timer${idSuffix}" class="recording-timer">00:00</span>
                </div>
                <div id="audio-preview${idSuffix}" class="audio-preview"></div>
                <input type="hidden" id="audio-data${idSuffix}" name="audio-data">
            </div>
        `;

        container.innerHTML = audioHTML;
        
        // Setup events with context-specific IDs
        setTimeout(() => {
            this.setupRecordingEvents(context);
        }, 50);
    }

    // Sets up events for recording buttons with context-specific IDs
    setupRecordingEvents(context = 'new') {
        const idSuffix = context === 'edit' ? '-edit' : '';
        
        const recordBtn = document.getElementById(`record-btn${idSuffix}`);
        const stopBtn = document.getElementById(`stop-btn${idSuffix}`);
        const timerDisplay = document.getElementById(`recording-timer${idSuffix}`);

        if (!recordBtn || !stopBtn || !timerDisplay) {
            return;
        }

        recordBtn.addEventListener('click', async () => {
            // Start new recording
            const success = await this.startRecording();
            if (success) {
                recordBtn.disabled = true;
                stopBtn.disabled = false;
                recordBtn.textContent = '🔴 Recording...';
                recordBtn.classList.add('recording');
                
                // Start timer
                this.startTimer(timerDisplay);
            } else {
                this.showAudioMessage('Error accessing microphone. Check permissions.', 'error', context);
            }
        });

        stopBtn.addEventListener('click', async () => {
            const audioBlob = await this.stopRecording();
            if (audioBlob) {
                recordBtn.disabled = false;
                stopBtn.disabled = true;
                recordBtn.textContent = '🎤 Record';
                recordBtn.classList.remove('recording');
                
                this.stopTimer();
                await this.createAudioPreview(audioBlob, context);
            }
        });
    }

    // Starts audio recording
    async startRecording() {
        // Clear previous audio if exists
        this.clearExistingAudio();
        return await this.audioManager.startRecording();
    }

    // Stops audio recording
    async stopRecording() {
        return await this.audioManager.stopRecording();
    }

    // Clears existing audio in the current context
    clearExistingAudio() {
        // Clear for current context only
        const context = this.currentContext || 'new';
        const idSuffix = context === 'edit' ? '-edit' : '';
        
        const audioPreview = document.getElementById(`audio-preview${idSuffix}`);
        const audioDataInput = document.getElementById(`audio-data${idSuffix}`);
        
        if (audioPreview) audioPreview.innerHTML = '';
        if (audioDataInput) audioDataInput.value = '';
        
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
    }

    // Starts the recording timer
    startTimer(timerDisplay) {
        this.recordingStartTime = Date.now();
        this.recordingTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
            timerDisplay.textContent = AudioManager.formatDuration(elapsed);
        }, 1000);
    }

    // Stops the recording timer
    stopTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }

    // Creates preview of recorded audio with context awareness
    async createAudioPreview(audioBlob, context = 'new') {
        const idSuffix = context === 'edit' ? '-edit' : '';
        const previewContainer = document.getElementById(`audio-preview${idSuffix}`);
        const audioDataInput = document.getElementById(`audio-data${idSuffix}`);
        
        if (!previewContainer || !audioDataInput) {
            return;
        }

        // Convert to base64 for storage
        const base64Audio = await this.audioManager.blobToBase64(audioBlob);
        audioDataInput.value = base64Audio;

        // Create audio controls
        const audioUrl = URL.createObjectURL(audioBlob);
        const duration = await this.getAudioDuration(audioBlob);
        
        previewContainer.innerHTML = `
            <div class="audio-preview-item" data-context="${context}">
                <div class="audio-info">
                    <span class="audio-icon">🎵</span>
                    <span class="audio-duration">${AudioManager.formatDuration(duration)}</span>
                    <span class="audio-size">${this.formatFileSize(audioBlob.size)}</span>
                </div>
                <div class="audio-actions">
                    <button type="button" class="btn-audio btn-play" onclick="voiceNoteUI.playPreviewAudio('${base64Audio}', '${context}')">
                        ▶️ Play
                    </button>
                    <button type="button" class="btn-audio btn-delete" onclick="voiceNoteUI.deletePreviewAudio('${context}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;

        // Clean URL after some time
        setTimeout(() => URL.revokeObjectURL(audioUrl), 10000);
    }

    // Shows existing audio in edit mode with context awareness
    displayExistingAudio(base64Audio, context = 'edit') {
        if (!base64Audio) {
            return;
        }
        
        const idSuffix = context === 'edit' ? '-edit' : '';
        
        const tryDisplayAudio = (retries = 0) => {
            const previewContainer = document.getElementById(`audio-preview${idSuffix}`);
            
            if (!previewContainer && retries < 15) {
                setTimeout(() => tryDisplayAudio(retries + 1), 100);
                return;
            }
            
            if (!previewContainer) {
                
                // Try to create the container if it doesn't exist
                const audioSection = document.querySelector(`.audio-section[data-context="${context}"]`);
                if (audioSection) {
                    const newPreview = document.createElement('div');
                    newPreview.id = `audio-preview${idSuffix}`;
                    newPreview.className = 'audio-preview';
                    audioSection.appendChild(newPreview);
                    
                    // Try again with the newly created container
                    setTimeout(() => tryDisplayAudio(0), 50);
                }
                return;
            }

            try {
                const audioBlob = this.audioManager.base64ToBlob(base64Audio);
                const fileSize = this.formatFileSize(audioBlob.size);
                
                previewContainer.innerHTML = `
                    <div class="audio-preview-item" data-context="${context}">
                        <div class="audio-info">
                            <span class="audio-icon">🎵</span>
                            <span class="audio-duration">Existing Audio</span>
                            <span class="audio-size">${fileSize}</span>
                        </div>
                        <div class="audio-actions">
                            <button type="button" class="btn-audio btn-play" onclick="voiceNoteUI.playPreviewAudio('${base64Audio}', '${context}')">
                                ▶️ Play
                            </button>
                            <button type="button" class="btn-audio btn-delete" onclick="voiceNoteUI.deletePreviewAudio('${context}')">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                `;
                
            } catch (error) {
                previewContainer.innerHTML = `
                    <div class="audio-error">
                        Error loading audio. Please try recording a new one.
                    </div>
                `;
            }
        };
        
        // Start the retry process
        tryDisplayAudio();
    }

    // Gets duration of an audio blob
    getAudioDuration(audioBlob) {
        return new Promise((resolve) => {
            const audio = new Audio(URL.createObjectURL(audioBlob));
            audio.addEventListener('loadedmetadata', () => {
                resolve(audio.duration || 0);
                URL.revokeObjectURL(audio.src);
            });
            audio.addEventListener('error', () => resolve(0));
        });
    }

    // Formats file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // Plays preview audio with context awareness
    playPreviewAudio(base64Audio, context = 'new') {
        
        // Stop current audio if exists
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }

        try {
            this.currentAudio = this.audioManager.playAudio(base64Audio);
            this.currentAudio.play().catch(error => {
                this.showAudioMessage('Error playing audio', 'error', context);
            });

            // Show playback indicator
            this.currentAudio.addEventListener('play', () => {
                this.showAudioMessage('Playing audio...', 'info', context);
            });

            this.currentAudio.addEventListener('ended', () => {
                this.showAudioMessage('Playback completed', 'success', context);
            });

        } catch (error) {
            this.showAudioMessage('Error creating audio player', 'error', context);
        }
    }

    // Deletes preview audio with context awareness
    deletePreviewAudio(context = 'new') {
        const idSuffix = context === 'edit' ? '-edit' : '';
        
        const previewContainer = document.getElementById(`audio-preview${idSuffix}`);
        const audioDataInput = document.getElementById(`audio-data${idSuffix}`);
        const timerDisplay = document.getElementById(`recording-timer${idSuffix}`);
        
        if (previewContainer) previewContainer.innerHTML = '';
        if (audioDataInput) audioDataInput.value = '';
        if (timerDisplay) timerDisplay.textContent = '00:00';
        
        // Stop audio if playing
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        
        // Reset buttons for this context
        this.resetRecordingButtons(context);
        
        this.showAudioMessage('Audio deleted', 'success', context);
    }

    // Resets recording buttons to initial state with context awareness
    resetRecordingButtons(context = 'new') {
        const idSuffix = context === 'edit' ? '-edit' : '';
        
        const recordBtn = document.getElementById(`record-btn${idSuffix}`);
        const stopBtn = document.getElementById(`stop-btn${idSuffix}`);
        
        if (recordBtn) {
            recordBtn.disabled = false;
            recordBtn.textContent = '🎤 Record';
            recordBtn.classList.remove('recording');
        }
        
        if (stopBtn) {
            stopBtn.disabled = true;
        }
    }

    // Creates audio visualization for existing notes
    createAudioPlayer(base64Audio, noteIndex) {
        if (!base64Audio) return '';
        
        const audioBlob = this.audioManager.base64ToBlob(base64Audio);
        const fileSize = this.formatFileSize(audioBlob.size);
        
        // Check if we're currently in edit mode
        const isEditMode = document.querySelector('#edit-note.section.active') !== null;
        
        // Only show delete button in edit mode
        const deleteButton = isEditMode ? 
            `<button type="button" class="btn-audio btn-delete-small" 
                    onclick="voiceNoteUI.deleteNoteAudio(${noteIndex})">
                🗑️ Delete Audio
            </button>` : '';
        
        return `
            <div class="note-audio">
                <div class="audio-info">
                    <span class="audio-icon">🎵</span>
                    <span class="audio-size">${fileSize}</span>
                </div>
                <div class="audio-player">
                    <button type="button" class="btn-audio btn-play-small" 
                            onclick="voiceNoteUI.playNoteAudio('${base64Audio}', ${noteIndex})">
                        ▶️ Play Audio
                    </button>
                    ${deleteButton}
                </div>
            </div>
        `;
    }

    // Plays audio from a specific note
    playNoteAudio(base64Audio, noteIndex) {
        // Stop current audio
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }

        try {
            this.currentAudio = this.audioManager.playAudio(base64Audio);
            this.currentAudio.play().catch(error => {
                this.showAudioMessage('Error playing audio', 'error');
            });
        } catch (error) {
            this.showAudioMessage('Error creating audio player', 'error');
        }
    }

    // Deletes audio from a specific note
    deleteNoteAudio(noteIndex) {
        // This function will be called from main.js to maintain data logic there
        if (window.deleteNoteAudio) {
            window.deleteNoteAudio(noteIndex);
        }
    }

    // Shows an audio-related message with context awareness
    showAudioMessage(message, type = 'success', context = 'new') {
        const messageId = context === 'edit' ? 'edit-note-message' : 'new-note-message';
        const messageDiv = document.getElementById(messageId);
        
        if (messageDiv) {
            messageDiv.innerHTML = `<div class="message ${type}">${message}</div>`;
            setTimeout(() => {
                messageDiv.innerHTML = '';
            }, 3000);
        }
    }

    // Reset the audio interface to clean state
    resetAudioInterface() {
        
        // Stop any current audio playback
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        
        // Stop any ongoing recording
        this.stopTimer();
        if (this.audioManager && this.audioManager.isRecording) {
            this.audioManager.stopRecording();
        }
        
        // Clear both contexts
        ['new', 'edit'].forEach(context => {
            const idSuffix = context === 'edit' ? '-edit' : '';
            
            const previewContainer = document.getElementById(`audio-preview${idSuffix}`);
            const audioDataInput = document.getElementById(`audio-data${idSuffix}`);
            const timerDisplay = document.getElementById(`recording-timer${idSuffix}`);
            
            if (previewContainer) previewContainer.innerHTML = '';
            if (audioDataInput) audioDataInput.value = '';
            if (timerDisplay) timerDisplay.textContent = '00:00';
            
            this.resetRecordingButtons(context);
        });
        
    }

    // Cleans up all audio resources with context clearing
    cleanup() {
        
        this.stopTimer();
        
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        
        if (this.audioManager) {
            this.audioManager.cleanup();
        }
        
        // Clear both contexts
        ['new', 'edit'].forEach(context => {
            const idSuffix = context === 'edit' ? '-edit' : '';
            
            const previewContainer = document.getElementById(`audio-preview${idSuffix}`);
            const audioDataInput = document.getElementById(`audio-data${idSuffix}`);
            const timerDisplay = document.getElementById(`recording-timer${idSuffix}`);
            
            if (previewContainer) previewContainer.innerHTML = '';
            if (audioDataInput) audioDataInput.value = '';
            if (timerDisplay) timerDisplay.textContent = '00:00';
            
            this.resetRecordingButtons(context);
        });
        
        this.currentContext = null;
    }

    // Gets current audio statistics
    getCurrentAudioStats() {
        if (this.audioManager) {
            return this.audioManager.getAudioInfo();
        }
        return null;
    }

    // Get current state
    getCurrentState() {
        return this.currentContext;
    }
}

// Global instance for use in HTML events
window.VoiceNoteUI = VoiceNoteUI;