const VapiApiService = require('./vapiApi');
const RetellApiService = require('./retellApi');
const ElevenLabsAgentProvider = require('./ElevenLabsAgentProvider');

const registry = {
  vapi: { Service: VapiApiService, configKey: 'vapi' },
  retell: { Service: RetellApiService, configKey: 'retell' },
  elevenlabs: { Service: ElevenLabsAgentProvider, configKey: 'elevenlabs' },
};

const aliasMap = {
  '11labs': 'elevenlabs',
};

/**
 * Retrieve provider configuration (service class and config key) by provider name.
 * @param {string} providerName - The name or alias of the provider (e.g., 'vapi', 'retell', '11labs').
 * @returns {{Service: class, configKey: string}}
 * @throws {Error} If the provider is not supported.
 */
function getProviderConfig(providerName) {
  const key = aliasMap[providerName.toLowerCase()] || providerName.toLowerCase();
  const entry = registry[key];
  if (!entry) {
    throw new Error(`Unsupported provider: ${providerName}`);
  }
  return entry;
}

/**
 * Get a list of supported provider keys.
 * @returns {string[]}
 */
function getSupportedProviders() {
  return Object.keys(registry);
}

module.exports = {
  getProviderConfig,
  getSupportedProviders,
};