const axios = require('axios');
const { logApiRequest, logApiResponse, logApiError, debugLog } = require('../utils/debug');
const IVoiceAgentProvider = require('../interfaces/IVoiceAgentProvider');

/**
 * VAPI Voice Agent Provider implementation
 * @implements {IVoiceAgentProvider}
 */
class VapiAgentProvider extends IVoiceAgentProvider {
  /**
   * Create a new VAPI agent provider instance
   * @param {string} apiKey - The VAPI API key
   * @param {string} baseUrl - The base URL for the VAPI API
   */
  constructor(apiKey, baseUrl = 'https://api.vapi.ai') {
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
          console.log('\n=== VAPI API Request ===');
          console.log(`${config.method.toUpperCase()} ${config.url}`);
          console.log('Headers:', JSON.stringify(config.headers, null, 2));
          console.log('Request Data:', JSON.stringify(config.data, null, 2));
          console.log('========================\n');
        }
        return config;
      },
      (error) => {
        logApiError(error, 'VapiAgentProvider.js', this._getLineNumber());
        if (process.argv.includes('--debug')) {
          console.error('\n=== VAPI API Request Error ===');
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
          console.log('\n=== VAPI API Response ===');
          console.log(`Status: ${response.status} ${response.statusText}`);
          console.log('Headers:', JSON.stringify(response.headers, null, 2));
          console.log('Response Data:', JSON.stringify(response.data, null, 2));
          console.log('==========================\n');
        }
        return response;
      },
      (error) => {
        logApiError(error, 'VapiAgentProvider.js', this._getLineNumber());
        if (process.argv.includes('--debug')) {
          console.error('\n=== VAPI API Error Response ===');
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
      await this.client.get('/assistant');
      return true;
    } catch (error) {
      if (error.response?.status === 403) {
        throw new Error('Invalid VAPI API key: Authentication failed');
      }
      if (error.response?.status !== 403) {
        debugLog('Warning: VAPI API returned a non-403 error, assuming API key is valid');
        return true;
      }
      this._handleError(error, 'Failed to verify VAPI API key');
    }
  }

  /**
   * Get all phone numbers configured in VAPI
   * @returns {Promise<Array>} Array of phone number objects
   * @throws {Error} If fetching phone numbers fails
   */
  async getPhoneNumbers() {
    try {
      const response = await this.client.get('/phone-number');
      return response.data;
    } catch (error) {
      this._handleError(error, 'Failed to retrieve VAPI phone numbers');
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
      const response = await this.client.get(`/phone-number/${id}`);
      return response.data;
    } catch (error) {
      this._handleError(error, `Failed to retrieve VAPI phone number details for ID: ${id}`);
    }
  }

  /**
   * Get detailed information for a credential
   * @param {string} id - The ID of the credential
   * @returns {Promise<Object>} Detailed credential information
   * @throws {Error} If fetching credential details fails
   */
  async getCredentialDetails(id) {
    try {
      const response = await this.client.get(`/credential/${id}`);
      return response.data;
    } catch (error) {
      this._handleError(error, `Failed to retrieve VAPI credential details for ID: ${id}`);
    }
  }

  /**
   * Create a SIP trunk connection in VAPI
   * @param {string} name - Name for the SIP trunk
   * @param {string} inboundSipUri - The SIP URI for inbound calls
   * @returns {Promise<Object>} The created SIP trunk connection
   * @throws {Error} If creating the SIP trunk fails
   */
  async createSipTrunkConnection(name, inboundSipUri) {
    try {
      const response = await this.client.post('/credential', {
        provider: 'byo-sip-trunk',
        name,
        gateways: [{ ip: inboundSipUri }]
      });
      return response.data;
    } catch (error) {
      this._handleError(error, 'Failed to create VAPI SIP trunk connection');
    }
  }

  /**
   * Add a BYO phone number to VAPI
   * @param {string} name - Name for the phone number
   * @param {string} phoneNumber - The phone number in E.164 format
   * @param {string} credentialId - The credential ID to use for this number
   * @returns {Promise<Object>} The added phone number details
   * @throws {Error} If adding the phone number fails
   */
  async addPhoneNumber(name, phoneNumber, credentialId) {
    try {
      const response = await this.client.post('/phone-number', {
        provider: 'byo-phone-number',
        name: `Cloudonix ${phoneNumber}`,
        number: phoneNumber,
        numberE164CheckEnabled: false,
        credentialId
      });
      return response.data;
    } catch (error) {
      this._handleError(error, 'Failed to add BYO phone number');
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

module.exports = VapiAgentProvider;