const axios = require('axios');
const { logApiRequest, logApiResponse, logApiError, debugLog } = require('../utils/debug');
const { getConfig, saveConfig } = require('../utils/config');

class RetellApiService {
  constructor(apiKey, baseUrl = 'https://api.retellai.com') {
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

  _updateConfig() {
    const config = getConfig();
    config.retell = {
      ...config.retell,
      apiKey: this.apiKey,
      apiUrl: this.baseUrl
    };
    saveConfig(config);
  }

  _getLineNumber() {
    return new Error().stack.split('\n')[2].match(/:(\d+):/)[1];
  }

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
      this._handleError(error, 'Failed to import phone number to ReTell');
    }
  }

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

module.exports = RetellApiService;