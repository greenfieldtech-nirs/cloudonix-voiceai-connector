const chalk = require('chalk');
const ora = require('ora');
const { getConfig, saveConfig } = require('../utils/config');
const VapiApiService = require('../services/vapiApi');
const RetellApiService = require('../services/retellApi');
const ElevenLabsAgentProvider = require('../services/ElevenLabsAgentProvider');

/**
 * Sync command to synchronize local configuration with remote service providers
 * @param {Object} options - Command options
 */
async function syncCommand(options) {
    const { domain, provider } = options;
    
    // Show sync scope based on options
    let displayProvider = provider;
    if (provider && (provider.toLowerCase() === '11labs' || provider.toLowerCase() === 'elevenlabs')) {
        displayProvider = '11Labs (ElevenLabs)';
    }
    
    if (domain && provider) {
        console.log(chalk.blue.bold(`Synchronizing ${displayProvider} configuration for domain ${domain}...`));
    } else if (domain) {
        console.log(chalk.blue.bold(`Synchronizing all providers for domain ${domain}...`));
    } else if (provider) {
        console.log(chalk.blue.bold(`Synchronizing ${displayProvider} configuration for all domains...`));
    } else {
        console.log(chalk.blue.bold('Synchronizing local configuration with all remote service providers...'));
    }
    
    const config = getConfig();
    
    // Keep track of changes
    let totalChanges = 0;
    
    // Helper function to check if a provider should be synced
    const shouldSyncProvider = (providerName) => {
        if (!provider) return true;
        return provider.toLowerCase() === providerName.toLowerCase();
    };
    
    // Sync VAPI configuration
    if (shouldSyncProvider('vapi') && config.vapi && config.vapi.apiKey) {
        const changes = await syncProviderNumbers('VAPI', config.vapi, async () => {
            const vapiService = new VapiApiService(config.vapi.apiKey, config.vapi.apiUrl);
            return await vapiService.getPhoneNumbers();
        }, domain);
        totalChanges += changes;
    } else if (shouldSyncProvider('vapi')) {
        console.log(chalk.yellow('VAPI not configured, skipping...'));
    }
    
    // Sync Retell configuration
    if (shouldSyncProvider('retell') && config.retell && config.retell.apiKey) {
        const changes = await syncProviderNumbers('Retell', config.retell, async () => {
            const retellService = new RetellApiService(config.retell.apiKey, config.retell.apiUrl);
            return await retellService.getPhoneNumbers();
        }, domain);
        totalChanges += changes;
    } else if (shouldSyncProvider('retell')) {
        console.log(chalk.yellow('Retell not configured, skipping...'));
    }
    
    // Sync 11Labs configuration
    if ((shouldSyncProvider('11labs') || shouldSyncProvider('elevenlabs')) && 
        config.elevenlabs && config.elevenlabs.apiKey) {
        const changes = await syncProviderNumbers('11Labs', config.elevenlabs, async () => {
            const elevenLabsProvider = new ElevenLabsAgentProvider(config.elevenlabs.apiKey, config.elevenlabs.apiUrl);
            return await elevenLabsProvider.getPhoneNumbers();
        }, domain);
        totalChanges += changes;
    } else if (shouldSyncProvider('11labs') || shouldSyncProvider('elevenlabs')) {
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
 * @param {string} domainFilter - Optional domain to filter by
 * @returns {number} Number of changes made
 */
async function syncProviderNumbers(providerName, providerConfig, fetchRemoteNumbers, domainFilter) {
    console.log(chalk.bold(`\nSynchronizing ${providerName} phone numbers${domainFilter ? ` for domain ${domainFilter}` : ''}...`));
    
    // Get all domains from configuration
    const config = getConfig();
    const allDomains = Object.keys(config.domains || {});
    
    // Check if there are any phone numbers for this provider - either in the global config or in any domain
    let hasPhoneNumbers = false;
    
    // Check global config
    if (providerConfig.phoneNumbers && Object.keys(providerConfig.phoneNumbers).length > 0) {
        hasPhoneNumbers = true;
    }
    
    // Check domain-specific configs
    if (domainFilter) {
        // If domain filter is specified, only check that domain
        if (config.domains[domainFilter]) {
            const domainConfig = config.domains[domainFilter];
            
            // Check both possible keys for 11Labs - both 'elevenlabs' and '11labs'
            const providerKeys = providerName.toLowerCase() === '11labs' ? ['elevenlabs', '11labs'] : [providerName.toLowerCase()];
            
            for (const providerKey of providerKeys) {
                if (domainConfig[providerKey] && 
                    domainConfig[providerKey].phoneNumbers && 
                    Object.keys(domainConfig[providerKey].phoneNumbers).length > 0) {
                    hasPhoneNumbers = true;
                    break;
                }
            }
        }
    } else {
        // Otherwise check all domains
        for (const domain of allDomains) {
            const domainConfig = config.domains[domain];
            
            // Check both possible keys for 11Labs - both 'elevenlabs' and '11labs'
            const providerKeys = providerName.toLowerCase() === '11labs' ? ['elevenlabs', '11labs'] : [providerName.toLowerCase()];
            
            for (const providerKey of providerKeys) {
                if (domainConfig[providerKey] && 
                    domainConfig[providerKey].phoneNumbers && 
                    Object.keys(domainConfig[providerKey].phoneNumbers).length > 0) {
                    hasPhoneNumbers = true;
                    break;
                }
            }
            
            if (hasPhoneNumbers) break;
        }
    }
    
    if (!hasPhoneNumbers) {
        console.log(chalk.yellow(`No ${providerName} phone numbers in local configuration${domainFilter ? ` for domain ${domainFilter}` : ''}.`));
        return 0;
    }
    
    // Track which domain each phone belongs to
    let phonesForDomain = {}; 
    
    // Get provider keys to check (handle both 'elevenlabs' and '11labs' for 11Labs)
    const providerKeys = providerName.toLowerCase() === '11labs' ? 
        ['elevenlabs', '11labs'] : 
        [providerName.toLowerCase()];
    
    // Set to collect unique phone numbers
    const phoneNumberSet = new Set();
    
    // Always add numbers from the global config first
    if (providerConfig.phoneNumbers) {
        Object.keys(providerConfig.phoneNumbers).forEach(number => {
            phoneNumberSet.add(number);
            // For global numbers, we don't have a specific domain
            phonesForDomain[number] = 'global';
        });
    }
    
    // If we have a domain filter, only consider numbers from that domain
    if (domainFilter) {
        const domainConfig = config.domains[domainFilter];
        
        // For each potential provider key, check if it exists in the domain config
        for (const providerKey of providerKeys) {
            if (domainConfig[providerKey] && domainConfig[providerKey].phoneNumbers) {
                // Add each phone number from this provider in this domain
                Object.keys(domainConfig[providerKey].phoneNumbers).forEach(number => {
                    phoneNumberSet.add(number);
                    phonesForDomain[number] = domainFilter;
                });
            }
        }
    } 
    // If no domain filter, get numbers from all domains
    else {
        for (const domain of allDomains) {
            const domainConfig = config.domains[domain];
            
            // For each potential provider key, check all domains
            for (const providerKey of providerKeys) {
                if (domainConfig[providerKey] && domainConfig[providerKey].phoneNumbers) {
                    // Add each phone number from this provider in this domain
                    Object.keys(domainConfig[providerKey].phoneNumbers).forEach(number => {
                        phoneNumberSet.add(number);
                        // If we already have a domain mapping and it's not 'global', keep it
                        if (!phonesForDomain[number] || phonesForDomain[number] === 'global') {
                            phonesForDomain[number] = domain;
                        }
                    });
                }
            }
        }
    }
    
    // Convert the set to an array for further processing
    const localPhoneNumbers = Array.from(phoneNumberSet);
    
    // If no phone numbers found for domain filter, report and exit
    if (domainFilter && localPhoneNumbers.length === 0) {
        console.log(chalk.yellow(`No ${providerName} phone numbers found for domain ${domainFilter}.`));
        return 0;
    }
    
    console.log(chalk.cyan(`Found ${localPhoneNumbers.length} ${providerName} phone numbers${domainFilter ? ` for domain ${domainFilter}` : ''} in local configuration:`));
    localPhoneNumbers.forEach(number => {
        const domain = phonesForDomain[number] || 'unknown domain';
        console.log(chalk.cyan(`  - ${number} (${domain})`));
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
        
        spinner.succeed(`Found ${remotePhoneNumbers.length} ${providerName} phone numbers in remote service${domainFilter ? ` (not filtered by domain)` : ''}.`);
        if (remotePhoneNumbers.length > 0) {
            console.log(chalk.green(`  Remote phone numbers:`));
            remotePhoneNumbers.forEach(number => {
                console.log(chalk.green(`  - ${number}`));
            });
        } else {
            console.log(chalk.yellow(`  No phone numbers found in remote service.`));
        }
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
    // Use the existing config object that was loaded earlier
    const configKeys = providerName.toLowerCase() === '11labs' ? ['elevenlabs', '11labs'] : [providerName.toLowerCase()];
    
    let removedCount = 0;
    
    // Loop through numbers to remove
    for (const number of numbersToRemove) {
        const domain = phonesForDomain[number];
        
        if (domainFilter && domain !== domainFilter) {
            // Skip numbers not in the filtered domain
            continue;
        }
        
        // First remove from the global provider config
        for (const configKey of configKeys) {
            if (config[configKey] && config[configKey].phoneNumbers && config[configKey].phoneNumbers[number]) {
                delete config[configKey].phoneNumbers[number];
            }
        }
        
        // Then remove from the domain-specific config
        if (domain && config.domains[domain]) {
            const domainConfig = config.domains[domain];
            
            let removed = false;
            for (const configKey of configKeys) {
                if (domainConfig[configKey] && 
                    domainConfig[configKey].phoneNumbers && 
                    domainConfig[configKey].phoneNumbers[number]) {
                    
                    delete domainConfig[configKey].phoneNumbers[number];
                    removed = true;
                }
            }
            
            if (removed) {
                console.log(chalk.yellow(`  - Removed ${number} from domain ${domain}`));
                removedCount++;
            }
        }
    }
    
    // Save updated configuration if any changes were made
    if (removedCount > 0) {
        saveConfig(config);
    }
    
    if (removedCount > 0) {
        console.log(chalk.green(`Removed ${removedCount} ${providerName} phone numbers${domainFilter ? ` from domain ${domainFilter}` : ''}.`));
    } else {
        console.log(chalk.green(`No ${providerName} phone numbers needed to be removed.`));
    }
    
    return removedCount;
}

module.exports = syncCommand;