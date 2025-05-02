const axios = require('axios');
const { logApiRequest, logApiResponse, logApiError } = require('../utils/debug');
const ICloudonixApi = require('../interfaces/ICloudonixApi');

/**
 * Service for interacting with the Cloudonix API
 * @implements {ICloudonixApi}
 */
class CloudonixApiService extends ICloudonixApi {
  /**
   * Create a new Cloudonix API service instance
   * @param {string} apiKey - The Cloudonix API key
   * @param {string} baseUrl - The base URL for the Cloudonix API
   */
  constructor(apiKey, baseUrl = 'https://api.cloudonix.io') {
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

    // Add request interceptor for debugging
    this.client.interceptors.request.use(
      (config) => {
        logApiRequest(config.method.toUpperCase(), `${config.baseURL}${config.url}`, config.data);
        if (process.argv.includes('--debug')) {
          console.log('\n=== Cloudonix API Request ===');
          console.log(`${config.method.toUpperCase()} ${config.url}`);
          console.log('Headers:', JSON.stringify(config.headers, null, 2));
          console.log('Request Data:', JSON.stringify(config.data, null, 2));
          console.log('========================\n');
        }
        return config;
      },
      (error) => {
        logApiError(error, 'CloudonixApiService.js', this._getLineNumber());
        if (process.argv.includes('--debug')) {
          console.error('\n=== Cloudonix API Request Error ===');
          console.error(error);
          console.error('================================\n');
        }
        return Promise.reject(error);
      }
    );

    // Add response interceptor for debugging
    this.client.interceptors.response.use(
      (response) => {
        logApiResponse(response);
        if (process.argv.includes('--debug')) {
          console.log('\n=== Cloudonix API Response ===');
          console.log(`Status: ${response.status} ${response.statusText}`);
          console.log('Headers:', JSON.stringify(response.headers, null, 2));
          console.log('Response Data:', JSON.stringify(response.data, null, 2));
          console.log('==========================\n');
        }
        return response;
      },
      (error) => {
        logApiError(error, 'CloudonixApiService.js', this._getLineNumber());
        if (process.argv.includes('--debug')) {
          console.error('\n=== Cloudonix API Error Response ===');
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
      // Try to access a customer-specific endpoint to verify key
      await this.client.get('/customers/self');
      return true;
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('Invalid Cloudonix API key: Authentication failed');
      }
      this._handleError(error, 'Failed to verify Cloudonix API key');
    }
  }

  /**
   * Get domain details from Cloudonix
   * @param {string} domainName - The domain name to fetch
   * @returns {Promise<Object>} Domain details including aliases
   * @throws {Error} If fetching domain details fails
   */
  async getDomainDetails(domainName) {
    try {
      const response = await this.client.get(`/customers/self/domains/${domainName}`);
      return response.data;
    } catch (error) {
      this._handleError(error, `Failed to get details for domain ${domainName}`);
    }
  }

  /**
   * Create a SIP trunk in a Cloudonix domain
   * @param {string} domainName - The domain name
   * @param {Object} trunkData - The SIP trunk configuration data
   * @returns {Promise<Object>} The created trunk details
   * @throws {Error} If creating the SIP trunk fails
   */
  async createSipTrunk(domainName, trunkData) {
    try {
      const response = await this.client.post(`/customers/self/domains/${domainName}/trunks`, trunkData);
      return response.data;
    } catch (error) {
      this._handleError(error, `Failed to create SIP trunk for domain ${domainName}`);
    }
  }

  /**
   * Get tenant details from Cloudonix
   * @param {string} tenantId - The tenant ID
   * @returns {Promise<Object>} Tenant details
   * @throws {Error} If fetching tenant details fails
   */
  async getTenantDetails(tenantId) {
    try {
      const response = await this.client.get(`/customers/self/tenants/${tenantId}`);
      return response.data;
    } catch (error) {
      this._handleError(error, `Failed to get details for tenant ${tenantId}`);
    }
  }

  /**
   * Create or update a domain in Cloudonix
   * @param {string} domainName - The domain name
   * @param {Object} domainData - The domain configuration data
   * @returns {Promise<Object>} The created or updated domain
   * @throws {Error} If creating or updating the domain fails
   */
  async createOrUpdateDomain(domainName, domainData) {
    try {
      const response = await this.client.put(`/customers/self/domains/${domainName}`, domainData);
      return response.data;
    } catch (error) {
      this._handleError(error, `Failed to create or update domain ${domainName}`);
    }
  }

  /**
   * Delete a domain from Cloudonix
   * @param {string} domainName - The domain name to delete
   * @returns {Promise<boolean>} True if deletion was successful
   * @throws {Error} If deleting the domain fails
   */
  async deleteDomain(domainName) {
    try {
      await this.client.delete(`/customers/self/domains/${domainName}`);
      return true;
    } catch (error) {
      this._handleError(error, `Failed to delete domain ${domainName}`);
    }
  }

  /**
   * Configure a domain's default application
   * @param {string} domainName - The domain name
   * @param {string} applicationId - The application ID
   * @returns {Promise<Object>} The updated domain configuration
   * @throws {Error} If configuring the default application fails
   */
  async setDomainDefaultApplication(domainName, applicationId) {
    try {
      const response = await this.client.put(`/customers/self/domains/${domainName}/defaultApplication`, {
        applicationId
      });
      return response.data;
    } catch (error) {
      this._handleError(error, `Failed to set default application for domain ${domainName}`);
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

module.exports = CloudonixApiService;