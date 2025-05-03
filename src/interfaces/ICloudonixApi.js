/**
 * Interface for Cloudonix API Services
 * This interface defines the standard methods that all Cloudonix API implementations must support
 */
class ICloudonixApi {
  /**
   * Create a new instance of a Cloudonix API service
   * @param {string} apiKey - The API key for Cloudonix
   * @param {string} baseUrl - The base URL for the Cloudonix API (optional)
   */
  constructor(apiKey, baseUrl) {
    if (this.constructor === ICloudonixApi) {
      throw new Error("Cannot instantiate interface directly");
    }
  }

  /**
   * Verify that the API key is valid
   * @returns {Promise<boolean>} True if the API key is valid
   * @throws {Error} If the API key is invalid or verification fails
   */
  async verifyApiKey() {
    throw new Error("Method not implemented");
  }

  /**
   * Get domain details from Cloudonix
   * @param {string} domainName - The domain name to fetch
   * @returns {Promise<Object>} Domain details including aliases
   * @throws {Error} If fetching domain details fails
   */
  async getDomainDetails(domainName) {
    throw new Error("Method not implemented");
  }

  /**
   * Create a SIP trunk in a Cloudonix domain
   * @param {string} domainName - The domain name
   * @param {Object} trunkData - The SIP trunk configuration data
   * @returns {Promise<Object>} The created trunk details
   * @throws {Error} If creating the SIP trunk fails
   */
  async createSipTrunk(domainName, trunkData) {
    throw new Error("Method not implemented");
  }

  /**
   * Get tenant details from Cloudonix
   * @param {string} tenantId - The tenant ID
   * @returns {Promise<Object>} Tenant details
   * @throws {Error} If fetching tenant details fails
   */
  async getTenantDetails(tenantId) {
    throw new Error("Method not implemented");
  }

  /**
   * Create or update a domain in Cloudonix
   * @param {string} domainName - The domain name
   * @param {Object} domainData - The domain configuration data
   * @returns {Promise<Object>} The created or updated domain
   * @throws {Error} If creating or updating the domain fails
   */
  async createOrUpdateDomain(domainName, domainData) {
    throw new Error("Method not implemented");
  }

  /**
   * Delete a domain from Cloudonix
   * @param {string} domainName - The domain name to delete
   * @returns {Promise<boolean>} True if deletion was successful
   * @throws {Error} If deleting the domain fails
   */
  async deleteDomain(domainName) {
    throw new Error("Method not implemented");
  }

  /**
   * Configure a domain's default application
   * @param {string} domainName - The domain name
   * @param {string} applicationId - The application ID
   * @returns {Promise<Object>} The updated domain configuration
   * @throws {Error} If configuring the default application fails
   */
  async setDomainDefaultApplication(domainName, applicationId) {
    throw new Error("Method not implemented");
  }
}

module.exports = ICloudonixApi;