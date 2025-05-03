const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const {getConfig, saveConfig, getAvailableDomains, getDomainConfig} = require('../utils/config');
const VapiApiService = require('../services/vapiApi');
const RetellApiService = require('../services/retellApi');
const ElevenLabsAgentProvider = require('../services/11LabsAgentProvider');

async function configureServiceProvider(options, ApiService, configKey) {
    const {provider, apikey, name, domain} = options;
    const config = getConfig();
    let spinner = ora(`Verifying ${provider} API key...`).start();

    try {
        const apiService = new ApiService(apikey);
        await apiService.verifyApiKey();

        config[configKey] = {
            ...config[configKey],
            apiKey: apikey,
            apiUrl: apiService.baseUrl
        };

        saveConfig(config);

        spinner.succeed(chalk.green(`${provider.toUpperCase()} API key configured successfully`));

        console.log(chalk.cyan('API Key:'), chalk.yellow('*'.repeat(apikey.length)));
        // Only show API URL for providers that don't use official SDK
        if (provider.toLowerCase() !== '11labs' && provider.toLowerCase() !== 'elevenlabs') {
            console.log(chalk.cyan('API URL:'), chalk.yellow(config[configKey].apiUrl));
        }

        // Only setup SIP trunk if both name and domain are provided
        if (name && domain) {
            await setupSipTrunk(apiService, name, domain, spinner, provider, configKey);
        } else if (name && !domain) {
            console.log(chalk.yellow(`\nTo create a SIP trunk, you must also specify a domain with --domain`));
        }
    } catch (error) {
        spinner.fail(chalk.red(`Failed to configure ${provider} API key: ${error.message}`));
        process.exit(1);
    }
}

async function setupSipTrunk(apiService, name, domain, spinner, provider, configKey) {
    const {selectedDomain, domainConfig} = await selectDomain(domain, spinner);

    spinner.text = `Creating SIP trunk connection for ${selectedDomain}...`;
    spinner.start();

    try {
        let trunkResult;
        trunkResult = await apiService.verifyApiKey();

        if (provider.toLowerCase() === 'vapi') {
            trunkResult = await apiService.createSipTrunkConnection(name, domainConfig.inboundSipUri);
        } else if (provider.toLowerCase() === 'retell') {
            trunkResult = {
                'id': 'Not required',
                'name': name,
                'provider': provider,
                'inboundSipUri': 'Not required',
                'status': 'active'
            };
        } else if (provider.toLowerCase() === '11labs' || provider.toLowerCase() === 'elevenlabs') {
            trunkResult = await apiService.createSipTrunkConnection(name, domainConfig.inboundSipUri);
        } else {
            console.log(chalk.yellowBright(`\nYou specified an unsupported provider: ${provider} or no provider was specified.`));
            process.exit(1);
        }

        spinner.succeed(chalk.green(`SIP trunk "${name}" created successfully for domain ${selectedDomain}`));

        displayTrunkDetails(trunkResult, domainConfig);

        if (!domainConfig[configKey]) {
            domainConfig[configKey] = {};
        }

        domainConfig[configKey].trunkCredentialId = trunkResult.id;
        const config = getConfig();
        config.domains[selectedDomain] = domainConfig;
        saveConfig(config);

        console.log(chalk.green(`\nCredential ID ${trunkResult.id} saved to domain configuration`));
    } catch (error) {
        spinner.fail(chalk.red(`Failed to create SIP trunk: ${error.message}`));
        process.exit(1);
    }
}

async function selectDomain(specifiedDomain, spinner) {
    let selectedDomain = specifiedDomain;
    let domainConfig = null;

    if (!selectedDomain) {
        const availableDomains = getAvailableDomains();

        if (availableDomains.length === 0) {
            console.error(chalk.red('No Cloudonix domains configured. Please configure a domain first:'));
            console.log(chalk.yellow('cx-vcc configure --domain <domain> --apikey <apikey>'));
            process.exit(1);
        }

        if (availableDomains.length === 1) {
            selectedDomain = availableDomains[0];
        } else {
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
            spinner = ora();
        }
    }

    domainConfig = getDomainConfig(selectedDomain);

    if (!domainConfig) {
        console.error(chalk.red(`Domain ${selectedDomain} not found in configuration.`));
        console.log(chalk.yellow(`Use 'cx-vcc configure --domain ${selectedDomain} --apikey YOUR_API_KEY' to add it.`));
        process.exit(1);
    }

    if (!domainConfig.inboundSipUri) {
        console.error(chalk.red(`Domain ${selectedDomain} does not have an inbound SIP URI configured.`));
        console.log(chalk.yellow(`Please reconfigure the domain: 'cx-vcc configure --domain ${selectedDomain} --apikey YOUR_API_KEY'`));
        process.exit(1);
    }

    return {selectedDomain, domainConfig};
}

function displayTrunkDetails(trunkResult, domainConfig) {
    console.log('\nSIP Trunk Details:');
    console.log(chalk.cyan('Credential ID:'), chalk.yellow(trunkResult.id));
    console.log(chalk.cyan('Name:'), chalk.yellow(trunkResult.name));
    console.log(chalk.cyan('Provider:'), chalk.yellow(trunkResult.provider));
    console.log(chalk.cyan('Gateway IP:'), chalk.yellow(domainConfig.inboundSipUri));
    console.log(chalk.cyan('Status:'), chalk.yellow(trunkResult.status || 'active'));
}

async function serviceCommand(options) {
    const {provider, apikey} = options;

    if (!apikey) {
        console.error(chalk.red('API key is required for configuring a service provider'));
        process.exit(1);
    }

    switch (provider.toLowerCase()) {
        case 'vapi':
            await configureServiceProvider(options, VapiApiService, 'vapi');
            break;
        case 'retell':
            await configureServiceProvider(options, RetellApiService, 'retell');
            break;
        case '11labs':
        case 'elevenlabs':
            await configureServiceProvider(options, ElevenLabsAgentProvider, 'elevenlabs');
            break;
        default:
            console.error(chalk.red(`Unsupported provider: ${provider}`));
            console.log(chalk.yellow('Currently supported providers: vapi, retell, 11labs'));
            process.exit(1);
    }
}

module.exports = serviceCommand;