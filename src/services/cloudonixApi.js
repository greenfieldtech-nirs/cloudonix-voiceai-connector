const axios = require('axios');
const { logApiRequest, logApiResponse, logApiError } = require('../utils/debug');

class CloudonixApiService {
  constructor(apiKey, baseUrl = 'https://api.cloudonix.io') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for debugging
    this.client.interceptors.request.use(
      (config) => {
        logApiRequest(config.method.toUpperCase(), `${config.baseURL}${config.url}`, config.data);
        return config;
      },
      (error) => {
        logApiError(error, 'cloudonixApi.js', new Error().stack.split('\n')[1].match(/:(\d+):/)[1]);
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
        logApiError(error, 'cloudonixApi.js', new Error().stack.split('\n')[1].match(/:(\d+):/)[1]);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get domain details
   * @param {string} domainName - The domain name to fetch
   * @returns {Promise<Object>} Domain details including aliases
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

module.exports = CloudonixApiService;
