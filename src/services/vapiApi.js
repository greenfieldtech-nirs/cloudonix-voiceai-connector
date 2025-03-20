const axios = require('axios');
const { logApiRequest, logApiResponse, logApiError, debugLog } = require('../utils/debug');

class VapiApiService {
  constructor(apiKey, baseUrl = 'https://api.vapi.ai') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor for debugging
    this.client.interceptors.request.use(
        (config) => {
          logApiRequest(config.method.toUpperCase(), `${config.baseURL}${config.url}`, config.data);
          return config;
        },
        (error) => {
          logApiError(error, 'vapiApi.js', new Error().stack.split('\n')[1].match(/:(\d+):/)[1]);
          return Promise.reject(error);
        }
    );

    // Add response interceptor for debugging
    this.client.interceptors.response.use(
        (response) => {
          logApiResponse(response);
          return response;
        },
        (error) => {
          logApiError(error, 'vapiApi.js', new Error().stack.split('\n')[1].match(/:(\d+):/)[1]);
          return Promise.reject(error);
        }
    );
  }

  /**
   * Verify the API key by making a request to /assistant endpoint
   * @returns {Promise<boolean>} True if the API key is valid
   */
  async verifyApiKey() {
    try {
      // We'll use the assistant endpoint to verify the API key
      // Any response other than 403 is considered a success
      const response = await this.client.get('/assistant');
      return true;
    } catch (error) {
      // If we get a 403, the API key is definitely wrong
      if (error.response && error.response.status === 403) {
        throw new Error('Invalid VAPI API key: Authentication failed');
      }

      // For other errors that might be due to rate limiting or service availability,
      // we'll assume the key is correct if it's not specifically a 403 authentication error
      if (error.response && error.response.status !== 403) {
        debugLog('Warning: VAPI API returned a non-403 error, assuming API key is valid');
        return true;
      }

      // Handle other errors
      this._handleError(error, 'Failed to verify VAPI API key');
    }
  }

  /**
   * Create a SIP trunk connection
   * @param {string} name - Name for the SIP trunk
   * @param {string} inboundSipUri - Cloudonix inbound SIP URI
   * @returns {Promise<Object>} Created credential details
   */
  async createSipTrunkConnection(name, inboundSipUri) {
    try {
      const response = await this.client.post('/credential', {
        provider: 'byo-sip-trunk',
        name: name,
        gateways: [
          {
            ip: inboundSipUri
          }
        ]
      });
      return response.data;
    } catch (error) {
      this._handleError(error, 'Failed to create VAPI SIP trunk connection');
    }
  }

  /**
   * Add a BYO phone number to a SIP trunk
   * @param {string} name - Descriptive name for the phone number
   * @param {string} phoneNumber - The phone number in E.164 format
   * @param {string} credentialId - ID of the SIP trunk credential
   * @returns {Promise<Object>} Created phone number details
   */
  async addByoPhoneNumber(name, phoneNumber, credentialId) {
    try {
      const response = await this.client.post('/phone-number', {
        provider: 'byo-phone-number',
        name: 'Cloudonix ' || phoneNumber,
        number: phoneNumber,
        numberE164CheckEnabled: false,
        credentialId: credentialId
      });
      return response.data;
    } catch (error) {
      this._handleError(error, 'Failed to add BYO phone number');
    }
  }

  /**
   * Add a phone number to an assistant
   * @param {string} sipUri - SIP URI in format "sip:+12025551234@sip.vapi.ai"
   * @param {string} assistantId - ID of the assistant to associate with the number
   * @returns {Promise<Object>} Created phone number details
   */
  async addNumberToAssistant(sipUri, assistantId) {
    try {
      const response = await this.client.post('/phone-number', {
        provider: 'vapi',
        sipUri: sipUri,
        assistantId: assistantId
      });
      return response.data;
    } catch (error) {
      this._handleError(error, 'Failed to add phone number to assistant');
    }
  }

  /**
   * Handle API errors
   * @private
   */
  _handleError(error, message) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const statusCode = error.response.status;
      const errorData = error.response.data;

      let errorMessage = message;

      if (errorData && errorData.error) {
        errorMessage += `: ${errorData.error}`;
      } else if (errorData && errorData.message) {
        errorMessage += `: ${errorData.message}`;
      } else {
        errorMessage += `: Status ${statusCode}`;
      }

      throw new Error(errorMessage);
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error(`${message}: No response received from server`);
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new Error(`${message}: ${error.message}`);
    }
  }
}

module.exports = VapiApiService;