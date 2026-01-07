const { spawn } = require('child_process');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * Audio Service Manager Module
 * Manages the Node.js audio service process
 */

let audioServiceProcess = null;
let audioServicePid = null;
let audioServiceToken = null;
let audioServiceHost = '127.0.0.1';
let audioServicePort = 3001;

/**
 * Start the audio service
 * @param {object} config - Configuration
 * @param {string} config.host - Host address (default: 127.0.0.1)
 * @param {number} config.port - Port number (default: 3001)
 * @returns {Promise<object>} Service info
 */
async function start(config = {}) {
  try {
    if (audioServiceProcess) {
      return {
        success: true,
        pid: audioServicePid,
        host: audioServiceHost,
        port: audioServicePort,
        message: 'Audio service already running'
      };
    }

    audioServiceHost = config.host || '127.0.0.1';
    audioServicePort = config.port || 3001;
    audioServiceToken = uuidv4();

    // Path to the audio service
    const audioServicePath = path.join(__dirname, '../../harmonysync-audio-service');
    const serverScript = path.join(audioServicePath, 'server.js');

    // Spawn the audio service process
    audioServiceProcess = spawn('node', [serverScript], {
      cwd: audioServicePath,
      env: {
        ...process.env,
        HOST: audioServiceHost,
        PORT: audioServicePort.toString(),
        SHUTDOWN_TOKEN: audioServiceToken,
        NODE_ENV: 'production'
      },
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    audioServicePid = audioServiceProcess.pid;

    // Log output
    audioServiceProcess.stdout.on('data', (data) => {
      console.log(`[Audio Service] ${data.toString()}`);
    });

    audioServiceProcess.stderr.on('data', (data) => {
      console.error(`[Audio Service Error] ${data.toString()}`);
    });

    audioServiceProcess.on('close', (code) => {
      console.log(`Audio service exited with code ${code}`);
      audioServiceProcess = null;
      audioServicePid = null;
    });

    // Wait for service to be ready
    await waitForService();

    return {
      success: true,
      pid: audioServicePid,
      host: audioServiceHost,
      port: audioServicePort,
      message: 'Audio service started successfully'
    };
  } catch (error) {
    console.error('Error starting audio service:', error);
    throw error;
  }
}

/**
 * Wait for the audio service to be ready
 * @param {number} maxAttempts - Maximum number of attempts
 * @returns {Promise<void>}
 */
async function waitForService(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await axios.get(`http://${audioServiceHost}:${audioServicePort}/health`, {
        timeout: 1000
      });
      if (response.data.status === 'ok') {
        console.log('Audio service is ready');
        return;
      }
    } catch (error) {
      // Service not ready yet, wait and retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Audio service failed to start within timeout period');
}

/**
 * Check audio service status
 * @returns {Promise<object>} Status info
 */
async function checkStatus() {
  try {
    if (!audioServiceProcess || !audioServicePid) {
      return {
        running: false,
        message: 'Audio service is not running'
      };
    }

    // Try to ping the service
    const response = await axios.get(`http://${audioServiceHost}:${audioServicePort}/health`, {
      timeout: 2000
    });

    return {
      running: true,
      pid: audioServicePid,
      host: audioServiceHost,
      port: audioServicePort,
      status: response.data
    };
  } catch (error) {
    return {
      running: false,
      message: 'Audio service is not responding'
    };
  }
}

/**
 * Stop the audio service
 * @returns {Promise<object>} Stop status
 */
async function stop() {
  try {
    if (!audioServiceProcess) {
      return {
        success: true,
        message: 'Audio service was not running'
      };
    }

    // Try graceful shutdown via HTTP
    if (audioServiceToken) {
      try {
        await axios.post(`http://${audioServiceHost}:${audioServicePort}/shutdown`, {
          token: audioServiceToken
        }, {
          timeout: 5000
        });
        
        // Wait for process to exit
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            if (audioServiceProcess) {
              audioServiceProcess.kill('SIGTERM');
            }
            resolve();
          }, 5000);

          if (audioServiceProcess) {
            audioServiceProcess.on('close', () => {
              clearTimeout(timeout);
              resolve();
            });
          }
        });
      } catch (error) {
        console.warn('Graceful shutdown failed, forcing termination');
        if (audioServiceProcess) {
          audioServiceProcess.kill('SIGTERM');
        }
      }
    } else if (audioServiceProcess) {
      audioServiceProcess.kill('SIGTERM');
    }

    audioServiceProcess = null;
    audioServicePid = null;
    audioServiceToken = null;

    return {
      success: true,
      message: 'Audio service stopped successfully'
    };
  } catch (error) {
    console.error('Error stopping audio service:', error);
    throw error;
  }
}

module.exports = {
  start,
  checkStatus,
  stop
};
