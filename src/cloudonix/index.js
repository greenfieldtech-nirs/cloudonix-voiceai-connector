const CloudonixApiService = require('./CloudonixApiService');

/**
 * Factory for creating Cloudonix API service instances
 */
class CloudonixApiFactory {
  /**
   * Create a Cloudonix API service instance
   * @param {string} apiKey - The API key for Cloudonix
   * @param {string} apiUrl - Optional custom API URL
   * @returns {ICloudonixApi} An instance of the Cloudonix API service
   */
  static createService(apiKey, apiUrl) {
    return new CloudonixApiService(apiKey, apiUrl);
  }

  /**
   * Get information about the Cloudonix API service
   * @returns {Object} Information about the Cloudonix API
   */
  static getServiceInfo() {
    return {
      name: 'Cloudonix API',
      defaultUrl: 'https://api.cloudonix.io',
      documentation: 'https://docs.cloudonix.io',
    };
  }
}

module.exports = {
  CloudonixApiService,
  CloudonixApiFactory,
};
