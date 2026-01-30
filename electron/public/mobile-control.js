/**
 * HarmonySync Remote Control - Mobile Interface JavaScript with JSDoc Type Annotations
 */

// API base URL - will use current host
const API_BASE = window.location.origin;

// Current state interface
/**
 * @typedef {Object} AppState
 * @property {string|null} currentFolder
 * @property {number} currentSlideIndex
 * @property {number} totalSlides
 * @property {'stopped'|'playing'|'paused'} playbackStatus
 * @property {any[]} loadedTracks
 */

// Current state
/** @type {AppState} */
let currentState = {
  currentFolder: null,
  currentSlideIndex: 0,
  totalSlides: 0,
  playbackStatus: 'stopped',
  loadedTracks: []
};

// Auto-refresh interval
/** @type {number|null} */
let refreshInterval = null;

// API response interfaces
/**
 * @template T
 * @typedef {Object} ApiResponse
 * @property {boolean} success
 * @property {T} [data]
 * @property {string} [message]
 * @property {string} [error]
 */

/**
 * @typedef {Object} FolderInfo
 * @property {string} path
 * @property {string} name
 * @property {boolean} hasAudio
 */

/**
 * Initialize the app when page loads
 */
window.addEventListener('DOMContentLoaded', () => {
  console.log('[RemoteControl] Mobile interface loaded');

  // Load initial data
  loadFolders();
  updateStatus();

  // Setup folder select change handler
  const folderSelect = /** @type {HTMLSelectElement} */ (document.getElementById('folderSelect'));
  folderSelect.addEventListener('change', (e) => {
    const target = /** @type {HTMLSelectElement} */ (e.target);
    const loadBtn = /** @type {HTMLButtonElement} */ (document.getElementById('loadFolderBtn'));
    loadBtn.disabled = !target.value;
  });

  // Start auto-refresh
  refreshInterval = window.setInterval(updateStatus, 2000);

  // Update connection status
  updateConnectionStatus(true);
});

/**
 * Update connection status indicator
 * @param {boolean} connected
 */
function updateConnectionStatus(connected) {
  const indicator = /** @type {HTMLElement} */ (document.getElementById('statusIndicator'));
  const statusText = /** @type {HTMLElement} */ (document.getElementById('statusText'));

  if (connected) {
    indicator.className = 'status-indicator connected';
    statusText.textContent = 'Connected';
  } else {
    indicator.className = 'status-indicator disconnected';
    statusText.textContent = 'Disconnected';
  }
}

/**
 * Show a temporary message
 * @param {string} message
 * @param {'info'|'success'|'warning'|'error'} [type='info']
 */
function showMessage(message, type = 'info') {
  const container = /** @type {HTMLElement} */ (document.getElementById('messageContainer'));
  const messageEl = document.createElement('div');
  messageEl.className = `message message-${type}`;
  messageEl.textContent = message;

  container.appendChild(messageEl);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    messageEl.classList.add('fade-out');
    setTimeout(() => container.removeChild(messageEl), 300);
  }, 3000);
}

/**
 * Make API request
 * @template T
 * @param {string} endpoint
 * @param {'GET'|'POST'} [method='GET']
 * @param {any} [body=null]
 * @returns {Promise<T>}
 */
async function apiRequest(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}/api${endpoint}`, options);
    const data = await response.json();

    updateConnectionStatus(true);
    return data;
  } catch (error) {
    console.error('[RemoteControl] API request failed:', error);
    updateConnectionStatus(false);
    throw error;
  }
}

/**
 * Update current status from server
 */
async function updateStatus() {
  try {
    const result = await apiRequest('/status');

    if (result.success) {
      currentState = result.data;
      updateUI();
    }
  } catch (error) {
    console.error('[RemoteControl] Failed to update status:', error);
  }
}

/**
 * Update UI with current state
 */
function updateUI() {
  // Update status display
  // Handle both forward and backward slashes for cross-platform path support
  const folderName = currentState.currentFolder
    ? currentState.currentFolder.split(/[/\\]/).pop()
    : 'None';
  const currentFolderEl = /** @type {HTMLElement} */ (document.getElementById('currentFolder'));
  currentFolderEl.textContent = folderName;

  const currentSlideEl = /** @type {HTMLElement} */ (document.getElementById('currentSlide'));
  currentSlideEl.textContent =
    `${currentState.currentSlideIndex + 1} / ${currentState.totalSlides}`;

  const playbackStatusEl = /** @type {HTMLElement} */ (document.getElementById('playbackStatus'));
  playbackStatusEl.textContent =
    currentState.playbackStatus.charAt(0).toUpperCase() + currentState.playbackStatus.slice(1);

  const trackCountEl = /** @type {HTMLElement} */ (document.getElementById('trackCount'));
  trackCountEl.textContent =
    currentState.loadedTracks.length.toString();

  // Enable/disable controls based on state
  const hasFolder = currentState.currentFolder !== null;
  const hasTracks = currentState.loadedTracks.length > 0;
  const isPlaying = currentState.playbackStatus === 'playing';
  const isPaused = currentState.playbackStatus === 'paused';

  // Slide navigation
  const prevBtn = /** @type {HTMLButtonElement} */ (document.getElementById('prevBtn'));
  prevBtn.disabled = !hasFolder || currentState.currentSlideIndex === 0;

  const nextBtn = /** @type {HTMLButtonElement} */ (document.getElementById('nextBtn'));
  nextBtn.disabled = !hasFolder || currentState.currentSlideIndex >= currentState.totalSlides - 1;

  // Playback controls
  const playBtn = /** @type {HTMLButtonElement} */ (document.getElementById('playBtn'));
  playBtn.disabled = !hasTracks || isPlaying;

  const pauseBtn = /** @type {HTMLButtonElement} */ (document.getElementById('pauseBtn'));
  pauseBtn.disabled = !isPlaying;

  const stopBtn = /** @type {HTMLButtonElement} */ (document.getElementById('stopBtn'));
  stopBtn.disabled = currentState.playbackStatus === 'stopped';

  // Update playback button text based on state
  if (isPaused) {
    playBtn.textContent = '▶ Resume';
  } else {
    playBtn.textContent = '▶ Play';
  }
}

/**
 * Load available folders
 */
async function loadFolders() {
  try {
    const result = await apiRequest('/folders');

    if (result.success) {
      const select = /** @type {HTMLSelectElement} */ (document.getElementById('folderSelect'));

      // Clear existing options except first
      select.innerHTML = '<option value="">-- Select a folder --</option>';

      // Add folder options
      result.data.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.path;
        option.textContent = `${folder.name}${folder.hasAudio ? ' 🎵' : ''}`;
        select.appendChild(option);
      });

      showMessage(`Loaded ${result.data.length} folders`, 'success');
    } else {
      showMessage(result.message || 'No folders found', 'warning');
    }
  } catch (error) {
    showMessage('Failed to load folders', 'error');
  }
}

/**
 * Load selected folder
 */
async function loadSelectedFolder() {
  const select = /** @type {HTMLSelectElement} */ (document.getElementById('folderSelect'));
  const folderPath = select.value;

  if (!folderPath) {
    showMessage('Please select a folder', 'warning');
    return;
  }

  try {
    const result = await apiRequest('/folder/select', 'POST', { folderPath });

    if (result.success) {
      showMessage('Folder loaded successfully', 'success');
      await updateStatus();
    } else {
      showMessage(result.error || 'Failed to load folder', 'error');
    }
  } catch (error) {
    showMessage('Failed to load folder', 'error');
  }
}

/**
 * Go to next slide
 */
async function nextSlide() {
  try {
    const result = await apiRequest('/slide/next', 'POST');

    if (result.success) {
      await updateStatus();
    } else {
      showMessage(result.message || 'Cannot advance slide', 'warning');
    }
  } catch (error) {
    showMessage('Failed to advance slide', 'error');
  }
}

/**
 * Go to previous slide
 */
async function previousSlide() {
  try {
    const result = await apiRequest('/slide/previous', 'POST');

    if (result.success) {
      await updateStatus();
    } else {
      showMessage(result.message || 'Cannot go back', 'warning');
    }
  } catch (error) {
    showMessage('Failed to go to previous slide', 'error');
  }
}

/**
 * Start/resume audio playback
 */
async function playAudio() {
  try {
    const result = await apiRequest('/playback/play', 'POST');

    if (result.success) {
      showMessage('Playback started', 'success');
      await updateStatus();
    } else {
      showMessage(result.error || 'Failed to start playback', 'error');
    }
  } catch (error) {
    showMessage('Failed to start playback', 'error');
  }
}

/**
 * Pause audio playback
 */
async function pauseAudio() {
  try {
    const result = await apiRequest('/playback/pause', 'POST');

    if (result.success) {
      showMessage('Playback paused', 'info');
      await updateStatus();
    } else {
      showMessage(result.error || 'Failed to pause playback', 'error');
    }
  } catch (error) {
    showMessage('Failed to pause playback', 'error');
  }
}

/**
 * Stop audio playback
 */
async function stopAudio() {
  try {
    const result = await apiRequest('/playback/stop', 'POST');

    if (result.success) {
      showMessage('Playback stopped', 'info');
      await updateStatus();
    } else {
      showMessage(result.error || 'Failed to stop playback', 'error');
    }
  } catch (error) {
    showMessage('Failed to stop playback', 'error');
  }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});

// Export functions for potential use in other scripts
window.loadSelectedFolder = loadSelectedFolder;
window.nextSlide = nextSlide;
window.previousSlide = previousSlide;
window.playAudio = playAudio;
window.pauseAudio = pauseAudio;
window.stopAudio = stopAudio;