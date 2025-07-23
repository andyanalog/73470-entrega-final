class AudioManager {
    constructor() {
        this.recorder = null;
        this.stream = null;
        this.isRecording = false;
        this.recordedBlob = null;
    }

    // Initialize microphone access
    async initializeMicrophone() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100,
                    channelCount: 1
                }
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    // Start audio recording using RecordRTC
    async startRecording() {
        if (this.isRecording) return false;

        try {
            if (!this.stream) {
                const hasAccess = await this.initializeMicrophone();
                if (!hasAccess) return false;
            }

            // Configure RecordRTC with optimized settings
            const recorderOptions = {
                type: 'audio',
                mimeType: 'audio/webm',
                numberOfAudioChannels: 1,
                desiredSampRate: 16000,
                timeSlice: 1000,
                ondataavailable: (blob) => {
                    // Optional callback for real-time data processing
                }
            };

            // Use appropriate recorder type based on browser capabilities
            if (window.AudioWorkletNode) {
                recorderOptions.recorderType = window.RecordRTC.StereoAudioRecorder;
            } else {
                recorderOptions.recorderType = window.RecordRTC.StereoAudioRecorder;
            }

            this.recorder = new window.RecordRTC(this.stream, recorderOptions);
            this.recorder.startRecording();
            this.isRecording = true;
            this.recordedBlob = null;
            return true;
        } catch (error) {
            return false;
        }
    }

    // Stop recording and generate audio blob
    stopRecording() {
        return new Promise((resolve) => {
            if (!this.isRecording || !this.recorder) {
                resolve(null);
                return;
            }

            this.recorder.stopRecording(() => {
                this.recordedBlob = this.recorder.getBlob();
                this.isRecording = false;
                resolve(this.recordedBlob);
            });
        });
    }

    // Convert audio blob to base64 for storage
    blobToBase64(audioBlob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(audioBlob);
        });
    }

    // Convert base64 to blob for playback
    base64ToBlob(base64String) {
        const [header, data] = base64String.split(',');
        const mimeType = header.match(/:(.*?);/)[1];
        const byteCharacters = atob(data);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    // Play audio from base64 data
    playAudio(base64Audio) {
        const audioBlob = this.base64ToBlob(base64Audio);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        // Clean up URL when playback ends
        audio.addEventListener('ended', () => {
            URL.revokeObjectURL(audioUrl);
        });
        
        // Configure audio for better compatibility
        audio.preload = 'auto';
        audio.controls = false;
        
        return audio;
    }

    // Get current recording duration in seconds
    getCurrentRecordingDuration() {
        if (this.recorder && this.isRecording) {
            return this.recorder.getRecordingDuration() / 1000;
        }
        return 0;
    }

    // Clean up audio resources
    cleanup() {
        if (this.recorder) {
            if (this.isRecording) {
                this.recorder.stopRecording(() => {
                    this.recorder.destroy();
                    this.recorder = null;
                });
            } else {
                this.recorder.destroy();
                this.recorder = null;
            }
        }
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.isRecording = false;
        this.recordedBlob = null;
    }

    // Check browser compatibility for audio recording
    static isSupported() {
        return !!(navigator.mediaDevices && 
                 navigator.mediaDevices.getUserMedia && 
                 window.RecordRTC);
    }

    // Format duration in mm:ss format
    static formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // Get detailed audio information
    getAudioInfo() {
        if (this.recordedBlob) {
            return {
                size: this.recordedBlob.size,
                type: this.recordedBlob.type,
                duration: this.getCurrentRecordingDuration(),
                quality: 'Standard (16kHz, Mono)'
            };
        }
        return null;
    }

    // Convert audio to different formats (placeholder for future implementation)
    async convertAudioFormat(audioBlob, targetFormat = 'webm') {
        // For future implementation of format conversion
        // Currently returns the original blob
        return audioBlob;
    }
}

// Export for global use
window.AudioManager = AudioManager;