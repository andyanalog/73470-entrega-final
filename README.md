# Notes App

Notes application with voice recording capabilities, built with JavaScript.

## Features

- **Text Notes** - Create and organize your thoughts
- **Voice Recording** - Add audio recordings to your notes
- **Templates** - Quick start with pre-built note templates
- **Export** - Backup your notes in JSON, CSV, or TXT format (Ctrl+E)
- **Dark Mode** - Toggle between light and dark themes

## Getting Started

1. **Clone or download** this repository
2. **Open `index.html`** in your web browser
3. **Start creating notes!**

## How to Use

### Creating Notes
1. Click "New Note" in the sidebar
2. Enter your title and content
3. Optionally record a voice memo using the microphone button
4. Click "Save Note"

### Voice Recording
- Click the **Record** button to start recording
- Click **Stop** when finished
- Use **Play** to preview your recording
- Click **Delete** to remove the audio

### Managing Notes
- **View All Notes** - See all your notes in a list
- **Edit** - Click the edit button on any note
- **Delete** - Remove notes you no longer need

### Export
- Press **Ctrl+E** (or **Cmd+E** on Mac) to export your notes
- Choose from JSON (complete), CSV (spreadsheet), or TXT (simple) formats
- Files will be downloaded to your default download folder

## Browser Requirements

- **Modern browser** with JavaScript enabled
- **Microphone access** for voice recording features
- **Local storage** support for saving notes

## File Structure

```
notes-app/
├── index.html              # Main HTML file
├── styles.css              # All styling
└── js/
    ├── main.js             # Core application logic
    ├── audioManager.js     # Voice recording functionality
    ├── voiceNoteUI.js      # Voice recording interface
    ├── dataManager.js      # Data loading and management
    ├── modalSystem.js      # Modal dialogs and notifications
    ├── errorHandler.js     # Error handling system
    ├── businessLogic.js    # Business logic and workflows
    ├── settings.json       # App configuration
    ├── templates.json      # Note templates
    ├── categories.json     # Category definitions
    └── notes.json          # Sample notes data

```

## Data Storage

- Notes are stored in your browser's **local storage**
- **Export your notes regularly** for backup
- Clearing browser data will remove your notes

## Technologies Used

- **Vanilla JavaScript** - No frameworks required
- **RecordRTC** - Audio recording library
- **Local Storage API** - Data persistence
- **Web Audio API** - Audio playback

## Troubleshooting

**Voice recording not working?**
- Check microphone permissions in your browser
- Ensure you're using HTTPS or localhost
- Try refreshing the page

**Notes disappeared?**
- Check if you cleared browser data
- Restore from a previous export
- Notes are stored per-browser and per-domain

