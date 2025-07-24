let notes = []
let audioManager
let voiceNoteUI
let dataManager
let modalSystem
let toastSystem
let errorHandler
let businessLogic
let editingNoteIndex = null
let activeNoteIndex = null

// Application state
let appState = {
    isInitialized: false,
    currentWorkflow: null,
    features: {
        voiceNotes: true,
        categories: true,
        templates: true,
        search: true,
        export: true
    },
    ui: {
        theme: 'light',
        sidebarCollapsed: false
    }
}

// Debug mode toggle (for development only)
const DEBUG_MODE = false

// Development logger - only logs when DEBUG_MODE is true
function debugLog(message, data = null) {
    if (DEBUG_MODE) {
        if (data) {
            console.log(`[DEBUG] ${message}`, data)
        } else {
            console.log(`[DEBUG] ${message}`)
        }
    }
}

// Initialize all systems
async function initializeSystems() {
    try {
        // Initialize toast system first (needed for notifications)
        toastSystem = new ToastNotificationSystem()
        
        // Initialize modal system (needed for user interactions)
        modalSystem = new CustomModalSystem()
        
        // Initialize error handler (needs modal and toast systems)
        errorHandler = new ErrorHandlingSystem(modalSystem, toastSystem)
        
        // Initialize data manager
        dataManager = new DataManager()
        
        // Initialize business logic manager
        businessLogic = new BusinessLogicManager(dataManager, modalSystem, toastSystem)
        
        // Make systems globally available
        window.modalSystem = modalSystem
        window.toastSystem = toastSystem
        window.errorHandler = errorHandler
        window.businessLogic = businessLogic
        window.dataManager = dataManager
        
        debugLog('Systems initialized successfully')
        return true
        
    } catch (error) {
        showFallbackError('Failed to initialize application systems. Please refresh the page.')
        throw error
    }
}

// Load application data using data manager
async function loadApplicationData() {
    try {
        // Load settings first to configure the app
        const settings = await dataManager.loadSettings()
        appState.features = { ...appState.features, ...settings.features }
        
        // Load categories and templates
        const [categories, templates] = await Promise.all([
            dataManager.loadCategories(),
            dataManager.loadTemplates()
        ])
        
        debugLog(`Loaded ${categories.length} categories and ${templates.length} templates`)
        
        // Load existing notes from localStorage or sample data
        await loadNotes()
        
        return true
        
    } catch (error) {
        await errorHandler.handleError(error, {
            operation: 'load_application_data',
            critical: true
        })
        throw error
    }
}

// notes loading with better error handling
async function loadNotes() {
    try {
        const savedNotes = localStorage.getItem("notes")
        
        if (savedNotes) {
            notes = JSON.parse(savedNotes)
            // Migrate existing notes to new format
            notes = notes.map((note) => ({
                ...note,
                audio: note.audio || null,
                createdAt: note.createdAt || new Date().toISOString(),
                id: note.id || generateNoteId(),
                lastModified: note.lastModified || note.createdAt || new Date().toISOString(),
                category: note.category || 'personal',
                tags: note.tags || [],
                priority: note.priority || 'medium',
                isPublic: note.isPublic || false
            }))
            
            debugLog(`Loaded ${notes.length} existing notes`)
        } else {
            // Load sample data using data manager
            try {
                const sampleNotes = await dataManager.loadNotes()
                if (sampleNotes.length > 0) {
                    notes = sampleNotes
                    saveNotes() // Save to localStorage
                    debugLog(`Loaded ${notes.length} sample notes`)
                } else {
                    notes = []
                    debugLog('Starting with empty notes collection')
                }
            } catch (error) {
                debugLog('Could not load sample data, starting with empty collection')
                notes = []
            }
        }
        
    } catch (error) {
        await errorHandler.handleError(error, {
            operation: 'load_notes',
            userInitiated: false
        })
        notes = [] // Fallback to empty array
    }
}

// save notes with error handling
async function saveNotes() {
    try {
        localStorage.setItem("notes", JSON.stringify(notes))
        updateSidebarNotesList()
        
        // Dispatch event for any listeners
        window.dispatchEvent(new CustomEvent('notesUpdated', {
            detail: { count: notes.length }
        }))
        
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            await errorHandler.handleStorageError(error)
        } else {
            await errorHandler.handleError(error, {
                operation: 'save_notes',
                userInitiated: true
            })
        }
        throw error
    }
}

// Generate unique note ID
function generateNoteId() {
    return `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// note creation workflow
async function createNoteWithWorkflow(templateId = null, categoryId = null) {
    try {
        const result = await businessLogic.startNoteCreationWorkflow({
            templateId,
            categoryId
        })
        
        if (result.success) {
            // Add note to local array
            notes.push(result.note)
            await saveNotes()
            
            // Set as active note and show details
            activeNoteIndex = notes.length - 1
            updateSidebarNotesList()
            showNoteDetail(activeNoteIndex)
            
            return result.note
        }
        
    } catch (error) {
        await errorHandler.handleError(error, {
            operation: 'create_note',
            userInitiated: true
        })
    }
}

// note editing workflow
async function editNoteWithWorkflow(noteIndex) {
    try {
        if (noteIndex < 0 || noteIndex >= notes.length) {
            throw new Error('Invalid note index for editing')
        }

        const note = notes[noteIndex]
        
        // Set editing state and show edit form
        editingNoteIndex = noteIndex
        createAndShowEditSection(note)
        
    } catch (error) {
        console.error('Error starting edit:', error)
        toastSystem.error('Failed to start editing. Please try again.')
    }
}

// Complete note editing workflow
async function completeNoteEdit(noteIndex, updatedData) {
    try {
        if (noteIndex < 0 || noteIndex >= notes.length) {
            throw new Error('Invalid note index for editing')
        }

        const originalNote = notes[noteIndex]
        
        // Simple validation
        if (!updatedData.title || !updatedData.title.trim()) {
            throw new Error('Title is required')
        }
        
        if (!updatedData.content || !updatedData.content.trim()) {
            throw new Error('Content is required')
        }

        // Update the note directly without business logic validation
        const updatedNote = {
            ...originalNote,
            ...updatedData,
            lastModified: new Date().toISOString()
        }

        // Update local notes array
        notes[noteIndex] = updatedNote
        await saveNotes()
        
        // Exit edit mode and show updated note
        exitEditMode()
        activeNoteIndex = noteIndex
        showNoteDetail(noteIndex)
        
        // Show success message
        toastSystem.success(`Note "${updatedNote.title}" updated successfully!`)
        
        return updatedNote
        
    } catch (error) {
        console.error('Error updating note:', error)
        throw error
    }
}

// note deletion with workflow
async function deleteNoteWithWorkflow(noteIndex) {
    try {
        if (noteIndex < 0 || noteIndex >= notes.length) {
            throw new Error('Invalid note index for deletion')
        }

        const note = notes[noteIndex]
        
        // Simple confirmation dialog using modal system
        const hasAudio = note.audio ? '\n\nThis note contains an audio recording that will also be deleted.' : '';
        
        const confirmed = await modalSystem.confirm({
            title: 'Delete Confirmation',
            message: `Are you sure you want to delete "${note.title}"?${hasAudio}\n\nThis action cannot be undone.`,
            icon: '🗑️',
            confirmText: 'Delete',
            cancelText: 'Keep',
            dangerousAction: true
        });

        if (confirmed) {
            // Remove from local array
            notes.splice(noteIndex, 1)
            await saveNotes()
            
            // Update UI
            if (editingNoteIndex === noteIndex) {
                exitEditMode()
            } else if (editingNoteIndex !== null && editingNoteIndex > noteIndex) {
                editingNoteIndex--
            }

            if (activeNoteIndex === noteIndex) {
                activeNoteIndex = null
            } else if (activeNoteIndex !== null && activeNoteIndex > noteIndex) {
                activeNoteIndex--
            }

            // Refresh current view
            const activeSection = document.querySelector(".section.active")
            if (activeSection) {
                if (activeSection.id === "view-notes") {
                    displayAllNotes()
                    updateNotesStats()
                } else if (activeSection.id === "note-detail" || activeSection.id === "edit-note") {
                    showSection("new-note")
                }
            }

            updateSidebarNotesList()
            
            // Show success message
            toastSystem.success(`Note "${note.title}" deleted successfully`)
        }
        
    } catch (error) {
        console.error('Error deleting note:', error)
        toastSystem.error('Failed to delete note. Please try again.')
    }
}

// Create and update the sidebar notes list
function createSidebarNotesList() {
    let sidebarContainer = document.getElementById("sidebar-notes-list")
    if (!sidebarContainer) {
        sidebarContainer = document.createElement("div")
        sidebarContainer.id = "sidebar-notes-list"
        document.body.appendChild(sidebarContainer)
    }

    const headerHTML = `
        <div id="sidebar-notes-header">
            <h3>Your Notes</h3>
            <div class="notes-stats-sidebar">
                <span id="sidebar-notes-count">${notes.length} notes</span>
            </div>
        </div>
    `

    const notesHTML = `
        <div class="sidebar-notes-container" id="sidebar-notes-container">
            ${generateSidebarNotesHTML()}
        </div>
    `

    sidebarContainer.innerHTML = headerHTML + notesHTML
}

// Generate HTML for sidebar notes
function generateSidebarNotesHTML() {
    if (notes.length === 0) {
        return '<div class="sidebar-note-item" style="text-align: center; color: #adb5bd; font-style: italic;">No notes yet</div>'
    }

    return notes
        .map((note, index) => {
            const isActive = activeNoteIndex === index
            const hasAudio = note.audio ? "🎵" : ""
            const preview = note.content.substring(0, 50) + (note.content.length > 50 ? "..." : "")
            const createdDate = note.createdAt ? new Date(note.createdAt).toLocaleDateString() : ""

            return `
                <div class="sidebar-note-item ${isActive ? "active" : ""}" 
                     onclick="selectSidebarNote(${index})" 
                     data-note-index="${index}">
                    <div class="sidebar-note-title">${escapeHtml(note.title)}</div>
                    <div class="sidebar-note-preview">${escapeHtml(preview)}</div>
                    <div class="sidebar-note-meta">
                        <span>${createdDate}</span>
                        ${hasAudio ? `<span class="sidebar-note-audio-indicator">${hasAudio}</span>` : ""}
                    </div>
                </div>
            `
        })
        .join("")
}

// Update the sidebar notes list
function updateSidebarNotesList() {
    const container = document.getElementById("sidebar-notes-container")
    const countElement = document.getElementById("sidebar-notes-count")

    if (container) {
        container.innerHTML = generateSidebarNotesHTML()
    }

    if (countElement) {
        countElement.textContent = `${notes.length} note${notes.length !== 1 ? "s" : ""}`
    }
}

// Handle clicking on a sidebar note
function selectSidebarNote(noteIndex) {
    if (noteIndex < 0 || noteIndex >= notes.length) return

    activeNoteIndex = noteIndex
    updateSidebarNotesList()
    showNoteDetail(noteIndex)
}

// Show detailed view of a specific note
function showNoteDetail(noteIndex) {
    const note = notes[noteIndex]
    if (!note) return

    let detailSection = document.getElementById("note-detail")
    if (!detailSection) {
        detailSection = document.createElement("div")
        detailSection.id = "note-detail"
        detailSection.className = "section"
        detailSection.setAttribute("data-title", "Note Details")
        document.querySelector(".container").appendChild(detailSection)
    }

    const audioPlayer = note.audio ? voiceNoteUI.createAudioPlayer(note.audio, noteIndex) : ""
    const createdDate = note.createdAt ? new Date(note.createdAt).toLocaleString() : "Unknown date"
    const modifiedDate =
        note.lastModified && note.lastModified !== note.createdAt
            ? ` • Last modified: ${new Date(note.lastModified).toLocaleString()}`
            : ""

    detailSection.innerHTML = `
        <div class="section-content">
            <div class="note-detail-view">
                <div class="note-detail-title">${escapeHtml(note.title)}</div>
                <div class="note-detail-content">${escapeHtml(note.content)}</div>
                ${audioPlayer}
                <div class="note-detail-actions">
                    <button type="button" class="btn-secondary" onclick="editNoteWithWorkflow(${noteIndex})">
                        ✏️ Edit Note
                    </button>
                    <button type="button" class="btn-danger" onclick="deleteNoteWithWorkflow(${noteIndex})">
                        🗑️ Delete Note
                    </button>
                </div>
                <div class="note-detail-metadata">
                    Created: ${createdDate}${modifiedDate}
                </div>
            </div>
        </div>
    `

    showSection("note-detail")
}

// Create and show edit section
function createAndShowEditSection(note) {
    const editSection = createEditNoteSection()
    
    const audioContainerHtml = `<div id="edit-audio-container"></div>`
    
    editSection.innerHTML = `
        <div class="section-content">
            <div class="note-detail-view">
                <h2 style="display: block; font-size: 24px; margin-bottom: 20px; color: #2c3e50;">
                    Edit Note: "${escapeHtml(note.title)}"
                </h2>
                <form id="edit-note-form">
                    <div class="form-group">
                        <label for="edit-note-title">Note Title:</label>
                        <input type="text" id="edit-note-title" required placeholder="Enter note title..." value="${escapeHtml(note.title)}" class="prefilled">
                    </div>
                    <div class="form-group">
                        <label for="edit-note-content">Note Content:</label>
                        <textarea id="edit-note-content" required placeholder="Enter your note content here..." class="prefilled">${escapeHtml(note.content)}</textarea>
                    </div>
                    
                    ${audioContainerHtml}
                    
                    <div class="edit-actions">
                        <button type="submit" class="btn-secondary">Update Note</button>
                        <button type="button" class="btn-danger" onclick="exitEditMode()">Cancel Edit</button>
                    </div>
                </form>
                <div id="edit-note-message"></div>
            </div>
        </div>
    `

    showSection("edit-note")

    setTimeout(() => {
        voiceNoteUI.createRecordingInterface("edit-audio-container")
        
        const audioDataInput = document.getElementById("audio-data")
        if (note.audio && audioDataInput) {
            audioDataInput.value = note.audio
            voiceNoteUI.displayExistingAudio(note.audio)
        } else if (audioDataInput) {
            audioDataInput.value = ""
        }

        const editForm = document.getElementById("edit-note-form")
        if (editForm) {
            editForm.addEventListener("submit", handleEditNoteSubmission)
        }
    }, 100)
}

// Create edit note section
function createEditNoteSection() {
    let editSection = document.getElementById("edit-note")
    if (!editSection) {
        editSection = document.createElement("div")
        editSection.id = "edit-note"
        editSection.className = "section"
        editSection.setAttribute("data-title", "Edit Note")
        document.querySelector(".container").appendChild(editSection)
    }
    return editSection
}

// Handle edit note form submission
async function handleEditNoteSubmission(e) {
    e.preventDefault()

    const title = document.getElementById("edit-note-title").value.trim()
    const content = document.getElementById("edit-note-content").value.trim()
    const audioData = document.getElementById("audio-data")?.value || null
    const messageDiv = document.getElementById("edit-note-message")

    // Clear any previous messages
    if (messageDiv) {
        messageDiv.innerHTML = ""
    }

    // Validation
    if (!title) {
        showMessage(messageDiv, "Please enter a title.", "error")
        return
    }

    if (!content) {
        showMessage(messageDiv, "Please enter content.", "error")
        return
    }

    if (editingNoteIndex !== null && editingNoteIndex >= 0 && editingNoteIndex < notes.length) {
        try {
            const updatedData = {
                title,
                content,
                audio: audioData,
                lastModified: new Date().toISOString()
            }

            await completeNoteEdit(editingNoteIndex, updatedData)
            showMessage(messageDiv, "Note updated successfully!", "success")
            
        } catch (error) {
            console.error('Error in form submission:', error)
            showMessage(messageDiv, "Failed to update note. Please try again.", "error")
        }
    } else {
        showMessage(messageDiv, "Error: Invalid note index", "error")
    }
}

// Exit edit mode
function exitEditMode() {
    const currentEditingIndex = editingNoteIndex
    editingNoteIndex = null

    if (currentEditingIndex !== null && currentEditingIndex >= 0 && currentEditingIndex < notes.length) {
        activeNoteIndex = currentEditingIndex
        updateSidebarNotesList()
        showNoteDetail(currentEditingIndex)
    } else {
        showSection("new-note")
    }
}

// Show a section and hide others
function showSection(sectionId) {
    const sections = document.querySelectorAll(".section")
    sections.forEach((section) => {
        section.classList.remove("active")
    })

    const targetSection = document.getElementById(sectionId)
    if (targetSection) {
        targetSection.classList.add("active")
    }

    if (sectionId !== "note-detail" && sectionId !== "edit-note") {
        activeNoteIndex = null
        updateSidebarNotesList()
    }

    switch (sectionId) {
        case "new-note":
            initializeNewNoteSection()
            break
        case "view-notes":
            displayAllNotes()
            updateNotesStats()
            break
    }
}

// Initialize new note section
function initializeNewNoteSection() {
    if (editingNoteIndex === null) {
        const audioContainer = document.getElementById("audio-container")
        if (audioContainer && !audioContainer.hasChildNodes()) {
            voiceNoteUI.createRecordingInterface("audio-container")
        }

        const titleInput = document.getElementById("note-title")
        const contentInput = document.getElementById("note-content")

        if (titleInput && !titleInput.value) {
            const sampleTitles = ["Meeting Notes", "Project Ideas", "Daily Reminders", "Study Notes", "Recipe Ideas"]
            const randomTitle = sampleTitles[Math.floor(Math.random() * sampleTitles.length)]
            titleInput.placeholder = `Example: ${randomTitle}`
        }

        if (contentInput && !contentInput.value) {
            contentInput.placeholder = "Start typing your note here... You can also add a voice recording using the microphone button below."
        }
    }
}

// Display all notes
function displayAllNotes() {
    const container = document.getElementById("notes-container")

    if (notes.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #aaa; padding: 40px;">No notes available. <a href="#" onclick="showSection(\'new-note\')" style="color: #007bff;">Create your first note</a>!</p>'
        return
    }

    let html = ""
    notes.forEach((note, index) => {
        const audioPlayer = note.audio ? voiceNoteUI.createAudioPlayer(note.audio, index) : ""
        const createdDate = note.createdAt ? new Date(note.createdAt).toLocaleString() : "Unknown date"
        const modifiedDate =
            note.lastModified && note.lastModified !== note.createdAt
                ? ` (Last modified: ${new Date(note.lastModified).toLocaleString()})`
                : ""

        html += `
            <div class="note-item" data-note-id="${note.id || index}" id="note-${index}">
                <div class="note-title">
                    ${escapeHtml(note.title)}
                </div>
                <div class="note-content" id="note-content-${index}">
                    ${escapeHtml(note.content)}
                </div>
                ${audioPlayer}
                <div class="note-actions">
                    <button type="button" class="btn-secondary" onclick="editNoteWithWorkflow(${index})">
                        ✏️ Edit
                    </button>
                    <button type="button" class="btn-danger" onclick="deleteNoteWithWorkflow(${index})">
                        🗑️ Delete
                    </button>
                </div>
                <div class="note-metadata">
                    <small>Created: ${createdDate}${modifiedDate}</small>
                </div>
            </div>
        `
    })

    container.innerHTML = html
}

// Update notes statistics
async function updateNotesStats() {
    const statsElement = document.getElementById("notes-stats")
    if (!statsElement) return

    try {
        const stats = await dataManager.getNotesStatistics()
        const audioCount = stats.withAudio
        const textOnly = stats.withoutAudio

        statsElement.innerHTML = `
            📝 ${stats.total} note${stats.total !== 1 ? "s" : ""} 
            ${audioCount > 0 ? `| 🎵 ${audioCount} with audio` : ""} 
            ${textOnly > 0 ? `| 📄 ${textOnly} text only` : ""}
        `
    } catch (error) {
        // Fallback to simple count if stats calculation fails
        statsElement.innerHTML = `📝 ${notes.length} note${notes.length !== 1 ? "s" : ""}`
    }
}

// Setup event listeners
function setupEventListeners() {
    // note form submission
    const noteForm = document.getElementById("note-form")
    if (noteForm) {
        noteForm.addEventListener("submit", handleNoteSubmission)
    }

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'n':
                    e.preventDefault()
                    showSection('new-note')
                    break
                case 's':
                    e.preventDefault()
                    if (editingNoteIndex !== null) {
                        const form = document.getElementById('edit-note-form')
                        if (form) form.requestSubmit()
                    } else {
                        const form = document.getElementById('note-form')
                        if (form) form.requestSubmit()
                    }
                    break
                case 'e':
                    e.preventDefault()
                    exportNotes()
                    break
            }
        }
    })

    // Listen for data manager loading events
    window.addEventListener('dataManagerLoading', (e) => {
        const { operation, isLoading } = e.detail
        updateLoadingState(operation, isLoading)
    })
}

// Handle note form submission
async function handleNoteSubmission(e) {
    e.preventDefault()

    const title = document.getElementById("note-title").value.trim()
    const content = document.getElementById("note-content").value.trim()
    const audioData = document.getElementById("audio-data")?.value || null
    const messageDiv = document.getElementById("new-note-message")

    if (!title || !content) {
        showMessage(messageDiv, "Please fill in both title and content.", "error")
        return
    }

    try {
        const newNote = {
            id: generateNoteId(),
            title: title,
            content: content,
            audio: audioData,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            category: 'personal',
            tags: [],
            priority: 'medium',
            isPublic: false
        }

        notes.push(newNote)
        await saveNotes()

        clearNoteForm()
        
        activeNoteIndex = notes.length - 1
        updateSidebarNotesList()
        showNoteDetail(activeNoteIndex)

        showMessage(messageDiv, "Note saved successfully!", "success")
        
        const audioMessage = audioData ? " with audio recording" : ""
        toastSystem.success(`Note created${audioMessage}! You now have ${notes.length} notes.`)

    } catch (error) {
        await errorHandler.handleError(error, {
            operation: 'create_note',
            userInitiated: true
        })
        showMessage(messageDiv, "Failed to save note. Please try again.", "error")
    }
}

// Clear note form
function clearNoteForm() {
    const titleInput = document.getElementById("note-title")
    const contentInput = document.getElementById("note-content")
    
    if (titleInput) {
        titleInput.value = ""
        titleInput.classList.remove("prefilled")
    }
    
    if (contentInput) {
        contentInput.value = ""
        contentInput.classList.remove("prefilled")
    }

    const audioDataInput = document.getElementById("audio-data")
    const audioPreview = document.getElementById("audio-preview")
    const recordingTimer = document.getElementById("recording-timer")

    if (audioDataInput) audioDataInput.value = ""
    if (audioPreview) audioPreview.innerHTML = ""
    if (recordingTimer) recordingTimer.textContent = "00:00"

    const recordBtn = document.getElementById("record-btn")
    const stopBtn = document.getElementById("stop-btn")

    if (recordBtn) {
        recordBtn.disabled = false
        recordBtn.textContent = "🎤 Record"
        recordBtn.classList.remove("recording")
    }

    if (stopBtn) stopBtn.disabled = true
}

// Delete note audio
async function deleteNoteAudio(noteIndex) {
    if (noteIndex >= 0 && noteIndex < notes.length) {
        try {
            const confirmed = await modalSystem.confirm({
                title: 'Delete Audio',
                message: 'Are you sure you want to delete the audio from this note?',
                icon: '🎵',
                confirmText: 'Delete Audio',
                cancelText: 'Keep Audio'
            })

            if (confirmed) {
                notes[noteIndex].audio = null
                notes[noteIndex].lastModified = new Date().toISOString()
                await saveNotes()

                // Refresh current view
                const activeSection = document.querySelector(".section.active")
                if (activeSection && activeSection.id === "view-notes") {
                    displayAllNotes()
                    updateNotesStats()
                } else if (activeSection && activeSection.id === "note-detail") {
                    showNoteDetail(noteIndex)
                } else if (activeSection && activeSection.id === "edit-note") {
                    editNoteWithWorkflow(noteIndex)
                }

                toastSystem.success("Audio deleted successfully")
            }
        } catch (error) {
            await errorHandler.handleError(error, {
                operation: 'delete_audio',
                userInitiated: true
            })
        }
    }
}

// Export notes with workflow
async function exportNotes() {
    try {
        const format = await modalSystem.showChoice({
            title: 'Export Notes',
            message: 'Choose export format:',
            icon: '📤',
            choices: [
                { value: 'json', label: 'JSON (Complete)', type: 'primary' },
                { value: 'csv', label: 'CSV (Spreadsheet)', type: 'secondary' },
                { value: 'txt', label: 'Text (Simple)', type: 'outline' }
            ]
        })

        if (format) {
            const result = await businessLogic.startExportWorkflow({
                format,
                includeAudio: true,
                includeCategories: true,
                includeTemplates: false
            })

            if (result.success) {
                toastSystem.success(`Exported ${result.notesCount} notes as ${result.filename}`)
            }
        }
    } catch (error) {
        await errorHandler.handleError(error, {
            operation: 'export_notes',
            userInitiated: true
        })
    }
}

// Show message in UI element
function showMessage(container, message, type = "success") {
    if (!container) return

    container.innerHTML = `<div class="message ${type}">${message}</div>`

    setTimeout(() => {
        container.innerHTML = ""
    }, 3000)
}

// Update loading state for UI
function updateLoadingState(operation, isLoading) {
    const loadingElements = document.querySelectorAll(`[data-loading="${operation}"]`)
    loadingElements.forEach(element => {
        if (isLoading) {
            element.classList.add('loading')
        } else {
            element.classList.remove('loading')
        }
    })
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
}

// Show initial loading screen
function showInitialLoader() {
    const loader = document.createElement('div')
    loader.id = 'initial-loader'
    loader.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    `
    
    loader.innerHTML = `
        <div style="text-align: center;">
            <div style="width: 60px; height: 60px; border: 4px solid rgba(255,255,255,0.3); border-top: 4px solid white; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px;"></div>
            <h2 style="margin: 0 0 10px 0; font-weight: 300;">Notes App</h2>
            <p style="margin: 0; opacity: 0.8;">Loading your personalized experience...</p>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `
    
    document.body.appendChild(loader)
}

// Hide initial loading screen
function hideInitialLoader() {
    const loader = document.getElementById('initial-loader')
    if (loader) {
        loader.style.opacity = '0'
        loader.style.transition = 'opacity 0.5s ease'
        setTimeout(() => {
            if (loader.parentNode) {
                loader.parentNode.removeChild(loader)
            }
        }, 500)
    }
}

// Show fallback error when systems fail to initialize
function showFallbackError(message) {
    const fallback = document.createElement('div')
    fallback.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        text-align: center;
        max-width: 400px;
        z-index: 10001;
    `
    
    fallback.innerHTML = `
        <div style="color: #dc3545; font-size: 48px; margin-bottom: 16px;">❌</div>
        <h3 style="color: #2c3e50; margin: 0 0 12px 0;">System Error</h3>
        <p style="color: #495057; margin: 0 0 20px 0;">${message}</p>
        <button onclick="location.reload()" style="
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
        ">Refresh Page</button>
    `
    
    document.body.appendChild(fallback)
}

// Perform system health check
async function performSystemHealthCheck() {
    try {
        const healthCheck = await dataManager.performHealthCheck()
        
        if (healthCheck.status === 'critical') {
            toastSystem.error('Some features may not work properly. Check console for details.')
        } else if (healthCheck.status === 'warning') {
            toastSystem.warning('Some advanced features are limited.')
        }
        
        debugLog('System Health Check completed', healthCheck)
        
    } catch (error) {
        debugLog('Health check failed', error)
    }
}

// Initialize audio systems with better error handling
async function initializeAudioSystems() {
    try {
        if (!window.RecordRTC) {
            appState.features.voiceNotes = false
            toastSystem.warning('Audio recording not available - RecordRTC library not loaded')
            
            // Create mock objects to prevent errors
            audioManager = { isSupported: () => false }
            voiceNoteUI = {
                createRecordingInterface: () => {},
                createAudioPlayer: () => "",
                displayExistingAudio: () => {},
                cleanup: () => {}
            }
            return false
        }

        audioManager = new AudioManager()
        voiceNoteUI = new VoiceNoteUI(audioManager)
        
        // Make globally available
        window.voiceNoteUI = voiceNoteUI
        window.audioManager = audioManager
        
        debugLog('Audio systems initialized successfully')
        return true
        
    } catch (error) {
        appState.features.voiceNotes = false
        toastSystem.warning('Audio features disabled due to initialization error')
        
        // Create mock objects
        audioManager = { isSupported: () => false }
        voiceNoteUI = {
            createRecordingInterface: () => {},
            createAudioPlayer: () => "",
            displayExistingAudio: () => {},
            cleanup: () => {}
        }
        return false
    }
}

// Handle initialization errors
async function handleInitializationError(error) {
    hideInitialLoader()
    
    // Try to show error with modal system if available
    if (modalSystem) {
        await modalSystem.showError(
            `The application failed to initialize properly.\n\nError: ${error.message}\n\nPlease refresh the page to try again.`,
            {
                title: 'Initialization Error',
                icon: '💥'
            }
        )
    } else {
        // Fallback to basic error display
        showFallbackError(`Initialization failed: ${error.message}`)
    }
}

// Setup global functions for HTML event handlers
function setupGlobalFunctions() {
    // Make functions globally available for HTML onclick handlers
    window.showSection = showSection
    window.selectSidebarNote = selectSidebarNote
    window.editNoteWithWorkflow = editNoteWithWorkflow
    window.deleteNoteWithWorkflow = deleteNoteWithWorkflow
    window.exitEditMode = exitEditMode
    window.deleteNoteAudio = deleteNoteAudio
    window.exportNotes = exportNotes
    
    // Legacy function names for compatibility
    window.editNote = editNoteWithWorkflow
    window.showDeleteConfirmation = deleteNoteWithWorkflow
    window.confirmDeleteNote = deleteNoteWithWorkflow
}

// Initialize the complete application
async function initializeApplication() {
    try {
        debugLog('Starting Notes App initialization...')
        
        // Show loading screen
        showInitialLoader()
        
        // Initialize core systems
        await initializeSystems()
        debugLog('Core systems initialized')
        
        // Load application data
        await loadApplicationData()
        debugLog('Application data loaded')
        
        // Initialize audio systems
        await initializeAudioSystems()
        debugLog('Audio systems ready')
        
        // Setup UI components
        createSidebarNotesList()
        debugLog('UI components created')
        
        // Setup event listeners
        setupEventListeners()
        setupGlobalFunctions()
        debugLog('Event listeners configured')
        
        // Show initial view
        if (notes.length > 0) {
            activeNoteIndex = 0
            updateSidebarNotesList()
            showNoteDetail(0)
        } else {
            showSection("new-note")
        }
        
        // Mark as initialized
        appState.isInitialized = true
        
        // Hide loading screen
        hideInitialLoader()
        
        // Show success notification
        toastSystem.success('🎉 Notes App ready! New features unlocked.')
        
        // Perform health check
        setTimeout(performSystemHealthCheck, 1000)
        
        debugLog('Notes App fully initialized!')
        
    } catch (error) {
        await handleInitializationError(error)
    }
}

// Main application entry point
async function main() {
    try {
        // Check for required dependencies
        const missingDeps = []
        
        if (!window.DataManager) missingDeps.push('DataManager')
        if (!window.CustomModalSystem) missingDeps.push('CustomModalSystem')
        if (!window.ToastNotificationSystem) missingDeps.push('ToastNotificationSystem')
        if (!window.ErrorHandlingSystem) missingDeps.push('ErrorHandlingSystem')
        if (!window.BusinessLogicManager) missingDeps.push('BusinessLogicManager')
        
        if (missingDeps.length > 0) {
            throw new Error(`Missing required dependencies: ${missingDeps.join(', ')}. Please ensure all script files are loaded.`)
        }
        
        // Initialize application
        await initializeApplication()
        
    } catch (error) {
        showFallbackError(`Critical initialization error: ${error.message}`)
    }
}

// Cleanup function for page unload
function cleanup() {
    try {
        if (voiceNoteUI) voiceNoteUI.cleanup()
        if (audioManager) audioManager.cleanup()
        if (errorHandler) errorHandler.cleanup()
        if (modalSystem) modalSystem.cleanup()
        if (toastSystem) toastSystem.cleanup()
        if (dataManager) dataManager.cleanup()
        
        debugLog('Application cleanup completed')
    } catch (error) {
        // Silent cleanup - no user notification needed
    }
}

// Setup page lifecycle handlers
window.addEventListener("beforeunload", cleanup)

// Auto-save functionality
let autoSaveInterval
function startAutoSave() {
    if (autoSaveInterval) clearInterval(autoSaveInterval)
    
    autoSaveInterval = setInterval(async () => {
        if (notes.length > 0) {
            try {
                await saveNotes()
                debugLog('Auto-save completed')
            } catch (error) {
                debugLog('Auto-save failed', error)
            }
        }
    }, 30000) // Auto-save every 30 seconds
}

// Initialize auto-save once app is ready
window.addEventListener('load', () => {
    setTimeout(startAutoSave, 5000)
})

// Start the application when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main)
} else {
    main()
}