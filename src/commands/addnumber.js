const chalk = require('chalk');
const ora = require('ora');
const { getConfig, saveConfig, getDomainConfig } = require('../utils/config');
const VapiApiService = require('../services/vapiApi');
const RetellApiService = require('../services/retellApi');
const ElevenLabsAgentProvider = require('../services/11LabsAgentProvider');

async function addNumberCommand(options) {
    const { domain, provider, number, assistant } = options;
    const config = getConfig();
    const domainConfig = getDomainConfig(domain);

    if (!domainConfig) {
        console.error(chalk.red(`Domain ${domain} not found in configuration.`));
        process.exit(1);
    }

    let apiService;
    let providerConfig;

    switch (provider.toLowerCase()) {
        case 'vapi':
            apiService = new VapiApiService(config.vapi.apiKey);
            providerConfig = config.vapi;
            break;
        case 'retell':
            apiService = new RetellApiService(config.retell.apiKey);
            providerConfig = config.retell;
            break;
        case '11labs':
        case 'elevenlabs':
            apiService = new ElevenLabsAgentProvider(config.elevenlabs.apiKey, config.elevenlabs.apiUrl);
            providerConfig = config.elevenlabs;
            break;
        default:
            console.error(chalk.red(`Unsupported provider: ${provider}`));
            console.log(chalk.yellow('Currently supported providers: vapi, retell, 11labs'));
            process.exit(1);
    }

    const spinner = ora(`Adding phone number ${number} to ${provider}...`).start();

    try {
        let result;
        if (provider.toLowerCase() === 'vapi') {
            result = await apiService.addByoPhoneNumber(domain, number, domainConfig.vapi.trunkCredentialId);
        } else if (provider.toLowerCase() === 'retell') {
            result = await apiService.importPhoneNumber(number, domain);
        } else if (provider.toLowerCase() === '11labs' || provider.toLowerCase() === 'elevenlabs') {
            // Verify the domain has an inbound SIP URI configured
            if (!domainConfig.inboundSipUri) {
                throw new Error(`No inbound SIP URI found for domain ${domain}. Please configure it first.`);
            }
            // Use the domain name as the number name for consistency
            result = await apiService.addPhoneNumber(domain, number, domain);
        }

        spinner.succeed(chalk.green(`Phone number ${number} added successfully to ${provider}`));

        // Store the phone number information in the configuration
        if (!domainConfig[provider.toLowerCase()]) {
            domainConfig[provider.toLowerCase()] = {};
        }
        if (!domainConfig[provider.toLowerCase()].phoneNumbers) {
            domainConfig[provider.toLowerCase()].phoneNumbers = {};
        }

        let sipUri = '';
        let phoneNumberId = '';
        if (provider.toLowerCase() === 'vapi') {
            sipUri = result.sipUri;
            phoneNumberId = result.id;
        } else if (provider.toLowerCase() === 'retell') {
            sipUri = `sip:${number}@5t4n6j0wnrl.sip.livekit.cloud:5060;transport=tcp`;
            phoneNumberId = result.last_modification_timestamp;
        } else if (provider.toLowerCase() === '11labs' || provider.toLowerCase() === 'elevenlabs') {
            // Get the SIP URI from the result if available, otherwise construct a default one
            sipUri = result.termination_uri || result.sip_uri || 
                     `sip:${number.startsWith('+') ? number.substring(1) : number}@sip.rtc.elevenlabs.io:5060;transport=tcp`;
            phoneNumberId = result.id || result.phone_number_id;
        }

        domainConfig[provider.toLowerCase()].phoneNumbers[number] = {
            id: phoneNumberId,
            sipUri: sipUri
        };

        // Save the updated configuration
        config.domains[domain] = domainConfig;
        saveConfig(config);

        console.log(chalk.cyan('Phone Number Details:'));
        console.log(chalk.cyan('Number:'), chalk.yellow(number));
        console.log(chalk.cyan('SIP URI:'), chalk.yellow(domainConfig[provider.toLowerCase()].phoneNumbers[number].sipUri));
        console.log(chalk.cyan('ID:'), chalk.yellow(phoneNumberId));

    } catch (error) {
        spinner.fail(chalk.red(`Failed to add phone number: ${error.message}`));
        process.exit(1);
    }
}

module.exports = addNumberCommand;