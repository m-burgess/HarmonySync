/**
 * Display Service
 * Handles coordination of content display across multiple windows
 * (audience, confidence, lower thirds)
 */

/**
 * Display video slide on audience and confidence windows
 * @param {Function} getAudienceWindow - Function to get audience window
 * @param {Function} getConfidenceWindow - Function to get confidence window
 * @param {string} path - Path to video file
 * @param {number} duration - Video duration in seconds
 * @returns {Promise<void>}
 */
async function displayVideoSlide(getAudienceWindow, getConfidenceWindow, path, duration) {
  const audWin = getAudienceWindow();
  const confWin = getConfidenceWindow();
  
  if (audWin) {
    audWin.webContents.send('display-video-slide', path);
  }
  
  if (confWin) {
    confWin.webContents.send('start-video-countdown', duration);
  }
}

/**
 * Display slide content on all windows
 * @param {Function} getAudienceWindow - Function to get audience window
 * @param {Function} getConfidenceWindow - Function to get confidence window
 * @param {Function} getLowerThirdsWindow - Function to get lower thirds window
 * @param {Object} content - Slide content object
 * @returns {Promise<void>}
 */
async function displaySlide(getAudienceWindow, getConfidenceWindow, getLowerThirdsWindow, content) {
  const audWin = getAudienceWindow();
  const confWin = getConfidenceWindow();
  const lowerWin = getLowerThirdsWindow();
  
  if (audWin) {
    audWin.webContents.send('display-slide', content);
  }
  
  if (confWin) {
    confWin.webContents.send('display-slide', content);
  }
  
  if (lowerWin && content.lowerThirds) {
    lowerWin.webContents.send('update-lower-thirds', content.lowerThirds);
  }
}

/**
 * Display black screen on audience window
 * @param {Function} getAudienceWindow - Function to get audience window
 * @returns {Promise<void>}
 */
async function displayBlackScreen(getAudienceWindow) {
  const audWin = getAudienceWindow();
  
  if (audWin) {
    audWin.webContents.send('display-black-screen');
  }
}

/**
 * Clear all displays
 * @param {Function} getAudienceWindow - Function to get audience window
 * @param {Function} getConfidenceWindow - Function to get confidence window
 * @param {Function} getLowerThirdsWindow - Function to get lower thirds window
 * @returns {Promise<void>}
 */
async function clearAllDisplays(getAudienceWindow, getConfidenceWindow, getLowerThirdsWindow) {
  const audWin = getAudienceWindow();
  const confWin = getConfidenceWindow();
  const lowerWin = getLowerThirdsWindow();
  
  if (audWin) {
    audWin.webContents.send('clear-display');
  }
  
  if (confWin) {
    confWin.webContents.send('clear-display');
  }
  
  if (lowerWin) {
    lowerWin.webContents.send('clear-display');
  }
}

/**
 * Update lower thirds text
 * @param {Function} getLowerThirdsWindow - Function to get lower thirds window
 * @param {Object} textData - Text data object with line1 and line2
 * @returns {Promise<void>}
 */
async function updateLowerThirds(getLowerThirdsWindow, textData) {
  const lowerWin = getLowerThirdsWindow();
  
  if (lowerWin) {
    lowerWin.webContents.send('update-lower-thirds', textData);
  }
}

/**
 * Send custom message to specific display
 * @param {Function} getWindow - Function to get target window
 * @param {string} channel - IPC channel name
 * @param {*} data - Data to send
 * @returns {Promise<void>}
 */
async function sendToDisplay(getWindow, channel, data) {
  const win = getWindow();
  
  if (win) {
    win.webContents.send(channel, data);
  }
}

/**
 * Broadcast message to all displays
 * @param {Function} getAudienceWindow - Function to get audience window
 * @param {Function} getConfidenceWindow - Function to get confidence window
 * @param {Function} getLowerThirdsWindow - Function to get lower thirds window
 * @param {string} channel - IPC channel name
 * @param {*} data - Data to send
 * @returns {Promise<void>}
 */
async function broadcastToAllDisplays(getAudienceWindow, getConfidenceWindow, getLowerThirdsWindow, channel, data) {
  const audWin = getAudienceWindow();
  const confWin = getConfidenceWindow();
  const lowerWin = getLowerThirdsWindow();
  
  if (audWin) {
    audWin.webContents.send(channel, data);
  }
  
  if (confWin) {
    confWin.webContents.send(channel, data);
  }
  
  if (lowerWin) {
    lowerWin.webContents.send(channel, data);
  }
}

module.exports = {
  displayVideoSlide,
  displaySlide,
  displayBlackScreen,
  clearAllDisplays,
  updateLowerThirds,
  sendToDisplay,
  broadcastToAllDisplays
};
