const axios = require('axios');
const { logApiRequest, logApiResponse, logApiError, debugLog } = require('../utils/debug');
const { getConfig, saveConfig } = require('../utils/config');
const IVoiceAgentProvider = require('../interfaces/IVoiceAgentProvider');

/**
 * 11Labs Voice Agent Provider implementation
 * @implements {IVoiceAgentProvider}
 */
class ElevenLabsAgentProvider extends IVoiceAgentProvider {
  /**
   * Create a new 11Labs agent provider instance
   * @param {string} apiKey - The 11Labs API key
   * @param {string} baseUrl - The base URL for the 11Labs API
   */
  constructor(apiKey, baseUrl = 'https://api.elevenlabs.io') {
    super();
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });

    this._setupInterceptors();
    this._updateConfig();
  }

  /**
   * Set up request and response interceptors for logging
   * @private
   */
  _setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
        logApiRequest(config.method.toUpperCase(), `${config.baseURL}${config.url}`, config.data);
        if (process.argv.includes('--debug')) {
          console.log('\n=== 11Labs API Request ===');
          console.log(`${config.method.toUpperCase()} ${config.url}`);
          console.log('Headers:', JSON.stringify({...config.headers, 'xi-api-key': '********'}, null, 2));
          console.log('Request Data:', JSON.stringify(config.data, null, 2));
          console.log('=========================\n');
        }
        return config;
      },
      (error) => {
        logApiError(error, '11LabsAgentProvider.js', this._getLineNumber());
        if (process.argv.includes('--debug')) {
          console.error('\n=== 11Labs API Request Error ===');
          console.error(error);
          console.error('================================\n');
        }
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logApiResponse(response);
        if (process.argv.includes('--debug')) {
          console.log('\n=== 11Labs API Response ===');
          console.log(`Status: ${response.status} ${response.statusText}`);
          console.log('Headers:', JSON.stringify(response.headers, null, 2));
          console.log('Response Data:', JSON.stringify(response.data, null, 2));
          console.log('===========================\n');
        }
        return response;
      },
      (error) => {
        logApiError(error, '11LabsAgentProvider.js', this._getLineNumber());
        if (process.argv.includes('--debug')) {
          console.error('\n=== 11Labs API Error Response ===');
          if (error.response) {
            console.error(`Status: ${error.response.status} ${error.response.statusText}`);
            console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
            console.error('Error Data:', JSON.stringify(error.response.data, null, 2));
          } else if (error.request) {
            console.error('No response received');
            console.error('Request:', error.request);
          } else {
            console.error('Error:', error.message);
          }
          console.error('=================================\n');
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Update the global configuration with 11Labs API details
   * @private
   */
  _updateConfig() {
    const config = getConfig();
    config.elevenlabs = {
      ...config.elevenlabs,
      apiKey: this.apiKey,
      apiUrl: this.baseUrl
    };
    saveConfig(config);
  }

  /**
   * Get the current line number for better error reporting
   * @private
   */
  _getLineNumber() {
    return new Error().stack.split('\n')[2].match(/:(\d+):/)[1];
  }

  /**
   * Verify that the API key is valid
   * @returns {Promise<boolean>} True if the API key is valid
   * @throws {Error} If the API key is invalid or verification fails
   */
  async verifyApiKey() {
    try {
      // TODO: Implement API key verification for 11Labs API
      return true;
    } catch (error) {
      this._handleError(error, 'Failed to verify 11Labs API key');
    }
  }

  /**
   * Get all phone numbers configured in 11Labs
   * @returns {Promise<Array>} Array of phone number objects
   * @throws {Error} If fetching phone numbers fails
   */
  async getPhoneNumbers() {
    try {
      // TODO: Implement phone number listing for 11Labs API
      return [];
    } catch (error) {
      this._handleError(error, 'Failed to retrieve 11Labs phone numbers');
    }
  }

  /**
   * Get detailed information for a specific phone number
   * @param {string} id - The ID of the phone number
   * @returns {Promise<Object>} Detailed phone number information
   * @throws {Error} If fetching phone number details fails
   */
  async getPhoneNumberDetails(id) {
    try {
      // TODO: Implement phone number details retrieval for 11Labs API
      return { id };
    } catch (error) {
      this._handleError(error, `Failed to retrieve 11Labs phone number details for ID: ${id}`);
    }
  }

  /**
   * Create a SIP trunk connection in 11Labs
   * @param {string} name - Name for the SIP trunk
   * @param {string} inboundSipUri - The SIP URI for inbound calls
   * @returns {Promise<Object>} The created SIP trunk connection
   * @throws {Error} If creating the SIP trunk fails
   */
  async createSipTrunkConnection(name, inboundSipUri) {
    try {
      // TODO: Implement SIP trunk creation for 11Labs API
      return { name, inboundSipUri };
    } catch (error) {
      this._handleError(error, 'Failed to create 11Labs SIP trunk connection');
    }
  }

  /**
   * Add a phone number to 11Labs
   * @param {string} name - Name for the phone number
   * @param {string} phoneNumber - The phone number in E.164 format
   * @param {string} credentialId - The credential ID to use for this number
   * @returns {Promise<Object>} The added phone number details
   * @throws {Error} If adding the phone number fails
   */
  async addPhoneNumber(name, phoneNumber, credentialId) {
    try {
      // TODO: Implement phone number addition for 11Labs API
      return { name, phoneNumber, credentialId };
    } catch (error) {
      this._handleError(error, 'Failed to add phone number to 11Labs');
    }
  }

  /**
   * Handle API errors in a consistent manner
   * @private
   * @param {Error} error - The error object from the API request
   * @param {string} message - The base error message
   * @throws {Error} A formatted error with details
   */
  _handleError(error, message) {
    let errorMessage = message;

    if (error.response) {
      const { status, data } = error.response;
      errorMessage += data?.error || data?.detail || data?.message
        ? `: ${data.error || data.detail || data.message}`
        : `: Status ${status}`;
    } else if (error.request) {
      errorMessage += ': No response received from server';
    } else {
      errorMessage += `: ${error.message}`;
    }

    throw new Error(errorMessage);
  }
}

module.exports = ElevenLabsAgentProvider;