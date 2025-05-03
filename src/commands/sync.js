const chalk = require('chalk');
const ora = require('ora');
const { getConfig, saveConfig } = require('../utils/config');
const VapiApiService = require('../services/vapiApi');
const RetellApiService = require('../services/retellApi');
const ElevenLabsAgentProvider = require('../services/11LabsAgentProvider');

/**
 * Sync command to synchronize local configuration with remote service providers
 * @param {Object} options - Command options
 */
async function syncCommand(options) {
    console.log(chalk.blue.bold('Synchronizing local configuration with remote service providers...'));
    const config = getConfig();
    
    // Keep track of changes
    let totalChanges = 0;
    
    // Sync VAPI configuration
    if (config.vapi && config.vapi.apiKey) {
        const changes = await syncProviderNumbers('VAPI', config.vapi, async () => {
            const vapiService = new VapiApiService(config.vapi.apiKey, config.vapi.apiUrl);
            return await vapiService.getPhoneNumbers();
        });
        totalChanges += changes;
    } else {
        console.log(chalk.yellow('VAPI not configured, skipping...'));
    }
    
    // Sync Retell configuration
    if (config.retell && config.retell.apiKey) {
        const changes = await syncProviderNumbers('Retell', config.retell, async () => {
            const retellService = new RetellApiService(config.retell.apiKey, config.retell.apiUrl);
            return await retellService.getPhoneNumbers();
        });
        totalChanges += changes;
    } else {
        console.log(chalk.yellow('Retell not configured, skipping...'));
    }
    
    // Sync 11Labs configuration
    if (config.elevenlabs && config.elevenlabs.apiKey) {
        const changes = await syncProviderNumbers('11Labs', config.elevenlabs, async () => {
            const elevenLabsProvider = new ElevenLabsAgentProvider(config.elevenlabs.apiKey, config.elevenlabs.apiUrl);
            return await elevenLabsProvider.getPhoneNumbers();
        });
        totalChanges += changes;
    } else {
        console.log(chalk.yellow('11Labs not configured, skipping...'));
    }
    
    if (totalChanges > 0) {
        console.log(chalk.green(`Sync complete. ${totalChanges} phone numbers removed from local configuration.`));
    } else {
        console.log(chalk.green('Sync complete. Local configuration is already in sync with remote services.'));
    }
}

/**
 * Synchronize provider phone numbers
 * @param {string} providerName - The provider name (VAPI, Retell, 11Labs)
 * @param {Object} providerConfig - The provider configuration
 * @param {Function} fetchRemoteNumbers - Function to fetch remote phone numbers
 * @returns {number} Number of changes made
 */
async function syncProviderNumbers(providerName, providerConfig, fetchRemoteNumbers) {
    console.log(chalk.bold(`\nSynchronizing ${providerName} phone numbers...`));
    
    // Skip if no phone numbers in config
    if (!providerConfig.phoneNumbers || Object.keys(providerConfig.phoneNumbers).length === 0) {
        console.log(chalk.yellow(`No ${providerName} phone numbers in local configuration.`));
        return 0;
    }
    
    // Get local phone numbers
    const localPhoneNumbers = Object.keys(providerConfig.phoneNumbers);
    console.log(chalk.cyan(`Found ${localPhoneNumbers.length} ${providerName} phone numbers in local configuration:`));
    localPhoneNumbers.forEach(number => {
        console.log(chalk.cyan(`  - ${number}`));
    });
    
    // Fetch remote phone numbers
    const spinner = ora(`Fetching remote ${providerName} phone numbers...`).start();
    let remotePhoneNumbers = [];
    
    try {
        const remoteData = await fetchRemoteNumbers();
        
        if (Array.isArray(remoteData)) {
            // Extract phone numbers based on provider format
            if (providerName === 'VAPI') {
                remotePhoneNumbers = remoteData
                    .filter(item => item.provider === 'byo-phone-number')
                    .map(item => item.number);
            } else if (providerName === 'Retell') {
                remotePhoneNumbers = remoteData
                    .map(item => item.phone_number || item.phoneNumber || '');
            } else if (providerName === '11Labs') {
                remotePhoneNumbers = remoteData
                    .map(item => item.phone_number || item.phoneNumber || item.number || '');
            }
            
            // Filter out empty values
            remotePhoneNumbers = remotePhoneNumbers.filter(num => num);
        }
        
        spinner.succeed(`Found ${remotePhoneNumbers.length} ${providerName} phone numbers in remote service.`);
        remotePhoneNumbers.forEach(number => {
            console.log(chalk.green(`  - ${number}`));
        });
    } catch (error) {
        spinner.fail(`Failed to fetch remote ${providerName} phone numbers: ${error.message}`);
        console.error(chalk.red(`Error details: ${error.stack}`));
        return 0;
    }
    
    // Find numbers that exist locally but not remotely
    const numbersToRemove = localPhoneNumbers.filter(number => !remotePhoneNumbers.includes(number));
    
    if (numbersToRemove.length === 0) {
        console.log(chalk.green(`All ${providerName} phone numbers are in sync.`));
        return 0;
    }
    
    console.log(chalk.yellow(`Found ${numbersToRemove.length} ${providerName} phone numbers to remove from local configuration:`));
    numbersToRemove.forEach(number => {
        console.log(chalk.yellow(`  - ${number}`));
    });
    
    // Remove numbers from local configuration
    const config = getConfig();
    let configKey = providerName.toLowerCase();
    if (configKey === '11labs') {
        configKey = 'elevenlabs';
    }
    
    numbersToRemove.forEach(number => {
        delete config[configKey].phoneNumbers[number];
    });
    
    // Save updated configuration
    saveConfig(config);
    console.log(chalk.green(`Removed ${numbersToRemove.length} ${providerName} phone numbers from local configuration.`));
    
    return numbersToRemove.length;
}

module.exports = syncCommand;