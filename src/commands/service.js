const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const { getConfig, saveConfig, getAvailableDomains, getDomainConfig } = require('../utils/config');
const VapiApiService = require('../services/vapiApi');

/**
 * Configure a service provider
 * @param {Object} options - Command options
 * @param {string} options.provider - Service provider name
 * @param {string} options.apikey - API key for the provider
 * @param {string} options.name - Name for the SIP trunk (optional)
 * @param {string} options.domain - Cloudonix domain to use for SIP trunk (optional)
 */
async function serviceCommand(options) {
  const { provider, apikey, name, domain } = options;
  
  // Currently we only support VAPI
  if (provider.toLowerCase() !== 'vapi') {
    console.error(chalk.red(`Unsupported provider: ${provider}`));
    console.log(chalk.yellow('Currently supported providers: vapi'));
    process.exit(1);
  }
  
  if (!apikey) {
    console.error(chalk.red('API key is required for configuring a service provider'));
    process.exit(1);
  }
  
  // Get current config
  const config = getConfig();
  
  // Spinner for visual feedback
  let spinner = ora(`Verifying ${provider} API key...`).start();
  
  try {
    // Create API service and verify the key
    const vapiApi = new VapiApiService(apikey);
    await vapiApi.verifyApiKey();
    
    // Update configuration
    config.vapi = {
      ...config.vapi,
      apiKey: apikey
    };
    
    // Save updated config
    saveConfig(config);
    
    spinner.succeed(chalk.green(`${provider.toUpperCase()} API key configured successfully`));
    
    // If name is provided, try to create a SIP trunk connection
    if (name) {
      // We need a domain with inboundSipUri to create a SIP trunk
      let selectedDomain = domain;
      let domainConfig = null;
      
      if (!selectedDomain) {
        // If no domain is specified, check if we have any configured domains
        const availableDomains = getAvailableDomains();
        
        if (availableDomains.length === 0) {
          console.error(chalk.red('No Cloudonix domains configured. Please configure a domain first:'));
          console.log(chalk.yellow('cx-vcc configure --domain <domain> --apikey <apikey>'));
          process.exit(1);
        }
        
        // If we have only one domain, use it
        if (availableDomains.length === 1) {
          selectedDomain = availableDomains[0];
          domainConfig = getDomainConfig(selectedDomain);
        } else {
          // If we have multiple domains, ask the user to select one
          spinner.stop();
          const domainSelection = await inquirer.prompt([
            {
              type: 'list',
              name: 'domain',
              message: 'Select a Cloudonix domain to use for the SIP trunk:',
              choices: availableDomains
            }
          ]);
          selectedDomain = domainSelection.domain;
          domainConfig = getDomainConfig(selectedDomain);
          spinner = ora();
        }
      } else {
        // Use the specified domain
        domainConfig = getDomainConfig(selectedDomain);
        
        if (!domainConfig) {
          console.error(chalk.red(`Domain ${selectedDomain} not found in configuration.`));
          console.log(chalk.yellow(`Use 'cx-vcc configure --domain ${selectedDomain} --apikey YOUR_API_KEY' to add it.`));
          process.exit(1);
        }
      }
      
      // Check if the domain has an inbound SIP URI
      if (!domainConfig.inboundSipUri) {
        console.error(chalk.red(`Domain ${selectedDomain} does not have an inbound SIP URI configured.`));
        console.log(chalk.yellow(`Please reconfigure the domain: 'cx-vcc configure --domain ${selectedDomain} --apikey YOUR_API_KEY'`));
        process.exit(1);
      }
      
      // Create SIP trunk connection with VAPI
      spinner.text = `Creating SIP trunk connection for ${selectedDomain}...`;
      spinner.start();
      
      const trunkResult = await vapiApi.createSipTrunkConnection(name, domainConfig.inboundSipUri);
      
      spinner.succeed(chalk.green(`SIP trunk "${name}" created successfully for domain ${selectedDomain}`));
      
      // Display the credential details
      console.log('\nSIP Trunk Details:');
      console.log(chalk.cyan('Credential ID:'), chalk.yellow(trunkResult.id));
      console.log(chalk.cyan('Name:'), chalk.yellow(trunkResult.name));
      console.log(chalk.cyan('Provider:'), chalk.yellow(trunkResult.provider));
      console.log(chalk.cyan('Gateway IP:'), chalk.yellow(domainConfig.inboundSipUri));
      console.log(chalk.cyan('Status:'), chalk.yellow(trunkResult.status || 'active'));
      
      // Store the trunk ID in the domain configuration under the vapi section
      if (!domainConfig.vapi) {
        domainConfig.vapi = {};
      }
      
      domainConfig.vapi.trunkCredentialId = trunkResult.id;
      config.domains[selectedDomain] = domainConfig;
      saveConfig(config);
      
      console.log(chalk.green(`\nCredential ID ${trunkResult.id} saved to domain configuration`));
    }
    
  } catch (error) {
    spinner.fail(chalk.red(`Failed to configure ${provider} API key: ${error.message}`));
    process.exit(1);
  }
}

module.exports = serviceCommand;
