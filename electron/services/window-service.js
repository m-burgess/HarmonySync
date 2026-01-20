/**
 * Window Service
 * Handles window lifecycle management (show, hide, focus, creation)
 */

/**
 * Show audience window
 * @param {Function} getAudienceWindow - Function to get audience window
 * @returns {Promise<void>}
 */
async function showAudienceWindow(getAudienceWindow) {
  const win = getAudienceWindow();
  if (win) {
    win.show();
  }
}

/**
 * Hide audience window
 * @param {Function} getAudienceWindow - Function to get audience window
 * @returns {Promise<void>}
 */
async function hideAudienceWindow(getAudienceWindow) {
  const win = getAudienceWindow();
  if (win) {
    win.hide();
  }
}

/**
 * Show confidence window
 * @param {Function} getConfidenceWindow - Function to get confidence window
 * @returns {Promise<void>}
 */
async function showConfidenceWindow(getConfidenceWindow) {
  const win = getConfidenceWindow();
  if (win) {
    win.show();
  }
}

/**
 * Hide confidence window
 * @param {Function} getConfidenceWindow - Function to get confidence window
 * @returns {Promise<void>}
 */
async function hideConfidenceWindow(getConfidenceWindow) {
  const win = getConfidenceWindow();
  if (win) {
    win.hide();
  }
}

/**
 * Show lower thirds window
 * @param {Function} getLowerThirdsWindow - Function to get lower thirds window
 * @returns {Promise<void>}
 */
async function showLowerThirdsWindow(getLowerThirdsWindow) {
  const win = getLowerThirdsWindow();
  if (win) {
    win.show();
  }
}

/**
 * Hide lower thirds window
 * @param {Function} getLowerThirdsWindow - Function to get lower thirds window
 * @returns {Promise<void>}
 */
async function hideLowerThirdsWindow(getLowerThirdsWindow) {
  const win = getLowerThirdsWindow();
  if (win) {
    win.hide();
  }
}

/**
 * Toggle window visibility
 * @param {Function} getWindow - Function to get window
 * @returns {Promise<boolean>} New visibility state
 */
async function toggleWindow(getWindow) {
  const win = getWindow();
  if (win) {
    if (win.isVisible()) {
      win.hide();
      return false;
    } else {
      win.show();
      return true;
    }
  }
  return false;
}

/**
 * Focus window
 * @param {Function} getWindow - Function to get window
 * @returns {Promise<void>}
 */
async function focusWindow(getWindow) {
  const win = getWindow();
  if (win) {
    win.focus();
  }
}

/**
 * Minimize window
 * @param {Function} getWindow - Function to get window
 * @returns {Promise<void>}
 */
async function minimizeWindow(getWindow) {
  const win = getWindow();
  if (win) {
    win.minimize();
  }
}

/**
 * Maximize window
 * @param {Function} getWindow - Function to get window
 * @returns {Promise<void>}
 */
async function maximizeWindow(getWindow) {
  const win = getWindow();
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
}

/**
 * Set window always on top
 * @param {Function} getWindow - Function to get window
 * @param {boolean} alwaysOnTop - Whether window should stay on top
 * @returns {Promise<void>}
 */
async function setAlwaysOnTop(getWindow, alwaysOnTop) {
  const win = getWindow();
  if (win) {
    win.setAlwaysOnTop(alwaysOnTop);
  }
}

/**
 * Get window visibility status
 * @param {Function} getWindow - Function to get window
 * @returns {Promise<boolean>} Whether window is visible
 */
async function isWindowVisible(getWindow) {
  const win = getWindow();
  return win ? win.isVisible() : false;
}

/**
 * Get all windows status
 * @param {Function} getAudienceWindow - Function to get audience window
 * @param {Function} getConfidenceWindow - Function to get confidence window
 * @param {Function} getLowerThirdsWindow - Function to get lower thirds window
 * @returns {Promise<Object>} Status of all windows
 */
async function getAllWindowsStatus(getAudienceWindow, getConfidenceWindow, getLowerThirdsWindow) {
  return {
    audience: {
      visible: await isWindowVisible(getAudienceWindow),
      exists: getAudienceWindow() !== null
    },
    confidence: {
      visible: await isWindowVisible(getConfidenceWindow),
      exists: getConfidenceWindow() !== null
    },
    lowerThirds: {
      visible: await isWindowVisible(getLowerThirdsWindow),
      exists: getLowerThirdsWindow() !== null
    }
  };
}

/**
 * Hide all windows
 * @param {Function} getAudienceWindow - Function to get audience window
 * @param {Function} getConfidenceWindow - Function to get confidence window
 * @param {Function} getLowerThirdsWindow - Function to get lower thirds window
 * @returns {Promise<void>}
 */
async function hideAllWindows(getAudienceWindow, getConfidenceWindow, getLowerThirdsWindow) {
  await hideAudienceWindow(getAudienceWindow);
  await hideConfidenceWindow(getConfidenceWindow);
  await hideLowerThirdsWindow(getLowerThirdsWindow);
}

/**
 * Show all windows
 * @param {Function} getAudienceWindow - Function to get audience window
 * @param {Function} getConfidenceWindow - Function to get confidence window
 * @param {Function} getLowerThirdsWindow - Function to get lower thirds window
 * @returns {Promise<void>}
 */
async function showAllWindows(getAudienceWindow, getConfidenceWindow, getLowerThirdsWindow) {
  await showAudienceWindow(getAudienceWindow);
  await showConfidenceWindow(getConfidenceWindow);
  await showLowerThirdsWindow(getLowerThirdsWindow);
}

module.exports = {
  showAudienceWindow,
  hideAudienceWindow,
  showConfidenceWindow,
  hideConfidenceWindow,
  showLowerThirdsWindow,
  hideLowerThirdsWindow,
  toggleWindow,
  focusWindow,
  minimizeWindow,
  maximizeWindow,
  setAlwaysOnTop,
  isWindowVisible,
  getAllWindowsStatus,
  hideAllWindows,
  showAllWindows
};
