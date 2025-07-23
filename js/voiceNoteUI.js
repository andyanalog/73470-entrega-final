class VoiceNoteUI {
    constructor(audioManager) {
        this.audioManager = audioManager;
        this.recordingTimer = null;
        this.recordingStartTime = null;
        this.currentAudio = null;
    }

    // Creates the audio recording interface in the new note form
    createRecordingInterface(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Check compatibility
        if (!AudioManager.isSupported()) {
            container.innerHTML = `
                <div class="audio-section">
                    <p class="audio-error">Your browser does not support audio recording or RecordRTC is not available</p>
                </div>
            `;
            return;
        }

        const audioHTML = `
            <div class="audio-section">
                <h3>Voice Note (Optional)</h3>
                <div class="audio-controls">
                    <button type="button" id="record-btn" class="btn-audio btn-record">
                        🎤 Record
                    </button>
                    <button type="button" id="stop-btn" class="btn-audio btn-stop" disabled>
                        ⏹️ Stop
                    </button>
                    <span id="recording-timer" class="recording-timer">00:00</span>
                </div>
                <div id="audio-preview" class="audio-preview"></div>
                <input type="hidden" id="audio-data" name="audio-data">
            </div>
        `;

        container.innerHTML = audioHTML;
        this.setupRecordingEvents();
    }

    // Sets up events for recording buttons
    setupRecordingEvents() {
        const recordBtn = document.getElementById('record-btn');
        const stopBtn = document.getElementById('stop-btn');
        const timerDisplay = document.getElementById('recording-timer');

        recordBtn?.addEventListener('click', async () => {
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
                this.showAudioMessage('Error accessing microphone. Check permissions.', 'error');
            }
        });

        stopBtn?.addEventListener('click', async () => {
            const audioBlob = await this.stopRecording();
            if (audioBlob) {
                recordBtn.disabled = false;
                stopBtn.disabled = true;
                recordBtn.textContent = '🎤 Record';
                recordBtn.classList.remove('recording');
                
                this.stopTimer();
                await this.createAudioPreview(audioBlob);
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

    // Clears existing audio in the form
    clearExistingAudio() {
        const audioPreview = document.getElementById('audio-preview');
        const audioDataInput = document.getElementById('audio-data');
        
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

    // Pauses the recording timer (kept for compatibility but not used)
    pauseTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }

    // Stops the recording timer
    stopTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }

    // Creates preview of recorded audio
    async createAudioPreview(audioBlob) {
        const previewContainer = document.getElementById('audio-preview');
        const audioDataInput = document.getElementById('audio-data');
        
        if (!previewContainer || !audioDataInput) return;

        // Convert to base64 for storage
        const base64Audio = await this.audioManager.blobToBase64(audioBlob);
        audioDataInput.value = base64Audio;

        // Create audio controls
        const audioUrl = URL.createObjectURL(audioBlob);
        const duration = await this.getAudioDuration(audioBlob);
        
        previewContainer.innerHTML = `
            <div class="audio-preview-item">
                <div class="audio-info">
                    <span class="audio-icon">🎵</span>
                    <span class="audio-duration">${AudioManager.formatDuration(duration)}</span>
                    <span class="audio-size">${this.formatFileSize(audioBlob.size)}</span>
                </div>
                <div class="audio-actions">
                    <button type="button" class="btn-audio btn-play" onclick="voiceNoteUI.playPreviewAudio('${base64Audio}')">
                        ▶️ Play
                    </button>
                    <button type="button" class="btn-audio btn-delete" onclick="voiceNoteUI.deletePreviewAudio()">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;

        // Clean URL after some time
        setTimeout(() => URL.revokeObjectURL(audioUrl), 10000);
    }

    // Shows existing audio in edit mode
    displayExistingAudio(base64Audio) {
        const previewContainer = document.getElementById('audio-preview');
        if (!previewContainer || !base64Audio) return;

        // Simulate duration (since we can't calculate it exactly from base64)
        const audioBlob = this.audioManager.base64ToBlob(base64Audio);
        
        previewContainer.innerHTML = `
            <div class="audio-preview-item">
                <div class="audio-info">
                    <span class="audio-icon">🎵</span>
                    <span class="audio-duration">Existing Audio</span>
                    <span class="audio-size">${this.formatFileSize(audioBlob.size)}</span>
                </div>
                <div class="audio-actions">
                    <button type="button" class="btn-audio btn-play" onclick="voiceNoteUI.playPreviewAudio('${base64Audio}')">
                        ▶️ Play
                    </button>
                    <button type="button" class="btn-audio btn-delete" onclick="voiceNoteUI.deletePreviewAudio()">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
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

    // Plays preview audio
    playPreviewAudio(base64Audio) {
        // Stop current audio if exists
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }

        try {
            this.currentAudio = this.audioManager.playAudio(base64Audio);
            this.currentAudio.play().catch(error => {
                console.error('Error playing audio:', error);
                this.showAudioMessage('Error playing audio', 'error');
            });

            // Show playback indicator
            this.currentAudio.addEventListener('play', () => {
                this.showAudioMessage('Playing audio...', 'info');
            });

            this.currentAudio.addEventListener('ended', () => {
                this.showAudioMessage('Playback completed', 'success');
            });

        } catch (error) {
            console.error('Error creating audio player:', error);
            this.showAudioMessage('Error creating audio player', 'error');
        }
    }

    // Deletes preview audio
    deletePreviewAudio() {
        const previewContainer = document.getElementById('audio-preview');
        const audioDataInput = document.getElementById('audio-data');
        const timerDisplay = document.getElementById('recording-timer');
        
        if (previewContainer) previewContainer.innerHTML = '';
        if (audioDataInput) audioDataInput.value = '';
        if (timerDisplay) timerDisplay.textContent = '00:00';
        
        // Stop audio if playing
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        
        // Reset buttons
        this.resetRecordingButtons();
        
        this.showAudioMessage('Audio deleted', 'success');
    }

    // Resets recording buttons to initial state
    resetRecordingButtons() {
        const recordBtn = document.getElementById('record-btn');
        const stopBtn = document.getElementById('stop-btn');
        
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
                console.error('Error playing note audio:', error);
                this.showAudioMessage('Error playing audio', 'error');
            });
        } catch (error) {
            console.error('Error creating note audio player:', error);
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

    // Shows an audio-related message
    showAudioMessage(message, type = 'success') {
        const messageDiv = document.getElementById('new-note-message');
        if (messageDiv) {
            messageDiv.innerHTML = `<div class="message ${type}">${message}</div>`;
            setTimeout(() => {
                messageDiv.innerHTML = '';
            }, 3000);
        }
    }

    // Cleans up all audio resources
    cleanup() {
        this.stopTimer();
        
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        
        if (this.audioManager) {
            this.audioManager.cleanup();
        }
    }

    // Gets current audio statistics
    getCurrentAudioStats() {
        if (this.audioManager) {
            return this.audioManager.getAudioInfo();
        }
        return null;
    }
}

// Global instance for use in HTML events
window.VoiceNoteUI = VoiceNoteUI;