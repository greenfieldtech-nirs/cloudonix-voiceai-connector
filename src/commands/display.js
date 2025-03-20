const chalk = require('chalk');
const { getConfig, getDomainConfig } = require('../utils/config');

/**
 * Display configuration information
 * @param {Object} options - Command options
 * @param {string} options.domain - Specific domain to display (optional)
 */
function displayCommand(options) {
    const { domain } = options;
    const config = getConfig();

    if (domain) {
        // Display specific domain configuration
        const domainConfig = getDomainConfig(domain);
        if (domainConfig) {
            console.log(chalk.blue.bold(`Configuration for domain: ${domain}`));
            displayDomainConfig(domain, domainConfig);
        } else {
            console.error(chalk.red(`Domain ${domain} not found in configuration.`));
        }
    } else {
        // Display all domain configurations
        console.log(chalk.blue.bold('All domain configurations:'));
        if (Object.keys(config.domains).length === 0) {
            console.log(chalk.yellow('No domains configured.'));
        } else {
            Object.entries(config.domains).forEach(([domainName, domainConfig]) => {
                displayDomainConfig(domainName, domainConfig);
            });
        }

        // Display VAPI configuration
        console.log(chalk.blue.bold('\nVAPI Configuration:'));
        console.log(chalk.cyan('API Key:'), config.vapi.apiKey ? '********' : 'Not set');
        console.log(chalk.cyan('API URL:'), config.vapi.apiUrl);
    }
}

/**
 * Display a single domain configuration
 * @param {string} domainName - Name of the domain
 * @param {Object} domainConfig - Configuration for the domain
 */
function displayDomainConfig(domainName, domainConfig) {
    console.log(chalk.green.bold(`\nDomain: ${domainName}`));
    console.log(chalk.cyan('API Key:'), domainConfig.apiKey ? '********' : 'Not set');
    console.log(chalk.cyan('Alias:'), domainConfig.alias || 'Not set');
    console.log(chalk.cyan('Auto Alias:'), domainConfig.autoAlias || 'Not set');
    console.log(chalk.cyan('Inbound SIP URI:'), domainConfig.inboundSipUri || 'Not set');
    console.log(chalk.cyan('Tenant:'), domainConfig.tenant || 'Not set');

    if (domainConfig.vapi) {
        console.log(chalk.cyan('VAPI Trunk Credential ID:'), domainConfig.vapi.trunkCredentialId || 'Not set');
        if (domainConfig.vapi.phoneNumbers && domainConfig.vapi.phoneNumbers.length > 0) {
            console.log(chalk.cyan('Phone Numbers:'));
            domainConfig.vapi.phoneNumbers.forEach(phone => {
                console.log(chalk.yellow(`  - Number: ${phone.number}`));
                console.log(chalk.yellow(`    ID: ${phone.id}`));
                console.log(chalk.yellow(`    Credential ID: ${phone.credentialId}`));
                console.log(chalk.yellow(`    Assistant ID: ${phone.assistantId}`));
            });
        } else {
            console.log(chalk.cyan('Phone Numbers:'), 'None configured');
        }
    }
}

module.exports = displayCommand;