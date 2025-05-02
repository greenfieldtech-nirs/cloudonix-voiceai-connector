const chalk = require('chalk');
const { getConfig, getDomainConfig } = require('../utils/config');
const VapiApiService = require('../services/vapiApi');
const RetellApiService = require('../services/retellApi');
const ElevenLabsAgentProvider = require('../services/11LabsAgentProvider');

async function displayCommand(options) {
    const { domain, remote } = options;
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

        await displayProviderConfig('VAPI', config.vapi, remote);
        await displayProviderConfig('Retell', config.retell, remote);
        await displayProviderConfig('11Labs', config.elevenlabs, remote);
    }
}

function displayDomainConfig(domainName, domainConfig) {
    console.log(chalk.green.bold(`\nDomain: ${domainName}`));
    console.log(chalk.cyan('API Key:'), domainConfig.apiKey ? '********' : 'Not set');
    console.log(chalk.cyan('Alias:'), domainConfig.alias || 'Not set');
    console.log(chalk.cyan('Auto Alias:'), domainConfig.autoAlias || 'Not set');
    console.log(chalk.cyan('Inbound SIP URI:'), domainConfig.inboundSipUri || 'Not set');
    console.log(chalk.cyan('Tenant:'), domainConfig.tenant || 'Not set');

    const providers = ['VAPI', 'Retell', '11Labs'];
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

async function displayProviderConfig(providerName, providerConfig, remote) {
    console.log(chalk.blue.bold(`\n${providerName} Configuration:`));
    if (providerConfig) {
        console.log(chalk.cyan('API Key:'), providerConfig.apiKey ? '********' : 'Not set');
        console.log(chalk.cyan('API URL:'), providerConfig.apiUrl || 'Not set');
        
        // Display local phone numbers
        displayPhoneNumbers({ [providerName]: providerConfig.phoneNumbers });
        
        // Display remote phone numbers if remote flag is set
        if (remote && providerConfig.apiKey) {
            try {
                console.log(chalk.magenta.bold(`\nRemote ${providerName} Phone Numbers:`));
                
                // Create and start a loading animation
                const loadingChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
                let i = 0;
                const loadingInterval = setInterval(() => {
                    process.stdout.write(`\r${chalk.cyan(loadingChars[i])} Fetching ${providerName} phone numbers...`);
                    i = (i + 1) % loadingChars.length;
                }, 100);
                
                let remoteNumbers = [];
                if (providerName === 'VAPI') {
                    const vapiService = new VapiApiService(providerConfig.apiKey, providerConfig.apiUrl);
                    const phoneNumbersData = await vapiService.getPhoneNumbers();
                    
                    if (phoneNumbersData && Array.isArray(phoneNumbersData)) {
                        // Get detailed information for each phone number
                        remoteNumbers = [];
                        for (const num of phoneNumbersData) {
                            // Only process byo-phone-number types
                            if (num.provider !== 'byo-phone-number') {
                                continue;
                            }
                            
                            try {
                                const details = await vapiService.getPhoneNumberDetails(num.id);
                                
                                // Fetch credential details if available
                                let credentialDetails = null;
                                if (details.credentialId) {
                                    try {
                                        // Update loading message for credential details
                                        process.stdout.write(`\r${chalk.cyan(loadingChars[i % loadingChars.length])} Fetching credential details for ${details.number}...`);
                                        credentialDetails = await vapiService.getCredentialDetails(details.credentialId);
                                    } catch (credError) {
                                        console.error(chalk.yellow(`    Unable to fetch credential details for ID ${details.credentialId}: ${credError.message}`));
                                    }
                                }
                                
                                remoteNumbers.push({
                                    ...details,
                                    id: num.id,
                                    credentialDetails
                                });
                            } catch (error) {
                                console.error(chalk.red(`    Error fetching details for number ${num.number}: ${error.message}`));
                                // Add basic info from the list if details fail
                                remoteNumbers.push({
                                    number: num.number,
                                    name: num.name,
                                    provider: num.provider,
                                    id: num.id,
                                    error: 'Failed to fetch details'
                                });
                            }
                        }
                    }
                } else if (providerName === 'Retell') {
                    const retellService = new RetellApiService(providerConfig.apiKey, providerConfig.apiUrl);
                    const phoneNumbersData = await retellService.getPhoneNumbers();
                    if (phoneNumbersData && Array.isArray(phoneNumbersData)) {
                        remoteNumbers = phoneNumbersData.map(num => ({
                            id: num.phone_number || 'unknown',
                            number: num.phone_number || 'unknown',
                            phoneType: num.phone_number_type || 'N/A',
                            areaCode: num.area_code,
                            inboundAgentId: num.inbound_agent_id,
                            outboundAgentId: num.outbound_agent_id,
                            lastModified: num.last_modification_timestamp ? new Date(parseInt(num.last_modification_timestamp) * 1000).toLocaleString() : null
                        }));
                    }
                } else if (providerName === '11Labs') {
                    const elevenLabsProvider = new ElevenLabsAgentProvider(providerConfig.apiKey, providerConfig.apiUrl);
                    const phoneNumbersData = await elevenLabsProvider.getPhoneNumbers();
                    if (phoneNumbersData && Array.isArray(phoneNumbersData)) {
                        remoteNumbers = phoneNumbersData.map(num => ({
                            id: num.id || 'unknown',
                            number: num.phoneNumber || num.number || 'unknown',
                            name: num.name || 'N/A',
                            voiceId: num.voiceId || 'N/A',
                            model: num.model || 'N/A',
                            createdAt: num.createdAt ? new Date(num.createdAt).toLocaleString() : 'N/A'
                        }));
                    }
                }
                
                // Make sure to clear the loading animation
                try {
                    clearInterval(loadingInterval);
                    process.stdout.write('\r' + ' '.repeat(50) + '\r');
                } catch (err) {
                    // In case the interval was already cleared
                }
                
                if (remoteNumbers.length > 0) {
                    remoteNumbers.forEach(num => {
                        let sipUri = '';
                        if (providerName === 'VAPI') {
                            sipUri = `sip:${num.number}@sip.vapi.ai`;
                        } else if (providerName === 'Retell') {
                            sipUri = `sip:${num.number}@5t4n6j0wnrl.sip.livekit.cloud:5060;transport=tcp`;
                        } else if (providerName === '11Labs') {
                            sipUri = `sip:${num.number}@sip.elevenlabs.io`;
                        }
                        
                        console.log(chalk.green(`  - Number: ${num.number} (${sipUri})`));
                        
                        // Only show Name for VAPI and 11Labs, not for Retell
                        if (providerName === 'VAPI' || providerName === '11Labs') {
                            console.log(chalk.yellow(`    Name: ${num.name}`));
                        }
                        
                        console.log(chalk.yellow(`    ID: ${num.id}`));
                        
                        if (providerName === 'VAPI') {
                            console.log(chalk.yellow(`    Provider: ${num.provider || 'N/A'}`));
                            
                            if (num.error) {
                                console.log(chalk.red(`    Error: ${num.error}`));
                            } else {
                                // Display basic details
                                console.log(chalk.yellow(`    Status: ${num.status || 'N/A'}`));
                                
                                if (num.credentialId) {
                                    console.log(chalk.yellow(`    Credential ID: ${num.credentialId}`));
                                    
                                    // Display credential details and gateways if available
                                    if (num.credentialDetails) {
                                        console.log(chalk.cyan(`    Credential Details:`));
                                        console.log(chalk.yellow(`      Name: ${num.credentialDetails.name || 'N/A'}`));
                                        console.log(chalk.yellow(`      Provider: ${num.credentialDetails.provider || 'N/A'}`));
                                        
                                        if (num.credentialDetails.gateways && num.credentialDetails.gateways.length > 0) {
                                            console.log(chalk.cyan(`      Gateways:`));
                                            num.credentialDetails.gateways.forEach((gateway, idx) => {
                                                console.log(chalk.yellow(`        Gateway ${idx + 1}:`));
                                                if (gateway.ip) {
                                                    console.log(chalk.yellow(`          IP: ${gateway.ip}`));
                                                }
                                                if (gateway.port) {
                                                    console.log(chalk.yellow(`          Port: ${gateway.port}`));
                                                }
                                                if (gateway.protocol) {
                                                    console.log(chalk.yellow(`          Protocol: ${gateway.protocol}`));
                                                }
                                            });
                                        }
                                    }
                                }
                                
                                if (num.createdAt) {
                                    console.log(chalk.yellow(`    Created: ${new Date(num.createdAt).toLocaleString()}`));
                                }
                                
                                if (num.updatedAt) {
                                    console.log(chalk.yellow(`    Updated: ${new Date(num.updatedAt).toLocaleString()}`));
                                }
                                
                                if (num.assistantId) {
                                    console.log(chalk.yellow(`    Assistant ID: ${num.assistantId}`));
                                }

                                if (num.orgId) {
                                    console.log(chalk.yellow(`    Organization ID: ${num.orgId}`));
                                }

                                if (num.squadId) {
                                    console.log(chalk.yellow(`    Squad ID: ${num.squadId}`));
                                }

                                // Display fallback destination if present
                                if (num.fallbackDestination) {
                                    console.log(chalk.cyan(`    Fallback Destination:`));
                                    console.log(chalk.yellow(`      Type: ${num.fallbackDestination.type || 'N/A'}`));
                                    
                                    if (num.fallbackDestination.number) {
                                        console.log(chalk.yellow(`      Number: ${num.fallbackDestination.number}`));
                                    }
                                    
                                    if (num.fallbackDestination.callerId) {
                                        console.log(chalk.yellow(`      Caller ID: ${num.fallbackDestination.callerId}`));
                                    }
                                    
                                    if (num.fallbackDestination.description) {
                                        console.log(chalk.yellow(`      Description: ${num.fallbackDestination.description}`));
                                    }
                                    
                                    if (num.fallbackDestination.message) {
                                        console.log(chalk.yellow(`      Message: ${num.fallbackDestination.message}`));
                                    }
                                }
                                
                                // Display hooks if present
                                if (num.hooks && num.hooks.length > 0) {
                                    console.log(chalk.cyan(`    Hooks (${num.hooks.length}):`));
                                    num.hooks.forEach((hook, index) => {
                                        console.log(chalk.yellow(`      Hook ${index + 1}:`));
                                        console.log(chalk.yellow(`        Event: ${hook.on || 'N/A'}`));
                                        if (hook.do && hook.do.length > 0) {
                                            console.log(chalk.yellow(`        Actions: ${hook.do.map(a => a.type).join(', ')}`));
                                        }
                                    });
                                }

                                // Display server configuration if present
                                if (num.server && num.server.url) {
                                    console.log(chalk.cyan(`    Server Configuration:`));
                                    console.log(chalk.yellow(`      URL: ${num.server.url}`));
                                    
                                    if (num.server.timeoutSeconds) {
                                        console.log(chalk.yellow(`      Timeout: ${num.server.timeoutSeconds} seconds`));
                                    }
                                    
                                    if (num.server.headers) {
                                        console.log(chalk.yellow(`      Custom Headers: ${Object.keys(num.server.headers).length}`));
                                    }
                                }
                            }
                        } else if (providerName === 'Retell') {
                            // Display all available properties in the Retell response
                            Object.entries(num).forEach(([key, value]) => {
                                // Skip properties we already displayed, name, or null/undefined values
                                if (key !== 'id' && 
                                    key !== 'number' && 
                                    key !== 'name' && 
                                    value != null) {
                                    
                                    // Display properties
                                    if (typeof value === 'object') {
                                        console.log(chalk.yellow(`    ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${JSON.stringify(value)}`));
                                    } else {
                                        console.log(chalk.yellow(`    ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}`));
                                    }
                                }
                            });
                        } else if (providerName === '11Labs') {
                            // Display 11Labs specific properties
                            if (num.error) {
                                console.log(chalk.red(`    Error: ${num.error}`));
                            } else {
                                // Display basic details for 11Labs
                                if (num.model) {
                                    console.log(chalk.yellow(`    Model: ${num.model}`));
                                }
                                
                                if (num.voiceId) {
                                    console.log(chalk.yellow(`    Voice ID: ${num.voiceId}`));
                                }
                                
                                if (num.createdAt) {
                                    console.log(chalk.yellow(`    Created: ${num.createdAt}`));
                                }
                                
                                // Display additional properties dynamically
                                Object.entries(num).forEach(([key, value]) => {
                                    if (key !== 'id' && 
                                        key !== 'number' && 
                                        key !== 'name' && 
                                        key !== 'model' &&
                                        key !== 'voiceId' &&
                                        key !== 'createdAt' &&
                                        value != null) {
                                        
                                        if (typeof value === 'object') {
                                            console.log(chalk.yellow(`    ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${JSON.stringify(value)}`));
                                        } else {
                                            console.log(chalk.yellow(`    ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}`));
                                        }
                                    }
                                });
                            }
                        }
                        
                        console.log();
                    });
                } else {
                    console.log(chalk.yellow('  No remote phone numbers found.'));
                }
            } catch (error) {
                // Clear the loading animation in case of error
                try {
                    clearInterval(loadingInterval);
                    process.stdout.write('\r' + ' '.repeat(50) + '\r');
                } catch (err) {
                    // In case the interval was already cleared
                }
                console.error(chalk.red(`  Error fetching remote ${providerName} phone numbers: ${error.message}`));
            }
        }
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
                        sipUri = `sip:${number}@sip.vapi.ai`;
                    } else if (providerName === 'Retell') {
                        sipUri = `sip:${number}@5t4n6j0wnrl.sip.livekit.cloud:5060;transport=tcp`;
                    } else if (providerName === '11Labs') {
                        sipUri = `sip:${number}@sip.elevenlabs.io`;
                    }
                    console.log(chalk.yellow(`        - Number: ${number} (${sipUri})`));
                });
            }
        });
    }
    // Removed the "None configured" message
}

module.exports = displayCommand;