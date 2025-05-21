/* eslint-disable no-unused-vars */
/**
 * Interface for Voice Agent Providers
 * This interface defines the standard methods that all voice agent provider implementations must support
 */
class IVoiceAgentProvider {
  /**
   * Create a new instance of a voice agent provider
   * @param {string} apiKey - The API key for the service
   * @param {string} baseUrl - The base URL for the API (optional)
   */
  constructor(apiKey, baseUrl) {
    if (this.constructor === IVoiceAgentProvider) {
      throw new Error('Cannot instantiate interface directly');
    }
  }

  /**
   * Verify that the API key is valid
   * @returns {Promise<boolean>} True if the API key is valid
   * @throws {Error} If the API key is invalid or verification fails
   */
  async verifyApiKey() {
    throw new Error('Method not implemented');
  }

  /**
   * Get all phone numbers configured in the voice agent provider
   * @returns {Promise<Array>} Array of phone number objects
   * @throws {Error} If fetching phone numbers fails
   */
  async getPhoneNumbers() {
    throw new Error('Method not implemented');
  }

  /**
   * Get detailed information for a specific phone number
   * @param {string} id - The ID of the phone number
   * @returns {Promise<Object>} Detailed phone number information
   * @throws {Error} If fetching phone number details fails
   */
  async getPhoneNumberDetails(id) {
    throw new Error('Method not implemented');
  }

  /**
   * Create a SIP trunk connection
   * @param {string} name - Name for the SIP trunk
   * @param {string} inboundSipUri - The SIP URI for inbound calls
   * @returns {Promise<Object>} The created SIP trunk connection
   * @throws {Error} If creating the SIP trunk fails
   */
  async createSipTrunkConnection(name, inboundSipUri) {
    throw new Error('Method not implemented');
  }

  /**
   * Add a BYO (Bring Your Own) phone number to the service
   * @param {string} name - Name for the phone number
   * @param {string} phoneNumber - The phone number in E.164 format
   * @param {string} credentialId - The credential ID to use for this number
   * @returns {Promise<Object>} The added phone number details
   * @throws {Error} If adding the phone number fails
   */
  async addPhoneNumber(name, phoneNumber, credentialId) {
    throw new Error('Method not implemented');
  }
}

module.exports = IVoiceAgentProvider;
