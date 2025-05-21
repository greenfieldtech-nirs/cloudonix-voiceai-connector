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

function getProviderConfig(providerName) {
  const key = aliasMap[providerName.toLowerCase()] || providerName.toLowerCase();
  const entry = registry[key];
  if (!entry) {
    throw new Error(`Unsupported provider: ${providerName}`);
  }
  return entry;
}

function getSupportedProviders() {
  return Object.keys(registry);
}

module.exports = {
  getProviderConfig,
  getSupportedProviders,
};