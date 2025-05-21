const { ElevenLabsClient } = require('elevenlabs');
const { logApiError, debugLog } = require('../utils/debug');
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
   * @param {string} baseUrl - The base URL for the 11Labs API (ignored when using official SDK)
   */
  constructor(apiKey, baseUrl = 'https://api.elevenlabs.io') {
    super();
    this.apiKey = apiKey;
    // Make sure baseUrl doesn't end with a slash to avoid path issues
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    // Create a client using the elevenlabs package
    // The official SDK handles the base URL automatically
    this.client = new ElevenLabsClient({
      apiKey: this.apiKey
    });

    this._updateConfig();
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
   * Log debug information
   * @private
   * @param {string} message - The message to log
   * @param {any} data - The data to log
   */
  _logDebug(message, data) {
    if (process.argv.includes('--debug')) {
      console.log(`\n=== 11Labs API ${message} ===`);
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      }
      console.log('===========================\n');
    }
  }
  
  /**
   * Set up axios debug interceptors when --debug flag is used
   * @private
   * @param {Object} axios - The axios instance to configure
   */
  _setupAxiosDebug(axios) {
    if (process.argv.includes('--debug')) {
      // Add request interceptor for debug logging
      axios.interceptors.request.use(request => {
        console.log('\n=== 11Labs Axios Request ===');
        console.log('URL:', request.method.toUpperCase(), request.url);
        console.log('Headers:', JSON.stringify(request.headers, null, 2));
        if (request.data) {
          console.log('Data:', JSON.stringify(request.data, null, 2));
        }
        console.log('============================\n');
        return request;
      });

      // Add response interceptor for debug logging
      axios.interceptors.response.use(
        response => {
          console.log('\n=== 11Labs Axios Response ===');
          console.log('Status:', response.status, response.statusText);
          console.log('Headers:', JSON.stringify(response.headers, null, 2));
          
          // More detailed analysis of the response data
          if (response.data) {
            console.log('Data:', JSON.stringify(response.data, null, 2));
            console.log('Data Type:', typeof response.data);
            
            // If it's an object, list all top-level keys
            if (typeof response.data === 'object' && response.data !== null && !Array.isArray(response.data)) {
              console.log('Available Keys:', Object.keys(response.data));
            }
            
            // If it's an array, show the length and sample of first item
            if (Array.isArray(response.data)) {
              console.log('Array Length:', response.data.length);
              if (response.data.length > 0) {
                console.log('First Item Sample:', JSON.stringify(response.data[0], null, 2));
              }
            }
          } else {
            console.log('Data: Empty or null response data');
          }
          console.log('=============================\n');
          return response;
        }, 
        error => {
          console.log('\n=== 11Labs Axios Error ===');
          console.log('Message:', error.message);
          if (error.response) {
            console.log('Status:', error.response.status, error.response.statusText);
            console.log('Headers:', JSON.stringify(error.response.headers, null, 2));
            if (error.response.data) {
              console.log('Error Data:', JSON.stringify(error.response.data, null, 2));
            }
          } else if (error.request) {
            console.log('Request was made but no response received');
            console.log('Request:', error.request);
          }
          console.log('==========================\n');
          return Promise.reject(error);
        }
      );
    }
  }

  /**
   * Verify that the API key is valid
   * @returns {Promise<boolean>} True if the API key is valid
   * @throws {Error} If the API key is invalid or verification fails
   */
  async verifyApiKey() {
    try {
      // Use user endpoint to verify API key
      const user = await this.client.user.get();
      this._logDebug('User Info', user);
      return true;
    } catch (error) {
      if (error.statusCode === 401) {
        throw new Error('Invalid 11Labs API key: Authentication failed');
      }
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
      const axios = require('axios');
      const baseUrl = this.baseUrl || 'https://api.elevenlabs.io/v1';
      
      this._logDebug('Get Phone Numbers Request', {
        endpoint: '/v1/convai/phone-numbers/',
        method: 'GET',
        headers: {
          'Xi-Api-Key': '********' // Masking API key for security
        }
      });
      
      // Set up axios debug interceptors
      this._setupAxiosDebug(axios);
      
      // Use direct axios call with Xi-Api-Key header
      const response = await axios.get(`${baseUrl}/v1/convai/phone-numbers/`, {
        headers: {
          'Xi-Api-Key': this.apiKey,
          'Accept': 'application/json'
        }
      });
      
      // Log the raw response first for debugging
      this._logDebug('Get Phone Numbers Raw Response', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });
      
      // Check if response.data is an array directly (some APIs return array at top level)
      let phoneNumbers = [];
      if (Array.isArray(response.data)) {
        phoneNumbers = response.data;
      } 
      // If it's an object with a phone_numbers property
      else if (response.data.phone_numbers && Array.isArray(response.data.phone_numbers)) {
        phoneNumbers = response.data.phone_numbers;
      }
      // If it has a data property (some APIs nest under 'data')
      else if (response.data.data && Array.isArray(response.data.data)) {
        phoneNumbers = response.data.data;
      }
      // Last attempt - maybe it's under "results" or another common name
      else if (response.data.results && Array.isArray(response.data.results)) {
        phoneNumbers = response.data.results;
      }
      // One more check for "items"
      else if (response.data.items && Array.isArray(response.data.items)) {
        phoneNumbers = response.data.items;
      }
      
      this._logDebug('Get Phone Numbers Processed Response', {
        phoneNumbersCount: phoneNumbers.length,
        data: phoneNumbers
      });
      
      // If API returns data, return it
      if (phoneNumbers.length > 0) {
        return phoneNumbers;
      }
      
      // If no phone numbers from API, try to get them from the local config
      this._logDebug('No phone numbers from API, checking local config');
      const { getConfig } = require('../utils/config');
      const config = getConfig();
      
      // Log the relevant parts of config for debugging
      if (process.argv.includes('--debug')) {
        console.log('\n=== Local Configuration Check ===');
        console.log('Has elevenlabs config:', !!config.elevenlabs);
        if (config.elevenlabs) {
          console.log('Has phoneNumbers:', !!config.elevenlabs.phoneNumbers);
          console.log('Phone Numbers Keys:', config.elevenlabs.phoneNumbers ? Object.keys(config.elevenlabs.phoneNumbers) : 'None');
        }
        console.log('================================\n');
      }
      
      // Convert local config phone numbers to a format similar to the API response
      if (config.elevenlabs && config.elevenlabs.phoneNumbers) {
        const phoneNumbersKeys = Object.keys(config.elevenlabs.phoneNumbers);
        
        if (phoneNumbersKeys.length > 0) {
          const localNumbers = Object.entries(config.elevenlabs.phoneNumbers).map(([number, details]) => ({
            phone_number: number,
            phone_number_id: details.id,
            label: `[Local Config] ${number}`,
            termination_uri: details.sipUri || null,
            status: 'active', // Assume active since it's in the config
            created_at: new Date().toISOString(), // Just use current date as we don't have this info
            source: 'local_config'
          }));
          
          this._logDebug('Phone Numbers from Local Config', {
            count: localNumbers.length,
            data: localNumbers
          });
          
          return localNumbers;
        }
        
        this._logDebug('No phone numbers in local config');
      } else {
        this._logDebug('No elevenlabs config or missing phoneNumbers section');
      }
      
      // If no data from API or local config, return empty array
      return [];
    } catch (error) {
      // Log error details for debugging
      this._logDebug('Get Phone Numbers Error', {
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : 'No response'
      });
      
      // Final fallback - return local numbers if we have them
      try {
        const { getConfig } = require('../utils/config');
        const config = getConfig();
        
        if (config.elevenlabs && config.elevenlabs.phoneNumbers) {
          const localNumbers = Object.entries(config.elevenlabs.phoneNumbers).map(([number, details]) => ({
            phone_number: number,
            phone_number_id: details.id,
            label: `[Local Config] ${number}`,
            termination_uri: details.sipUri || null,
            source: 'local_config_fallback'
          }));
          
          this._logDebug('Fallback: Phone Numbers from Local Config', {
            data: localNumbers
          });
          
          if (localNumbers.length > 0) {
            return localNumbers;
          }
        }
      } catch (configError) {
        this._logDebug('Failed to get local config', {
          error: configError.message
        });
      }
      
      // If all else fails, return empty array rather than throwing an error
      return [];
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
      const axios = require('axios');
      const baseUrl = this.baseUrl || 'https://api.elevenlabs.io/v1';
      
      this._logDebug('Get Phone Number Details Request', {
        endpoint: `/v1/convai/phone-numbers/${id}`,
        method: 'GET',
        headers: {
          'Xi-Api-Key': '********' // Masking API key for security
        }
      });
      
      // Set up axios debug interceptors
      this._setupAxiosDebug(axios);
      
      // Use direct axios call with Xi-Api-Key header
      const response = await axios.get(`${baseUrl}/v1/convai/phone-numbers/${id}`, {
        headers: {
          'Xi-Api-Key': this.apiKey,
          'Accept': 'application/json'
        }
      });
      
      const result = response.data;
      
      this._logDebug('Get Phone Number Details Response', {
        status: response.status,
        statusText: response.statusText,
        data: result
      });
      
      return result;
    } catch (error) {
      // Log error details for debugging
      this._logDebug('Get Phone Number Details Error', {
        id,
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : 'No response'
      });
      
      // Handle case where the endpoint returns 404
      if (error.response?.status === 404) {
        // Try to get details from local config
        try {
          const { getConfig } = require('../utils/config');
          const config = getConfig();
          
          if (config.elevenlabs && config.elevenlabs.phoneNumbers) {
            // Find the phone number in the local config that matches this ID
            const localNumber = Object.entries(config.elevenlabs.phoneNumbers)
              .find(([_, details]) => details.id === id);
            
            if (localNumber) {
              const [number, details] = localNumber;
              this._logDebug('Phone Number Details from Local Config', {
                number,
                details
              });
              
              return {
                phone_number_id: id,
                phone_number: number,
                label: `[Local Config] ${number}`,
                termination_uri: details.sipUri || null,
                source: 'local_config'
              };
            }
          }
        } catch (configError) {
          this._logDebug('Failed to get local config', {
            error: configError.message
          });
        }
        
        // If we can't find it in local config, return basic info
        return { id, phone_number: id };
      }
      
      // For other errors, use the standard error handler
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
      // TODO: Implement when 11Labs supports SIP trunk creation
      // For now, return a dummy object as stub implementation
      this._logDebug('Create SIP Trunk Connection', { name, inboundSipUri });
      return { name, inboundSipUri, id: `trunk-${Date.now()}` };
    } catch (error) {
      this._handleError(error, 'Failed to create 11Labs SIP trunk connection');
    }
  }

  /**
   * Add a phone number to 11Labs
   * @param {string} name - Name for the phone number
   * @param {string} phoneNumber - The phone number in E.164 format
   * @param {string} domainOrCredentialId - The domain name or credential ID to use for this number
   * @returns {Promise<Object>} The added phone number details
   * @throws {Error} If adding the phone number fails
   */
  async addPhoneNumber(name, phoneNumber, domainOrCredentialId) {
    try {
      // ElevenLabs requires specific format for phone numbers
      // Make sure the number is in E.164 format
      if (!phoneNumber.startsWith('+')) {
        phoneNumber = `+${phoneNumber}`;
      }
      
      // For ElevenLabs, we need to use their API to register the phone number
      // Using the ConvAI phone numbers API endpoint for SIP trunk phone numbers
      // /v1/convai/phone-numbers/create
      
      // Get the domain configuration to access inboundSipUri
      const { getConfig } = require('../utils/config');
      const config = getConfig();
      
      // Try to find the domain config if domainOrCredentialId is a domain name
      let terminationUri;
      if (typeof domainOrCredentialId === 'string' && config.domains && config.domains[domainOrCredentialId]) {
        const domainConfig = config.domains[domainOrCredentialId];
        if (!domainConfig.inboundSipUri) {
          throw new Error(`Domain ${domainOrCredentialId} does not have an inbound SIP URI configured`);
        }
        terminationUri = `sip:${domainConfig.inboundSipUri}:5060`;
      } else {
        // Use the provided credential ID directly if not a domain or domain not found
        terminationUri = `sip:${domainOrCredentialId}:5060`;
      }
      
      // Format the label to include both domain name and phone number
      let formattedLabel = name;
      
      // If we have a domain name in domainOrCredentialId, include it in the label
      if (typeof domainOrCredentialId === 'string' && config.domains && config.domains[domainOrCredentialId]) {
        formattedLabel = `[${domainOrCredentialId}] ${phoneNumber}`;
      } else {
        // If no domain, use a generic format with just the phone number
        formattedLabel = `[Cloudonix] ${phoneNumber}`;
      }
      
      // Create the request payload with the correct termination URI and formatted label
      const requestPayload = {
        phone_number: phoneNumber,
        label: formattedLabel,
        termination_uri: terminationUri,
        provider: "sip_trunk"
      };
      
      // Log the request
      this._logDebug('Add Phone Number Request', {
        endpoint: '/v1/convai/phone-numbers/create',
        method: 'POST',
        headers: {
          'Xi-Api-Key': '********' // Masking API key for security
        },
        payload: requestPayload
      });
      
      // Use direct axios call with Xi-Api-Key header
      const axios = require('axios');
      const baseUrl = this.baseUrl || 'https://api.elevenlabs.io/v1';
      
      // Set up axios debug interceptors
      this._setupAxiosDebug(axios);
      
      const response = await axios.post(`${baseUrl}/v1/convai/phone-numbers/create`, 
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Xi-Api-Key': this.apiKey
          }
        }
      );
      
      const result = response.data;
      
      // Log the response
      this._logDebug('Add Phone Number Response', {
        status: response.status,
        statusText: response.statusText,
        data: result
      });
      
      // Return a standardized response that matches our interface with the correct properties
      // The 11Labs API response structure for phone number creation includes:
      // - phone_number_id: the unique identifier for the phone number
      // - phone_number: the phone number in E.164 format
      // - label: the name/label associated with the phone number
      // - termination_uri: the SIP URI for call termination
      // - status: the status of the phone number (e.g., "active")
      // - created_at: timestamp of creation
      return {
        // Standard internal properties
        id: result.phone_number_id || `phone-${Date.now()}`,
        
        // Exact properties from 11Labs API
        phone_number_id: result.phone_number_id,
        phone_number: result.phone_number || phoneNumber,
        label: result.label || formattedLabel,
        termination_uri: result.termination_uri,
        status: result.status,
        created_at: result.created_at,
        
        // Additional mapped properties for compatibility
        name: result.label || formattedLabel,
        phoneNumber: result.phone_number || phoneNumber,
        credentialId: domainOrCredentialId,
        
        // Include any additional fields from the ElevenLabs response
        ...result
      };
    } catch (error) {
      // Log the error details for debugging
      this._logDebug('Add Phone Number Error', {
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : 'No response'
      });
      
      // Special handling for common errors
      if (error.response?.status === 400) {
        const errorMessage = error.response.data?.detail || error.response.data?.message || 'Invalid request parameters';
        throw new Error(`Failed to add phone number to 11Labs: ${errorMessage}`);
      } else if (error.response?.status === 401) {
        throw new Error(`Failed to add phone number to 11Labs: Authentication failed. Check your API key.`);
      } else if (error.response?.status === 429) {
        throw new Error(`Failed to add phone number to 11Labs: Rate limit exceeded. Please try again later.`);
      }
      
      // For other errors, use the standard error handler
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

    if (error.statusCode) {
      // ElevenLabs SDK error format
      errorMessage += error.message ? `: ${error.message}` : `: Status ${error.statusCode}`;
    } else if (error.response) {
      // Axios error format (fallback)
      const { status, data } = error.response;
      
      // Get a descriptive error message from the response data
      let detailMessage = '';
      if (data?.error) {
        detailMessage = data.error;
      } else if (data?.detail) {
        detailMessage = data.detail;
      } else if (data?.message) {
        detailMessage = data.message;
      } else if (typeof data === 'string') {
        detailMessage = data;
      } else {
        detailMessage = `Status ${status}`;
      }
      
      errorMessage += `: ${detailMessage}`;
    } else {
      // Generic error
      errorMessage += error.message ? `: ${error.message}` : '';
    }

    // Log detailed error in debug mode
    if (process.argv.includes('--debug')) {
      console.error('\n=== 11Labs API Error ===');
      console.error(errorMessage);
      
      // Log more structured error information
      console.error('Error details:');
      if (error.response) {
        console.error(`Status: ${error.response.status} ${error.response.statusText}`);
        console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.error('No response received');
        console.error('Request:', error.request);
      } else {
        console.error('Error:', error.message);
      }
      console.error('Stack trace:', error.stack);
      console.error('========================\n');
    }

    // Log error for tracking
    logApiError(error, 'ElevenLabsAgentProvider.js', this._getLineNumber());

    throw new Error(errorMessage);
  }

  /**
   * Get information about available voices
   * @returns {Promise<Array>} Array of available voices
   */
  async getVoices() {
    try {
      const voices = await this.client.voices.getAll();
      this._logDebug('Voices', voices);
      return voices;
    } catch (error) {
      this._handleError(error, 'Failed to retrieve 11Labs voices');
    }
  }

  /**
   * Get detailed information about voice models
   * @returns {Promise<Array>} Array of available models
   */
  async getModels() {
    try {
      const models = await this.client.models.getAll();
      this._logDebug('Models', models);
      return models;
    } catch (error) {
      this._handleError(error, 'Failed to retrieve 11Labs models');
    }
  }
}

module.exports = ElevenLabsAgentProvider;