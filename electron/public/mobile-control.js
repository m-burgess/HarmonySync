/**
 * HarmonySync Remote Control - Mobile Interface JavaScript
 */

// API base URL - will use current host
const API_BASE = window.location.origin;

// Current state
let currentState = {
  currentFolder: null,
  currentSlideIndex: 0,
  totalSlides: 0,
  playbackStatus: 'stopped',
  loadedTracks: []
};

// Auto-refresh interval
let refreshInterval = null;

/**
 * Initialize the app when page loads
 */
window.addEventListener('DOMContentLoaded', () => {
  console.log('[RemoteControl] Mobile interface loaded');
  
  // Load initial data
  loadFolders();
  updateStatus();
  
  // Setup folder select change handler
  document.getElementById('folderSelect').addEventListener('change', (e) => {
    const loadBtn = document.getElementById('loadFolderBtn');
    loadBtn.disabled = !e.target.value;
  });
  
  // Start auto-refresh
  refreshInterval = setInterval(updateStatus, 2000);
  
  // Update connection status
  updateConnectionStatus(true);
});

/**
 * Update connection status indicator
 */
function updateConnectionStatus(connected) {
  const indicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  
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
 */
function showMessage(message, type = 'info') {
  const container = document.getElementById('messageContainer');
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
  document.getElementById('currentFolder').textContent = folderName;
  
  document.getElementById('currentSlide').textContent = 
    `${currentState.currentSlideIndex + 1} / ${currentState.totalSlides}`;
  
  document.getElementById('playbackStatus').textContent = 
    currentState.playbackStatus.charAt(0).toUpperCase() + currentState.playbackStatus.slice(1);
  
  document.getElementById('trackCount').textContent = 
    currentState.loadedTracks.length;
  
  // Enable/disable controls based on state
  const hasFolder = currentState.currentFolder !== null;
  const hasTracks = currentState.loadedTracks.length > 0;
  const isPlaying = currentState.playbackStatus === 'playing';
  const isPaused = currentState.playbackStatus === 'paused';
  
  // Slide navigation
  document.getElementById('prevBtn').disabled = !hasFolder || currentState.currentSlideIndex === 0;
  document.getElementById('nextBtn').disabled = !hasFolder || currentState.currentSlideIndex >= currentState.totalSlides - 1;
  
  // Playback controls
  document.getElementById('playBtn').disabled = !hasTracks || isPlaying;
  document.getElementById('pauseBtn').disabled = !isPlaying;
  document.getElementById('stopBtn').disabled = currentState.playbackStatus === 'stopped';
  
  // Update playback button text based on state
  const playBtn = document.getElementById('playBtn');
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
      const select = document.getElementById('folderSelect');
      
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
  const select = document.getElementById('folderSelect');
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
