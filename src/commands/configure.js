const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const { saveDomainConfig, getDomainConfig, getAvailableDomains } = require('../utils/config');
const CloudonixApiService = require('../services/cloudonixApi');

/**
 * Configure a new Cloudonix domain
 * @param {Object} options - Command options
 * @param {string} options.domain - Domain name
 * @param {string} options.apikey - API key (optional)
 */
async function configureCommand(options) {
  const { domain, apikey } = options;
  
  // Check if domain already exists in config
  const existingConfig = getDomainConfig(domain);
  
  // Handle delete case
  if (!apikey) {
    // If no apikey provided, check if we're removing the domain
    if (existingConfig) {
      console.log(chalk.yellow(`Domain ${domain} already exists in configuration.`));
      console.log(chalk.yellow(`Use 'cx-vcc delete --domain ${domain}' to remove it.`));
    } else {
      console.error(chalk.red(`Domain ${domain} not found in configuration.`));
      console.log(chalk.yellow(`Use 'cx-vcc configure --domain ${domain} --apikey YOUR_API_KEY' to add it.`));
    }
    
    // Show available domains
    const domains = getAvailableDomains();
    if (domains.length > 0) {
      console.log(chalk.blue('\nAvailable domains:'));
      domains.forEach(d => {
        console.log(`- ${d}`);
      });
    }
    
    return;
  }
  
  if (existingConfig) {
    console.log(chalk.yellow(`Domain ${domain} already exists in configuration.`));
    console.log(chalk.yellow(`Updating configuration with the new API key.`));
  }
  
  // Create API service with provided key
  const cloudonixApi = new CloudonixApiService(apikey);
  
  // Spinner for visual feedback
  const spinner = ora(`Verifying domain ${domain} with Cloudonix API...`).start();
  
  try {
    // Get domain details from Cloudonix API
    const domainDetails = await cloudonixApi.getDomainDetails(domain);
    
    // Try to find an auto alias in the aliases array
    let autoAlias = domain;
    let inboundSipUri = '';
    
    if (domainDetails.aliases && Array.isArray(domainDetails.aliases)) {
      // Find the alias with type 'auto'
      const autoAliasObj = domainDetails.aliases.find(alias => alias.type === 'auto');
      if (autoAliasObj && autoAliasObj.alias) {
        autoAlias = autoAliasObj.alias;
        // Create the inbound SIP URI by concatenating the alias with .sip.cloudonix.net
        inboundSipUri = `${autoAlias}.sip.cloudonix.net`;
      }
    }
    
    // Extract the domain alias (legacy support)
    const domainAlias = domainDetails.alias || autoAlias;
    
    // Create domain configuration
    const domainConfig = {
      apiKey: apikey,
      alias: domainAlias,
      autoAlias: autoAlias,
      inboundSipUri: inboundSipUri,
      tenant: 'self' // Always set tenant to 'self'
    };
    
    // Save to config file
    saveDomainConfig(domain, domainConfig);
    
    // Prepare success message
    let successMessage = `Domain ${domain} configured successfully`;
    if (inboundSipUri) {
      successMessage += ` with inbound SIP URI: ${inboundSipUri}`;
    } else {
      successMessage += ` with alias: ${domainAlias}`;
    }
    
    spinner.succeed(chalk.green(successMessage));
    
  } catch (error) {
    spinner.fail(chalk.red(`Failed to configure domain ${domain}: ${error.message}`));
    process.exit(1);
  }
}

module.exports = configureCommand;
