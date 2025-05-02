const axios = require('axios');
const { logApiRequest, logApiResponse, logApiError, debugLog } = require('../utils/debug');
const { getConfig, saveConfig } = require('../utils/config');
const IVoiceAgentProvider = require('../interfaces/IVoiceAgentProvider');

/**
 * Retell Voice Agent Provider implementation
 * @implements {IVoiceAgentProvider}
 */
class RetellAgentProvider extends IVoiceAgentProvider {
  /**
   * Create a new Retell agent provider instance
   * @param {string} apiKey - The Retell API key
   * @param {string} baseUrl - The base URL for the Retell API
   */
  constructor(apiKey, baseUrl = 'https://api.retellai.com') {
    super();
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
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
        if (process.argv.includes('--debug')) {
          console.log('\n=== Retell API Request ===');
          console.log(`${config.method.toUpperCase()} ${config.url}`);
          console.log('Headers:', JSON.stringify(config.headers, null, 2));
          console.log('Request Data:', JSON.stringify(config.data, null, 2));
          console.log('========================\n');
        }
        return config;
      },
      (error) => {
        if (process.argv.includes('--debug')) {
          console.error('\n=== Retell API Request Error ===');
          console.error(error);
          console.error('================================\n');
        }
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        if (process.argv.includes('--debug')) {
          console.log('\n=== Retell API Response ===');
          console.log(`Status: ${response.status} ${response.statusText}`);
          console.log('Headers:', JSON.stringify(response.headers, null, 2));
          console.log('Response Data:', JSON.stringify(response.data, null, 2));
          console.log('==========================\n');
        }
        return response;
      },
      (error) => {
        if (process.argv.includes('--debug')) {
          console.error('\n=== Retell API Error Response ===');
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
          console.error('================================\n');
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Update the global configuration with Retell API details
   * @private
   */
  _updateConfig() {
    const config = getConfig();
    config.retell = {
      ...config.retell,
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
      await this.client.get('/list-agents');
      return true;
    } catch (error) {
      if (error.response && error.response.status === 403) {
        throw new Error('Invalid Retell API key: Authentication failed');
      }
      if (error.response && error.response.status !== 403) {
        debugLog('Warning: Retell API returned a non-403 error, assuming API key is valid');
        return true;
      }
      this._handleError(error, 'Failed to verify Retell API key');
    }
  }

  /**
   * Get all phone numbers configured in Retell
   * @returns {Promise<Array>} Array of phone number objects
   * @throws {Error} If fetching phone numbers fails
   */
  async getPhoneNumbers() {
    try {
      const response = await this.client.get('/list-phone-numbers');
      return response.data;
    } catch (error) {
      this._handleError(error, 'Failed to retrieve Retell phone numbers');
    }
  }

  /**
   * Create a SIP trunk connection in Retell (not directly supported)
   * @param {string} name - Name for the trunk
   * @param {string} inboundSipUri - The inbound SIP URI
   * @returns {Promise<Object>} The result (note: Retell doesn't directly support SIP trunk creation)
   * @throws {Error} With information that this operation is not supported
   */
  async createSipTrunkConnection(name, inboundSipUri) {
    throw new Error('Retell does not support direct SIP trunk creation. Use importPhoneNumber instead.');
  }

  /**
   * Add a phone number to Retell
   * @param {string} name - Name for the phone number (unused in Retell)
   * @param {string} phoneNumber - The phone number in E.164 format
   * @param {string} domainName - The Cloudonix domain name to use for this number
   * @returns {Promise<Object>} The imported phone number details
   * @throws {Error} If importing the phone number fails
   */
  async addPhoneNumber(name, phoneNumber, domainName) {
    return this.importPhoneNumber(phoneNumber, domainName);
  }

  /**
   * Import a phone number to Retell
   * @param {string} phoneNumber - The phone number in E.164 format
   * @param {string} domainName - The Cloudonix domain name to use for termination
   * @returns {Promise<Object>} The imported phone number details
   * @throws {Error} If importing the phone number fails
   */
  async importPhoneNumber(phoneNumber, domainName) {
    try {
      const config = getConfig();
      const domainConfig = config.domains[domainName];

      if (!domainConfig?.inboundSipUri) {
        throw new Error(`Domain ${domainName} not found or missing inbound SIP URI`);
      }

      const response = await this.client.post('/import-phone-number', {
        phone_number: phoneNumber,
        termination_uri: domainConfig.inboundSipUri
      });

      this._updatePhoneNumberConfig(config, phoneNumber, domainName, response.data.last_modification_timestamp);

      return response.data;
    } catch (error) {
      this._handleError(error, 'Failed to import phone number to Retell');
    }
  }

  /**
   * Update the configuration with the new phone number
   * @private
   * @param {Object} config - The current configuration
   * @param {string} phoneNumber - The phone number
   * @param {string} domainName - The domain name
   * @param {string} id - The ID from Retell
   */
  _updatePhoneNumberConfig(config, phoneNumber, domainName, id) {
    if (!config.retell) {
      config.retell = { phoneNumbers: {} };
    } else if (!config.retell.phoneNumbers) {
      config.retell.phoneNumbers = {};
    }

    config.retell.phoneNumbers[phoneNumber] = { id, domainName };
    config.retell.apiKey = this.apiKey;
    config.retell.apiUrl = this.baseUrl;

    saveConfig(config);
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
      errorMessage += data?.error || data?.message 
        ? `: ${data.error || data.message}`
        : `: Status ${status}`;
    } else if (error.request) {
      errorMessage += ': No response received from server';
    } else {
      errorMessage += `: ${error.message}`;
    }

    throw new Error(errorMessage);
  }
}

module.exports = RetellAgentProvider;