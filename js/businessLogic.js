/**
 * Complete Business Logic Manager
 * Handles the full note lifecycle and business processes
 */

class BusinessLogicManager {
    constructor(dataManager, modalSystem, toastSystem) {
        this.dataManager = dataManager;
        this.modalSystem = modalSystem;
        this.toastSystem = toastSystem;
        
        // Business state
        this.currentWorkflow = null;
        this.workflowHistory = [];
        this.businessRules = new Map();
        this.validationRules = new Map();
        
        this.initializeBusinessRules();
    }

    /**
     * Initialize business rules and validation
     */
    initializeBusinessRules() {
        // Note creation rules
        this.businessRules.set('note_creation', {
            requiresTemplate: false,
            requiresCategory: true,
            allowEmptyContent: false,
            maxDailyNotes: 100,
            autoSaveEnabled: true
        });

        // Template usage rules
        this.businessRules.set('template_usage', {
            trackUsage: true,
            allowCustomization: true,
            maxCustomTemplates: 50,
            shareTemplates: false
        });

        // Category management rules
        this.businessRules.set('category_management', {
            maxCategories: 20,
            allowColorCustomization: true,
            requireUniqueNames: true,
            preventDeleteWithNotes: true
        });

        // Export/Import rules
        this.businessRules.set('data_export', {
            includeMetadata: true,
            includeAudio: true,
            maxExportSize: 50 * 1024 * 1024, // 50MB
            allowBatchOperations: true
        });

        // Validation rules
        this.validationRules.set('note', {
            title: { required: true, minLength: 1, maxLength: 200 },
            content: { required: true, minLength: 1, maxLength: 50000 },
            category: { required: true, validCategories: true },
            tags: { maxCount: 10, maxLength: 30 },
            priority: { enum: ['low', 'medium', 'high'] }
        });
    }

    /**
     * Start note creation workflow
     * @param {Object} options - Creation options
     * @returns {Promise<Object>} Creation result
     */
    async startNoteCreationWorkflow(options = {}) {
        try {
            this.currentWorkflow = {
                type: 'note_creation',
                startTime: Date.now(),
                steps: [],
                data: {}
            };

            // Step 1: Template Selection
            const templateResult = await this.handleTemplateSelection(options.templateId);
            this.currentWorkflow.steps.push({ step: 'template_selection', result: templateResult });

            // Step 2: Category Selection
            const categoryResult = await this.handleCategorySelection(options.categoryId);
            this.currentWorkflow.steps.push({ step: 'category_selection', result: categoryResult });

            // Step 3: Note Creation Form
            const noteData = await this.handleNoteCreation(templateResult.template, categoryResult.category);
            this.currentWorkflow.steps.push({ step: 'note_creation', result: noteData });

            // Step 4: Validation
            const validationResult = await this.validateNoteData(noteData);
            this.currentWorkflow.steps.push({ step: 'validation', result: validationResult });

            if (!validationResult.isValid) {
                throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
            }

            // Step 5: Save Note
            const saveResult = await this.saveNote(noteData);
            this.currentWorkflow.steps.push({ step: 'save', result: saveResult });

            // Step 6: Post-creation actions
            await this.handlePostCreationActions(saveResult.note);

            this.completeWorkflow('success');
            
            return {
                success: true,
                note: saveResult.note,
                workflow: this.currentWorkflow
            };

        } catch (error) {
            this.completeWorkflow('error', error);
            throw error;
        }
    }

    /**
     * Handle template selection
     * @param {string} templateId - Pre-selected template ID
     * @returns {Promise<Object>} Template selection result
     */
    async handleTemplateSelection(templateId = null) {
        if (templateId) {
            const template = await this.dataManager.getTemplate(templateId);
            if (template) {
                return { template, source: 'preselected' };
            }
        }

        // Show template selection dialog
        const templates = await this.dataManager.loadTemplates();
        const activeTemplates = templates.filter(t => t.isActive);

        if (activeTemplates.length === 0) {
            return { template: null, source: 'none_available' };
        }

        const choices = activeTemplates.map(template => ({
            value: template.id,
            label: `${template.icon} ${template.name}`,
            type: template.isDefault ? 'primary' : 'outline'
        }));

        const selectedTemplateId = await this.modalSystem.showChoice({
            title: 'Choose Note Template',
            message: 'Select a template to get started quickly, or choose blank for a custom note.',
            icon: '📝',
            choices
        });

        if (!selectedTemplateId) {
            throw new Error('Template selection cancelled');
        }

        const selectedTemplate = activeTemplates.find(t => t.id === selectedTemplateId);
        
        // Track template usage
        this.trackTemplateUsage(selectedTemplateId);

        return { template: selectedTemplate, source: 'user_selected' };
    }

    /**
     * Handle category selection
     * @param {string} categoryId - Pre-selected category ID
     * @returns {Promise<Object>} Category selection result
     */
    async handleCategorySelection(categoryId = null) {
        if (categoryId) {
            const category = await this.dataManager.getCategory(categoryId);
            if (category) {
                return { category, source: 'preselected' };
            }
        }

        const categories = await this.dataManager.loadCategories();
        const activeCategories = categories.filter(c => c.isActive);

        if (activeCategories.length === 0) {
            throw new Error('No categories available');
        }

        if (activeCategories.length === 1) {
            return { category: activeCategories[0], source: 'auto_selected' };
        }

        const choices = activeCategories.map(category => ({
            value: category.id,
            label: `${category.icon} ${category.name}`,
            type: category.isDefault ? 'primary' : 'outline'
        }));

        const selectedCategoryId = await this.modalSystem.showChoice({
            title: 'Choose Category',
            message: 'Select a category to organize your note.',
            icon: '📁',
            choices
        });

        if (!selectedCategoryId) {
            throw new Error('Category selection cancelled');
        }

        const selectedCategory = activeCategories.find(c => c.id === selectedCategoryId);
        
        return { category: selectedCategory, source: 'user_selected' };
    }

    /**
     * Handle note creation form
     * @param {Object} template - Selected template
     * @param {Object} category - Selected category
     * @returns {Promise<Object>} Note data
     */
    async handleNoteCreation(template, category) {
        // This would integrate with the existing note creation form
        // For now, return the basic structure that would be filled by the UI
        
        const noteData = {
            id: this.generateNoteId(),
            title: template ? template.title : 'New Note',
            content: template ? template.content : '',
            category: category.id,
            tags: template ? [...template.tags] : [],
            priority: 'medium',
            isPublic: false,
            audio: null,
            template: template ? template.id : null,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };

        return noteData;
    }

    /**
     * Validate note data against business rules
     * @param {Object} noteData - Note data to validate
     * @returns {Promise<Object>} Validation result
     */
    async validateNoteData(noteData) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            businessRuleViolations: []
        };

        // Get validation rules
        const noteRules = this.validationRules.get('note');
        
        // Validate title
        if (noteRules.title.required && (!noteData.title || noteData.title.trim().length === 0)) {
            validation.errors.push('Title is required');
            validation.isValid = false;
        }
        
        if (noteData.title && noteData.title.length > noteRules.title.maxLength) {
            validation.errors.push(`Title too long (max ${noteRules.title.maxLength} characters)`);
            validation.isValid = false;
        }

        // Validate content
        if (noteRules.content.required && (!noteData.content || noteData.content.trim().length === 0)) {
            validation.errors.push('Content is required');
            validation.isValid = false;
        }
        
        if (noteData.content && noteData.content.length > noteRules.content.maxLength) {
            validation.errors.push(`Content too long (max ${noteRules.content.maxLength} characters)`);
            validation.isValid = false;
        }

        // Validate category
        if (noteRules.category.required && !noteData.category) {
            validation.errors.push('Category is required');
            validation.isValid = false;
        }

        if (noteRules.category.validCategories && noteData.category) {
            const categories = await this.dataManager.loadCategories();
            const validCategory = categories.find(c => c.id === noteData.category && c.isActive);
            if (!validCategory) {
                validation.errors.push('Invalid category selected');
                validation.isValid = false;
            }
        }

        // Validate tags
        if (noteData.tags && Array.isArray(noteData.tags)) {
            if (noteData.tags.length > noteRules.tags.maxCount) {
                validation.warnings.push(`Too many tags (max ${noteRules.tags.maxCount})`);
            }
            
            noteData.tags.forEach(tag => {
                if (tag && tag.length > noteRules.tags.maxLength) {
                    validation.warnings.push(`Tag "${tag}" too long (max ${noteRules.tags.maxLength} chars)`);
                }
            });
        }

        // Validate priority
        if (noteData.priority && !noteRules.priority.enum.includes(noteData.priority)) {
            validation.errors.push('Invalid priority value');
            validation.isValid = false;
        }

        // Business rule validations
        await this.validateBusinessRules(noteData, validation);

        return validation;
    }

    /**
     * Validate business rules
     * @param {Object} noteData - Note data
     * @param {Object} validation - Validation object to update
     */
    async validateBusinessRules(noteData, validation) {
        const creationRules = this.businessRules.get('note_creation');
        
        // Check daily note limit
        if (creationRules.maxDailyNotes) {
            const todayCount = await this.getTodayNoteCount();
            if (todayCount >= creationRules.maxDailyNotes) {
                validation.businessRuleViolations.push(`Daily note limit reached (${creationRules.maxDailyNotes})`);
                validation.isValid = false;
            }
        }

        // Check empty content rule
        if (!creationRules.allowEmptyContent && (!noteData.content || noteData.content.trim().length === 0)) {
            validation.businessRuleViolations.push('Empty content not allowed by business rules');
            validation.isValid = false;
        }
    }

    /**
     * Save note with full business logic
     * @param {Object} noteData - Note data to save
     * @returns {Promise<Object>} Save result
     */
    async saveNote(noteData) {
        try {
            // Get existing notes
            const existingNotes = JSON.parse(localStorage.getItem('notes') || '[]');
            
            // Add the new note
            existingNotes.push(noteData);
            
            // Save to localStorage
            localStorage.setItem('notes', JSON.stringify(existingNotes));
            
            // Track business metrics
            await this.trackNoteCreated(noteData);
            
            return {
                success: true,
                note: noteData,
                noteCount: existingNotes.length
            };
            
        } catch (error) {
            throw new Error(`Failed to save note: ${error.message}`);
        }
    }

    /**
     * Handle post-creation actions
     * @param {Object} note - Created note
     */
    async handlePostCreationActions(note) {
        // Show success notification
        this.toastSystem.success(`Note "${note.title}" created successfully!`, {
            actions: [
                {
                    label: 'Edit',
                    onClick: `window.editNote(${JSON.stringify(note.id)})`
                },
                {
                    label: 'Share',
                    onClick: `window.shareNote(${JSON.stringify(note.id)})`
                }
            ]
        });

        // Update UI statistics
        await this.updateDashboardStats();
        
        // Check for achievements
        await this.checkAchievements();
        
        // Auto-backup if enabled
        await this.performAutoBackup();
    }

    /**
     * Start note editing workflow
     * @param {string} noteId - Note ID to edit
     * @returns {Promise<Object>} Edit result
     */
    async startNoteEditingWorkflow(noteId) {
        try {
            this.currentWorkflow = {
                type: 'note_editing',
                startTime: Date.now(),
                steps: [],
                data: { noteId }
            };

            // Step 1: Load note
            const note = await this.loadNoteForEditing(noteId);
            this.currentWorkflow.steps.push({ step: 'load_note', result: note });

            // Step 2: Validate edit permissions
            const permissionResult = await this.validateEditPermissions(note);
            this.currentWorkflow.steps.push({ step: 'validate_permissions', result: permissionResult });

            if (!permissionResult.canEdit) {
                throw new Error(`Cannot edit note: ${permissionResult.reason}`);
            }

            // Step 3: Create backup
            const backupResult = await this.createNoteBackup(note);
            this.currentWorkflow.steps.push({ step: 'create_backup', result: backupResult });

            // Note: The actual editing happens in the UI, this workflow tracks the process
            
            this.completeWorkflow('editing_started');
            
            return {
                success: true,
                note,
                canEdit: true,
                backup: backupResult.backupId,
                workflow: this.currentWorkflow
            };

        } catch (error) {
            this.completeWorkflow('error', error);
            throw error;
        }
    }

    /**
     * Complete note editing workflow
     * @param {string} noteId - Note ID
     * @param {Object} updatedData - Updated note data
     * @returns {Promise<Object>} Update result
     */
    async completeNoteEditingWorkflow(noteId, updatedData) {
        try {
            // Step 1: Validate updated data
            const validationResult = await this.validateNoteData(updatedData);
            if (!validationResult.isValid) {
                throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
            }

            // Step 2: Load original note
            const originalNote = await this.loadNoteForEditing(noteId);

            // Step 3: Apply changes
            const updatedNote = {
                ...originalNote,
                ...updatedData,
                lastModified: new Date().toISOString(),
                editHistory: [...(originalNote.editHistory || []), {
                    timestamp: new Date().toISOString(),
                    changes: this.calculateNoteChanges(originalNote, updatedData)
                }]
            };

            // Step 4: Save updated note
            const saveResult = await this.updateExistingNote(noteId, updatedNote);

            // Step 5: Post-update actions
            await this.handlePostUpdateActions(originalNote, updatedNote);

            return {
                success: true,
                note: updatedNote,
                changes: this.calculateNoteChanges(originalNote, updatedData)
            };

        } catch (error) {
            throw error;
        }
    }

    /**
     * Start note deletion workflow
     * @param {string} noteId - Note ID to delete
     * @returns {Promise<Object>} Deletion result
     */
    async startNoteDeletionWorkflow(noteId) {
        try {
            this.currentWorkflow = {
                type: 'note_deletion',
                startTime: Date.now(),
                steps: [],
                data: { noteId }
            };

            // Step 1: Load note for deletion
            const note = await this.loadNoteForEditing(noteId);
            this.currentWorkflow.steps.push({ step: 'load_note', result: note });

            // Step 2: Validate deletion permissions
            const permissionResult = await this.validateDeletionPermissions(note);
            this.currentWorkflow.steps.push({ step: 'validate_permissions', result: permissionResult });

            if (!permissionResult.canDelete) {
                throw new Error(`Cannot delete note: ${permissionResult.reason}`);
            }

            // Step 3: Confirm deletion with user
            const userConfirmed = await this.confirmNoteDeletion(note);
            this.currentWorkflow.steps.push({ step: 'user_confirmation', result: userConfirmed });

            if (!userConfirmed) {
                this.completeWorkflow('cancelled');
                return { success: false, reason: 'User cancelled deletion' };
            }

            // Step 4: Create deletion backup
            const backupResult = await this.createDeletionBackup(note);
            this.currentWorkflow.steps.push({ step: 'create_backup', result: backupResult });

            // Step 5: Perform deletion
            const deletionResult = await this.performNoteDeletion(noteId);
            this.currentWorkflow.steps.push({ step: 'deletion', result: deletionResult });

            // Step 6: Post-deletion cleanup
            await this.handlePostDeletionActions(note);

            this.completeWorkflow('success');

            return {
                success: true,
                deletedNote: note,
                backup: backupResult.backupId,
                workflow: this.currentWorkflow
            };

        } catch (error) {
            this.completeWorkflow('error', error);
            throw error;
        }
    }

    /**
     * Start export workflow
     * @param {Object} exportOptions - Export configuration
     * @returns {Promise<Object>} Export result
     */
    async startExportWorkflow(exportOptions = {}) {
        try {
            this.currentWorkflow = {
                type: 'data_export',
                startTime: Date.now(),
                steps: [],
                data: exportOptions
            };

            const {
                format = 'json',
                includeAudio = true,
                includeCategories = true,
                includeTemplates = false,
                noteIds = null, // null means all notes
                filename = null
            } = exportOptions;

            // Step 1: Load data to export
            const exportData = await this.prepareExportData({
                noteIds,
                includeAudio,
                includeCategories,
                includeTemplates
            });
            this.currentWorkflow.steps.push({ step: 'prepare_data', result: exportData });

            // Step 2: Validate export size
            const sizeValidation = await this.validateExportSize(exportData, format);
            this.currentWorkflow.steps.push({ step: 'validate_size', result: sizeValidation });

            if (!sizeValidation.isValid) {
                throw new Error(`Export too large: ${sizeValidation.reason}`);
            }

            // Step 3: Convert to requested format
            const convertedData = await this.dataManager.exportData(exportData.notes, format);
            this.currentWorkflow.steps.push({ step: 'convert_format', result: { format, size: convertedData.length } });

            // Step 4: Generate filename
            const finalFilename = filename || this.generateExportFilename(format, exportData);
            
            // Step 5: Download file
            const mimeType = this.getExportMimeType(format);
            this.dataManager.downloadFile(convertedData, finalFilename, mimeType);
            this.currentWorkflow.steps.push({ step: 'download', result: { filename: finalFilename } });

            this.completeWorkflow('success');

            return {
                success: true,
                filename: finalFilename,
                format,
                notesCount: exportData.notes.length,
                fileSize: convertedData.length
            };

        } catch (error) {
            this.completeWorkflow('error', error);
            throw error;
        }
    }

    /**
     * Start import workflow
     * @param {File} file - File to import
     * @returns {Promise<Object>} Import result
     */
    async startImportWorkflow(file) {
        try {
            this.currentWorkflow = {
                type: 'data_import',
                startTime: Date.now(),
                steps: [],
                data: { filename: file.name, fileSize: file.size }
            };

            // Step 1: Validate file
            const fileValidation = await this.validateImportFile(file);
            this.currentWorkflow.steps.push({ step: 'validate_file', result: fileValidation });

            if (!fileValidation.isValid) {
                throw new Error(`Invalid file: ${fileValidation.errors.join(', ')}`);
            }

            // Step 2: Read and parse file
            const parseResult = await this.parseImportFile(file);
            this.currentWorkflow.steps.push({ step: 'parse_file', result: parseResult });

            // Step 3: Validate import data
            const dataValidation = await this.validateImportData(parseResult.data);
            this.currentWorkflow.steps.push({ step: 'validate_data', result: dataValidation });

            if (!dataValidation.isValid) {
                const proceed = await this.modalSystem.confirm({
                    title: 'Import Warnings',
                    message: `Import has issues:\n${dataValidation.warnings.join('\n')}\n\nProceed anyway?`,
                    icon: '⚠️',
                    confirmText: 'Import Anyway',
                    cancelText: 'Cancel'
                });

                if (!proceed) {
                    this.completeWorkflow('cancelled');
                    return { success: false, reason: 'User cancelled due to validation issues' };
                }
            }

            // Step 4: Show import preview
            const importPreview = await this.showImportPreview(parseResult.data);
            this.currentWorkflow.steps.push({ step: 'preview', result: importPreview });

            if (!importPreview.confirmed) {
                this.completeWorkflow('cancelled');
                return { success: false, reason: 'User cancelled after preview' };
            }

            // Step 5: Perform import
            const importResult = await this.performDataImport(parseResult.data, importPreview.options);
            this.currentWorkflow.steps.push({ step: 'import', result: importResult });

            // Step 6: Post-import actions
            await this.handlePostImportActions(importResult);

            this.completeWorkflow('success');

            return {
                success: true,
                imported: importResult.imported,
                skipped: importResult.skipped,
                errors: importResult.errors
            };

        } catch (error) {
            this.completeWorkflow('error', error);
            throw error;
        }
    }

    /**
     * Helper Methods
     */

    async loadNoteForEditing(noteId) {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const note = notes.find(n => n.id === noteId);
        
        if (!note) {
            throw new Error('Note not found');
        }
        
        return note;
    }

    async validateEditPermissions(note) {
        // In a real app, this would check user permissions, note locks, etc.
        return {
            canEdit: true,
            reason: null
        };
    }

    async validateDeletionPermissions(note) {
        // Check if note can be deleted
        if (note.isProtected) {
            return {
                canDelete: false,
                reason: 'Note is protected from deletion'
            };
        }

        return {
            canDelete: true,
            reason: null
        };
    }

    async confirmNoteDeletion(note) {
        const hasAudio = note.audio ? '\n\n⚠️ This note contains an audio recording that will also be deleted.' : '';
        
        return await this.modalSystem.confirmDelete(note.title, {
            message: `Are you sure you want to delete "${note.title}"?${hasAudio}\n\nThis action cannot be undone.`
        });
    }

    async createNoteBackup(note) {
        const backupId = `backup_${Date.now()}_${note.id}`;
        const backups = JSON.parse(localStorage.getItem('note_backups') || '{}');
        
        backups[backupId] = {
            note: { ...note },
            timestamp: new Date().toISOString(),
            type: 'edit_backup'
        };
        
        localStorage.setItem('note_backups', JSON.stringify(backups));
        
        return { backupId, success: true };
    }

    async createDeletionBackup(note) {
        const backupId = `deletion_backup_${Date.now()}_${note.id}`;
        const backups = JSON.parse(localStorage.getItem('note_backups') || '{}');
        
        backups[backupId] = {
            note: { ...note },
            timestamp: new Date().toISOString(),
            type: 'deletion_backup'
        };
        
        localStorage.setItem('note_backups', JSON.stringify(backups));
        
        return { backupId, success: true };
    }

    async updateExistingNote(noteId, updatedNote) {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const noteIndex = notes.findIndex(n => n.id === noteId);
        
        if (noteIndex === -1) {
            throw new Error('Note not found for update');
        }
        
        notes[noteIndex] = updatedNote;
        localStorage.setItem('notes', JSON.stringify(notes));
        
        return { success: true, note: updatedNote };
    }

    async performNoteDeletion(noteId) {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const noteIndex = notes.findIndex(n => n.id === noteId);
        
        if (noteIndex === -1) {
            throw new Error('Note not found for deletion');
        }
        
        const deletedNote = notes.splice(noteIndex, 1)[0];
        localStorage.setItem('notes', JSON.stringify(notes));
        
        return { success: true, deletedNote };
    }

    calculateNoteChanges(original, updated) {
        const changes = [];
        
        if (original.title !== updated.title) {
            changes.push({ field: 'title', from: original.title, to: updated.title });
        }
        
        if (original.content !== updated.content) {
            changes.push({ field: 'content', from: original.content, to: updated.content });
        }
        
        if (original.category !== updated.category) {
            changes.push({ field: 'category', from: original.category, to: updated.category });
        }
        
        if (JSON.stringify(original.tags) !== JSON.stringify(updated.tags)) {
            changes.push({ field: 'tags', from: original.tags, to: updated.tags });
        }
        
        if (original.priority !== updated.priority) {
            changes.push({ field: 'priority', from: original.priority, to: updated.priority });
        }
        
        if (!!original.audio !== !!updated.audio) {
            changes.push({ field: 'audio', from: !!original.audio, to: !!updated.audio });
        }
        
        return changes;
    }

    async prepareExportData(options) {
        const { noteIds, includeAudio, includeCategories, includeTemplates } = options;
        
        let notes = JSON.parse(localStorage.getItem('notes') || '[]');
        
        // Filter notes if specific IDs provided
        if (noteIds && Array.isArray(noteIds)) {
            notes = notes.filter(note => noteIds.includes(note.id));
        }
        
        // Remove audio if not included
        if (!includeAudio) {
            notes = notes.map(note => ({ ...note, audio: null }));
        }
        
        const exportData = { notes };
        
        if (includeCategories) {
            exportData.categories = await this.dataManager.loadCategories();
        }
        
        if (includeTemplates) {
            exportData.templates = await this.dataManager.loadTemplates();
        }
        
        return exportData;
    }

    async validateExportSize(exportData, format) {
        const rules = this.businessRules.get('data_export');
        const dataString = JSON.stringify(exportData);
        const sizeBytes = new Blob([dataString]).size;
        
        if (sizeBytes > rules.maxExportSize) {
            return {
                isValid: false,
                reason: `Export size (${this.formatFileSize(sizeBytes)}) exceeds limit (${this.formatFileSize(rules.maxExportSize)})`
            };
        }
        
        return { isValid: true, size: sizeBytes };
    }

    generateExportFilename(format, exportData) {
        const timestamp = new Date().toISOString().split('T')[0];
        const noteCount = exportData.notes.length;
        return `notes_export_${noteCount}notes_${timestamp}.${format}`;
    }

    getExportMimeType(format) {
        const mimeTypes = {
            json: 'application/json',
            csv: 'text/csv',
            txt: 'text/plain'
        };
        return mimeTypes[format] || 'application/octet-stream';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async getTodayNoteCount() {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const today = new Date().toDateString();
        
        return notes.filter(note => {
            const noteDate = new Date(note.createdAt).toDateString();
            return noteDate === today;
        }).length;
    }

    trackTemplateUsage(templateId) {
        const usage = JSON.parse(localStorage.getItem('template_usage') || '{}');
        usage[templateId] = (usage[templateId] || 0) + 1;
        localStorage.setItem('template_usage', JSON.stringify(usage));
    }

    async trackNoteCreated(note) {
        const stats = JSON.parse(localStorage.getItem('app_stats') || '{}');
        stats.totalNotesCreated = (stats.totalNotesCreated || 0) + 1;
        stats.lastNoteCreated = note.createdAt;
        
        if (note.audio) {
            stats.notesWithAudio = (stats.notesWithAudio || 0) + 1;
        }
        
        localStorage.setItem('app_stats', JSON.stringify(stats));
    }

    async updateDashboardStats() {
        // Trigger UI update event
        window.dispatchEvent(new CustomEvent('statsUpdated', {
            detail: { source: 'business_logic' }
        }));
    }

    async checkAchievements() {
        const stats = JSON.parse(localStorage.getItem('app_stats') || '{}');
        const achievements = JSON.parse(localStorage.getItem('achievements') || '[]');
        
        // First note achievement
        if (stats.totalNotesCreated === 1 && !achievements.includes('first_note')) {
            achievements.push('first_note');
            this.toastSystem.success('🏆 Achievement unlocked: Created your first note!');
        }
        
        // 10 notes achievement
        if (stats.totalNotesCreated === 10 && !achievements.includes('ten_notes')) {
            achievements.push('ten_notes');
            this.toastSystem.success('🏆 Achievement unlocked: Created 10 notes!');
        }
        
        // First audio note achievement
        if (stats.notesWithAudio === 1 && !achievements.includes('first_audio')) {
            achievements.push('first_audio');
            this.toastSystem.success('🏆 Achievement unlocked: Added your first voice note!');
        }
        
        localStorage.setItem('achievements', JSON.stringify(achievements));
    }

    async performAutoBackup() {
        const settings = await this.dataManager.loadSettings();
        
        if (settings.features?.backup?.autoBackup) {
            try {
                const notes = JSON.parse(localStorage.getItem('notes') || '[]');
                const backupData = await this.dataManager.exportData(notes, 'json');
                
                // Store backup with timestamp
                const backupKey = `auto_backup_${Date.now()}`;
                localStorage.setItem(backupKey, backupData);
                
                // Clean old backups (keep last 5)
                this.cleanOldBackups();
                
            } catch (error) {
                console.warn('Auto-backup failed:', error);
            }
        }
    }

    cleanOldBackups() {
        const keys = Object.keys(localStorage).filter(key => key.startsWith('auto_backup_'));
        
        if (keys.length > 5) {
            keys.sort().slice(0, keys.length - 5).forEach(key => {
                localStorage.removeItem(key);
            });
        }
    }

    async handlePostUpdateActions(originalNote, updatedNote) {
        // Show update notification
        const changes = this.calculateNoteChanges(originalNote, updatedNote);
        const changeText = changes.map(c => c.field).join(', ');
        
        this.toastSystem.success(`Note updated! Changed: ${changeText}`);
        
        // Update stats
        await this.updateDashboardStats();
    }

    async handlePostDeletionActions(deletedNote) {
        // Show simple deletion notification without undo
        this.toastSystem.success(`Note "${deletedNote.title}" deleted successfully`);
        
        // Update stats
        await this.updateDashboardStats();
    }

    async validateImportFile(file) {
        const validation = { isValid: true, errors: [] };
        
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            validation.errors.push('File too large (max 10MB)');
            validation.isValid = false;
        }
        
        // Check file type
        const allowedTypes = ['application/json', 'text/plain', 'text/csv'];
        if (!allowedTypes.includes(file.type)) {
            validation.errors.push('Unsupported file type');
            validation.isValid = false;
        }
        
        return validation;
    }

    async parseImportFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    let data;
                    
                    if (file.type === 'application/json') {
                        data = JSON.parse(content);
                    } else {
                        // Handle CSV/TXT parsing
                        data = { notes: this.parseTextToNotes(content) };
                    }
                    
                    resolve({ data, format: file.type });
                } catch (error) {
                    reject(new Error(`Failed to parse file: ${error.message}`));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }

    parseTextToNotes(content) {
        // Simple text parsing - split by double newlines
        const sections = content.split('\n\n');
        const notes = [];
        
        sections.forEach((section, index) => {
            const lines = section.trim().split('\n');
            if (lines.length > 0) {
                notes.push({
                    id: this.generateNoteId(),
                    title: lines[0] || `Imported Note ${index + 1}`,
                    content: lines.slice(1).join('\n') || lines[0],
                    category: 'personal',
                    tags: ['imported'],
                    priority: 'medium',
                    isPublic: false,
                    audio: null,
                    createdAt: new Date().toISOString(),
                    lastModified: new Date().toISOString()
                });
            }
        });
        
        return notes;
    }

    async validateImportData(data) {
        const validation = { isValid: true, warnings: [] };
        
        if (!data.notes || !Array.isArray(data.notes)) {
            validation.warnings.push('No valid notes found in import data');
        }
        
        if (data.notes) {
            data.notes.forEach((note, index) => {
                if (!note.title) {
                    validation.warnings.push(`Note ${index + 1} missing title`);
                }
                if (!note.content) {
                    validation.warnings.push(`Note ${index + 1} missing content`);
                }
            });
        }
        
        return validation;
    }

    async showImportPreview(data) {
        const noteCount = data.notes ? data.notes.length : 0;
        const hasCategories = data.categories ? data.categories.length : 0;
        const hasTemplates = data.templates ? data.templates.length : 0;
        
        const message = `Import Preview:
        
📝 Notes: ${noteCount}
📁 Categories: ${hasCategories}
📋 Templates: ${hasTemplates}

This will add the imported items to your existing data.`;

        const confirmed = await this.modalSystem.confirm({
            title: 'Confirm Import',
            message,
            icon: '📥',
            confirmText: 'Import',
            cancelText: 'Cancel'
        });

        return {
            confirmed,
            options: {
                mergeCategories: true,
                mergeTemplates: true,
                skipDuplicates: true
            }
        };
    }

    async performDataImport(data, options) {
        const result = {
            imported: 0,
            skipped: 0,
            errors: []
        };

        if (data.notes && Array.isArray(data.notes)) {
            const existingNotes = JSON.parse(localStorage.getItem('notes') || '[]');
            
            for (const note of data.notes) {
                try {
                    // Assign new ID to prevent conflicts
                    const importedNote = {
                        ...note,
                        id: this.generateNoteId(),
                        createdAt: new Date().toISOString(),
                        lastModified: new Date().toISOString()
                    };
                    
                    existingNotes.push(importedNote);
                    result.imported++;
                    
                } catch (error) {
                    result.errors.push(`Failed to import note "${note.title}": ${error.message}`);
                }
            }
            
            localStorage.setItem('notes', JSON.stringify(existingNotes));
        }

        return result;
    }

    async handlePostImportActions(importResult) {
        this.toastSystem.success(`Import completed! ${importResult.imported} notes imported`, {
            duration: 5000
        });
        
        if (importResult.errors.length > 0) {
            this.toastSystem.warning(`${importResult.errors.length} items had errors`, {
                actions: [
                    {
                        label: 'View Errors',
                        onClick: `window.showImportErrors(${JSON.stringify(importResult.errors)})`
                    }
                ]
            });
        }
        
        await this.updateDashboardStats();
    }

    generateNoteId() {
        return `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    completeWorkflow(status, error = null) {
        if (this.currentWorkflow) {
            this.currentWorkflow.endTime = Date.now();
            this.currentWorkflow.duration = this.currentWorkflow.endTime - this.currentWorkflow.startTime;
            this.currentWorkflow.status = status;
            
            if (error) {
                this.currentWorkflow.error = {
                    message: error.message,
                    stack: error.stack
                };
            }
            
            this.workflowHistory.push({ ...this.currentWorkflow });
            this.currentWorkflow = null;
            
            // Keep only last 50 workflows
            if (this.workflowHistory.length > 50) {
                this.workflowHistory = this.workflowHistory.slice(-50);
            }
        }
    }

    getWorkflowHistory() {
        return this.workflowHistory;
    }

    getCurrentWorkflow() {
        return this.currentWorkflow;
    }
}

// Export for global use
window.BusinessLogicManager = BusinessLogicManager;