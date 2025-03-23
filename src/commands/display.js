const chalk = require('chalk');
const { getConfig, getDomainConfig } = require('../utils/config');

function displayCommand(options) {
    const { domain } = options;
    const config = getConfig();

    if (domain) {
        const domainConfig = getDomainConfig(domain);
        if (domainConfig) {
            console.log(chalk.blue.bold(`Configuration for domain: ${domain}`));
            displayDomainConfig(domain, domainConfig);
        } else {
            console.error(chalk.red(`Domain ${domain} not found in configuration.`));
        }
    } else {
        console.log(chalk.blue.bold('All domain configurations:'));
        if (Object.keys(config.domains).length === 0) {
            console.log(chalk.yellow('No domains configured.'));
        } else {
            Object.entries(config.domains).forEach(([domainName, domainConfig]) => {
                displayDomainConfig(domainName, domainConfig);
            });
        }

        displayProviderConfig('VAPI', config.vapi);
        displayProviderConfig('Retell', config.retell);
    }
}

function displayDomainConfig(domainName, domainConfig) {
    console.log(chalk.green.bold(`\nDomain: ${domainName}`));
    console.log(chalk.cyan('API Key:'), domainConfig.apiKey ? '********' : 'Not set');
    console.log(chalk.cyan('Alias:'), domainConfig.alias || 'Not set');
    console.log(chalk.cyan('Auto Alias:'), domainConfig.autoAlias || 'Not set');
    console.log(chalk.cyan('Inbound SIP URI:'), domainConfig.inboundSipUri || 'Not set');
    console.log(chalk.cyan('Tenant:'), domainConfig.tenant || 'Not set');

    const providers = ['VAPI', 'Retell'];
    const phoneNumbers = {};

    providers.forEach(providerName => {
        if (domainConfig[providerName.toLowerCase()]) {
            console.log(chalk.cyan(`${providerName} Trunk Credential ID:`), 
                domainConfig[providerName.toLowerCase()].trunkCredentialId || 'Not set');
            phoneNumbers[providerName] = domainConfig[providerName.toLowerCase()].phoneNumbers;
        }
    });

    displayPhoneNumbers(phoneNumbers);
}

function displayProviderInDomain(providerName, providerConfig) {
    if (providerConfig) {
        console.log(chalk.cyan(`${providerName} Trunk Credential ID:`), providerConfig.trunkCredentialId || 'Not set');
        displayPhoneNumbers(providerName, providerConfig.phoneNumbers);
    }
}

function displayProviderConfig(providerName, providerConfig) {
    console.log(chalk.blue.bold(`\n${providerName} Configuration:`));
    if (providerConfig) {
        console.log(chalk.cyan('API Key:'), providerConfig.apiKey ? '********' : 'Not set');
        console.log(chalk.cyan('API URL:'), providerConfig.apiUrl || 'Not set');
        displayPhoneNumbers({ [providerName]: providerConfig.phoneNumbers });
    } else {
        console.log(chalk.yellow(`No ${providerName} configuration found.`));
    }
}

function displayPhoneNumbers(providerPhoneNumbers) {
    const hasPhoneNumbers = Object.values(providerPhoneNumbers).some(numbers => numbers && Object.keys(numbers).length > 0);

    if (hasPhoneNumbers) {
        console.log(chalk.cyan('Phone Numbers:'));
        Object.entries(providerPhoneNumbers).forEach(([providerName, phoneNumbers]) => {
            if (phoneNumbers && Object.keys(phoneNumbers).length > 0) {
                console.log(chalk.yellow(`    - ${providerName}`));
                Object.entries(phoneNumbers).forEach(([number, config]) => {
                    let sipUri = '';
                    if (providerName === 'VAPI') {
                        sipUri = `sip:${number}@api.vapi.ai`;
                    } else if (providerName === 'Retell') {
                        sipUri = `sip:${number}@5t4n6j0wnrl.sip.livekit.cloud:5060;transport=tcp`;
                    }
                    console.log(chalk.yellow(`        - Number: ${number} (${sipUri})`));
                });
            }
        });
    } else {
        console.log(chalk.cyan('Phone Numbers:'), 'None configured');
    }
}

module.exports = displayCommand;