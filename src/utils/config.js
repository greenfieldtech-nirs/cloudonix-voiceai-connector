const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');

const CONFIG_DIR = path.join(os.homedir(), '.cx-vcc');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.yaml');

/**
 * Ensure config directory exists
 */
function ensureConfigDirExists() {
  fs.ensureDirSync(CONFIG_DIR);
}

/**
 * Get configuration from file
 */
function getConfig() {
  ensureConfigDirExists();
  
  // Default config structure
  const defaultConfig = {
    domains: {},
    vapi: {
      apiKey: process.env.VAPI_API_KEY || '',
      apiUrl: process.env.VAPI_API_URL || 'https://api.vapi.ai'
    }
  };
  
  // Try to load from config file
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const fileContent = fs.readFileSync(CONFIG_FILE, 'utf8');
      const fileConfig = yaml.load(fileContent) || {};
      return {
        domains: fileConfig.domains || {},
        vapi: { ...defaultConfig.vapi, ...(fileConfig.vapi || {}) }
      };
    }
  } catch (error) {
    console.error('Error reading config file:', error.message);
  }
  
  return defaultConfig;
}

/**
 * Save configuration to file
 */
function saveConfig(config) {
  ensureConfigDirExists();
  const yamlContent = yaml.dump(config, { indent: 2 });
  fs.writeFileSync(CONFIG_FILE, yamlContent, 'utf8');
}

/**
 * Add or update domain configuration
 * @param {string} domainName - The domain name
 * @param {Object} domainConfig - The domain configuration
 */
function saveDomainConfig(domainName, domainConfig) {
  const config = getConfig();
  
  if (!config.domains) {
    config.domains = {};
  }
  
  config.domains[domainName] = domainConfig;
  
  saveConfig(config);
}
/**
 * Delete domain configuration
 * @param {string} domainName - The domain name to delete
 * @returns {boolean} True if deleted, false if not found
 */
function deleteDomainConfig(domainName) {
  const config = getConfig();
  
  if (!config.domains || !config.domains[domainName]) {
    return false;
  }
  
  delete config.domains[domainName];
  saveConfig(config);
  return true;
}

/**
 * Get configuration for a specific domain
 * @param {string} domainName - The domain name
 * @returns {Object|null} - Domain configuration or null if not found
 */
function getDomainConfig(domainName) {
  const config = getConfig();
  return config.domains[domainName] || null;
}

/**
 * Get list of available domains
 * @returns {Array} List of domain names
 */
function getAvailableDomains() {
  const config = getConfig();
  return Object.keys(config.domains || {});
}

module.exports = {
  getConfig,
  saveConfig,
  saveDomainConfig,
  deleteDomainConfig,
  getDomainConfig,
  getAvailableDomains
};
