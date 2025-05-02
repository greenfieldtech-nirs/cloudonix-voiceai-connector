const VapiAgentProvider = require('./VapiAgentProvider');
const RetellAgentProvider = require('./RetellAgentProvider');
const ElevenLabsAgentProvider = require('./11LabsAgentProvider');

/**
 * Factory for creating voice agent provider instances
 */
class VoiceAgentProviderFactory {
  /**
   * Create a voice agent provider instance based on the provider name
   * @param {string} provider - The provider name (e.g., 'vapi', 'retell', '11labs')
   * @param {string} apiKey - The API key for the provider
   * @param {string} apiUrl - Optional custom API URL
   * @returns {IVoiceAgentProvider} An instance of the requested provider
   * @throws {Error} If the provider is not supported
   */
  static createProvider(provider, apiKey, apiUrl) {
    const providerName = provider.toLowerCase();
    
    switch (providerName) {
      case 'vapi':
        return new VapiAgentProvider(apiKey, apiUrl);
      case 'retell':
        return new RetellAgentProvider(apiKey, apiUrl);
      case '11labs':
      case 'elevenlabs':
        return new ElevenLabsAgentProvider(apiKey, apiUrl);
      default:
        throw new Error(`Unsupported voice agent provider: ${provider}`);
    }
  }

  /**
   * Get a list of supported provider names
   * @returns {Array<string>} Array of supported provider names
   */
  static getSupportedProviders() {
    return ['vapi', 'retell', '11labs'];
  }
}

module.exports = VoiceAgentProviderFactory;