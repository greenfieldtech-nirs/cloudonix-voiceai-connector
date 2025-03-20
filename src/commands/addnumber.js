const chalk = require('chalk');
const ora = require('ora');
const { getConfig, saveConfig, getDomainConfig } = require('../utils/config');
const VapiApiService = require('../services/vapiApi');

/**
 * Add a phone number to a Voice AI provider
 * @param {Object} options - Command options
 * @param {string} options.domain - Cloudonix domain to use
 * @param {string} options.provider - Service provider name
 * @param {string} options.number - Phone number to add (E.164 format)
 * @param {string} options.assistant - Assistant ID to associate with the number
 */
async function addNumberCommand(options) {
  const { domain, provider, number, assistant } = options;
  
  // Validate provider
  if (provider.toLowerCase() !== 'vapi') {
    console.error(chalk.red(`Unsupported provider: ${provider}`));
    console.log(chalk.yellow('Currently supported providers: vapi'));
    process.exit(1);
  }
  
  // Validate phone number format (E.164)
  if (!number.match(/^\+[1-9]\d{1,14}$/)) {
    console.error(chalk.red('Phone number must be in E.164 format (e.g., +12025551234)'));
    process.exit(1);
  }
  
  // Get the config
  const config = getConfig();
  
  // Check if the provider is configured
  if (!config.vapi || !config.vapi.apiKey) {
    console.error(chalk.red(`${provider.toUpperCase()} is not configured yet.`));
    console.log(chalk.yellow(`First configure the provider: cx-vcc service --provider ${provider} --apikey YOUR_API_KEY`));
    process.exit(1);
  }
  
  // Check if the domain exists
  const domainConfig = getDomainConfig(domain);
  if (!domainConfig) {
    console.error(chalk.red(`Domain ${domain} not found in configuration.`));
    console.log(chalk.yellow(`Configure the domain first: cx-vcc configure --domain ${domain} --apikey YOUR_CLOUDONIX_API_KEY`));
    process.exit(1);
  }
  
  // Check if the domain has a VAPI trunk credential
  if (!domainConfig.vapi || !domainConfig.vapi.trunkCredentialId) {
    console.error(chalk.red(`No VAPI SIP trunk found for domain ${domain}.`));
    console.log(chalk.yellow(`First create a SIP trunk: cx-vcc service --provider vapi --apikey YOUR_VAPI_API_KEY --name "My SIP Trunk" --domain ${domain}`));
    process.exit(1);
  }
  
  const credentialId = domainConfig.vapi.trunkCredentialId;
  const spinner = ora(`Adding phone number ${number} to ${provider.toUpperCase()}...`).start();
  
  try {
    // Create API service
    const vapiApi = new VapiApiService(config.vapi.apiKey);
    
    // First, add the phone number to the SIP trunk
    spinner.text = `Adding phone number ${number} to SIP trunk...`;
    const numberName = `Cloudonix SIP Number (${domain})`;
    
    const phoneNumberResult = await vapiApi.addByoPhoneNumber(
      numberName,
      number,
      credentialId
    );
    
    spinner.succeed(chalk.green(`Phone number ${number} added successfully to SIP trunk`));
    
    // Now, associate the phone number with the assistant
    spinner.text = `Assigning phone number to assistant ${assistant}...`;
    spinner.start();
    
    // Create the SIP URI for the assistant
    const sipUri = `sip:${number}@sip.vapi.ai`;
    const assistantResult = await vapiApi.addNumberToAssistant(sipUri, assistant);
    
    spinner.succeed(chalk.green(`Phone number ${number} assigned successfully to assistant ${assistant}`));
    
    // Display the results
    console.log('\nPhone Number Details:');
    console.log(chalk.cyan('Number ID:'), chalk.yellow(phoneNumberResult.id));
    console.log(chalk.cyan('Number:'), chalk.yellow(number));
    console.log(chalk.cyan('SIP Trunk ID:'), chalk.yellow(credentialId));
    console.log(chalk.cyan('Assistant ID:'), chalk.yellow(assistant));
    
    // Store the number in the domain configuration
    if (!domainConfig.vapi.phoneNumbers) {
      domainConfig.vapi.phoneNumbers = [];
    }
    
    domainConfig.vapi.phoneNumbers.push({
      id: phoneNumberResult.id,
      number: number,
      credentialId: credentialId,
      assistantId: assistant
    });
    
    config.domains[domain] = domainConfig;
    saveConfig(config);
    
    console.log(chalk.green(`\nPhone number details saved to domain configuration`));
    
  } catch (error) {
    spinner.fail(chalk.red(`Failed to add phone number: ${error.message}`));
    process.exit(1);
  }
}

module.exports = addNumberCommand;
