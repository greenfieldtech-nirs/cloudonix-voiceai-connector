const chalk = require('chalk');

// Debug mode state
let debugMode = false;

/**
 * Set debug mode state
 * @param {boolean} enabled - Whether debug mode is enabled
 */
function setDebugMode(enabled) {
  debugMode = enabled;
  if (enabled) {
    console.log(chalk.blue('Debug mode enabled. API requests and responses will be displayed.'));
  }
}

/**
 * Check if debug mode is enabled
 * @returns {boolean} - Whether debug mode is enabled
 */
function isDebugMode() {
  return debugMode;
}

/**
 * Log debug information if debug mode is enabled
 * @param {string} message - Debug message to log
 * @param {any} data - Optional data to display
 */
function debugLog(message, data = null) {
  if (!debugMode) return;

  console.log(chalk.cyan('DEBUG:'), message);
  if (data !== null) {
    if (typeof data === 'object') {
      console.log(chalk.cyan('DATA:'), JSON.stringify(data, null, 2));
    } else {
      console.log(chalk.cyan('DATA:'), data);
    }
  }
}

/**
 * Log API request details in debug mode
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} url - Request URL
 * @param {object} data - Request payload (for POST, PUT, etc.)
 */
function logApiRequest(method, url, data = null) {
  if (!debugMode) return;

  console.log(chalk.cyan('\n▶ API REQUEST:'));
  console.log(chalk.cyan(`${method} ${url}`));

  if (data) {
    console.log(chalk.cyan('Request Payload:'));
    console.log(JSON.stringify(data, null, 2));
  }
}

/**
 * Log API response details in debug mode
 * @param {object} response - Response object
 */
function logApiResponse(response) {
  if (!debugMode) return;

  console.log(chalk.green('\n◀ API RESPONSE:'));
  console.log(chalk.green(`Status: ${response.status} ${response.statusText}`));

  console.log(chalk.green('Response Data:'));
  console.log(JSON.stringify(response.data, null, 2));
}

/**
 * Log API error details in debug mode
 * @param {Error} error - Error object
 */
function logApiError(error, fileName, lineNumber) {
  if (!debugMode) return;

  console.log(chalk.red('\n❌ API ERROR:'));

  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.log(chalk.red(`Status: ${error.response.status}`));
    console.log(chalk.red('Response Data:'));
    console.log(JSON.stringify(error.response.data, null, 2));
  } else if (error.request) {
    // The request was made but no response was received
    console.log(chalk.red('No response received from server'));
    console.log(chalk.red('Request:'), error.request);
  } else {
    // Something happened in setting up the request that triggered an Error
    console.log(chalk.red('Error Message:'), error.message);
  }

  if (fileName && lineNumber) {
    console.log(chalk.red(`Location: ${fileName}:${lineNumber}`));
  }

  if (error.stack) {
    console.log(chalk.red('\nStack Trace:'));
    console.log(error.stack);
  }
}

module.exports = {
  setDebugMode,
  isDebugMode,
  debugLog,
  logApiRequest,
  logApiResponse,
  logApiError,
};
