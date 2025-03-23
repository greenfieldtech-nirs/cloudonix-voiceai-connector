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

    this._setupInterceptors();
  }

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
        logApiError(error, 'vapiApi.js', this._getLineNumber());
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
        logApiError(error, 'vapiApi.js', this._getLineNumber());
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

  _getLineNumber() {
    return new Error().stack.split('\n')[2].match(/:(\d+):/)[1];
  }

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

  async addByoPhoneNumber(name, phoneNumber, credentialId) {
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

module.exports = VapiApiService;