const { Retell } = require('retell-sdk');
const { logApiError, debugLog } = require('../utils/debug');
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

    // Create Retell SDK client
    this.client = new Retell({
      apiKey: this.apiKey,
      basePath: this.baseUrl
    });

    this._updateConfig();
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
   * Log debug information
   * @private
   * @param {string} message - The debug message
   * @param {any} data - The data to log
   */
  _logDebug(message, data) {
    if (process.argv.includes('--debug')) {
      console.log(`\n=== Retell API ${message} ===`);
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      }
      console.log('===========================\n');
    }
  }

  /**
   * Verify that the API key is valid
   * @returns {Promise<boolean>} True if the API key is valid
   * @throws {Error} If the API key is invalid or verification fails
   */
  async verifyApiKey() {
    try {
      // List agents to verify API key is valid
      await this.client.agents.listAgents();
      return true;
    } catch (error) {
      if (error.status === 403 || error.status === 401) {
        throw new Error('Invalid Retell API key: Authentication failed');
      }
      if (error.status !== 403 && error.status !== 401) {
        debugLog('Warning: Retell API returned a non-authorization error, assuming API key is valid');
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
      const response = await this.client.phoneNumbers.listPhoneNumbers();
      this._logDebug('Phone Numbers Response', response);
      return response;
    } catch (error) {
      this._handleError(error, 'Failed to retrieve Retell phone numbers');
    }
  }

  /**
   * Get detailed information for a specific phone number
   * @param {string} phoneNumber - The phone number in E.164 format
   * @returns {Promise<Object>} Detailed phone number information
   * @throws {Error} If fetching phone number details fails
   */
  async getPhoneNumberDetails(phoneNumber) {
    try {
      // Ensure the phone number has the '+' prefix
      const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      const response = await this.client.phoneNumbers.getPhoneNumber({
        phoneNumber: formattedNumber
      });
      this._logDebug('Phone Number Details', response);
      return response;
    } catch (error) {
      this._handleError(error, `Failed to retrieve Retell phone number details for: ${phoneNumber}`);
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

      const response = await this.client.phoneNumbers.importPhoneNumber({
        phoneNumber,
        terminationUri: domainConfig.inboundSipUri
      });

      this._updatePhoneNumberConfig(config, phoneNumber, domainName, response.lastModificationTimestamp);
      this._logDebug('Import Phone Number Response', response);
      
      return response;
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

    // Log detailed error in debug mode
    if (process.argv.includes('--debug')) {
      console.error('\n=== Retell API Error ===');
      console.error(message);
      console.error(error);
      console.error('========================\n');
    }

    // Format error message based on error type
    if (error.status) {
      // SDK error format
      const data = error.body || {};
      errorMessage += data.error || data.message 
        ? `: ${data.error || data.message}`
        : `: Status ${error.status}`;
    } else if (error.response) {
      // Axios error format (fallback)
      const { status, data } = error.response;
      errorMessage += data?.error || data?.message 
        ? `: ${data.error || data.message}`
        : `: Status ${status}`;
    } else {
      // Generic error
      errorMessage += error.message ? `: ${error.message}` : '';
    }

    // Log error for tracking
    logApiError(error, 'RetellAgentProvider.js', this._getLineNumber());

    throw new Error(errorMessage);
  }

  /**
   * Get a list of agents configured in Retell
   * @returns {Promise<Array>} Array of agent objects
   * @throws {Error} If fetching agents fails
   */
  async getAgents() {
    try {
      const response = await this.client.agents.listAgents();
      this._logDebug('Agents Response', response);
      return response;
    } catch (error) {
      this._handleError(error, 'Failed to retrieve Retell agents');
    }
  }

  /**
   * Get detailed information about a specific agent
   * @param {string} agentId - The agent ID
   * @returns {Promise<Object>} Detailed agent information
   * @throws {Error} If fetching agent details fails
   */
  async getAgentDetails(agentId) {
    try {
      const response = await this.client.agents.getAgent({
        agentId
      });
      this._logDebug('Agent Details', response);
      return response;
    } catch (error) {
      this._handleError(error, `Failed to retrieve Retell agent details for: ${agentId}`);
    }
  }
}

module.exports = RetellAgentProvider;