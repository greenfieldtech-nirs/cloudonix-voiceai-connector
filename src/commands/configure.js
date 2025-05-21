const chalk = require('chalk');
const ora = require('ora');
const { saveDomainConfig, getDomainConfig, getAvailableDomains } = require('../utils/config');
const CloudonixService = require('../services/cloudonixApi');
const { debugLog } = require('../utils/debug');

/**
 * Configure a new Cloudonix domain
 * @param {Object} options - Command options
 * @param {string} options.domain - Domain name
 * @param {string} options.apikey - API key (optional)
 */
async function configureCommand(options) {
  const { domain, apikey } = options;

  const existingConfig = getDomainConfig(domain);

  if (!apikey) {
    handleDeleteCase(domain, existingConfig);
    return;
  }

  if (existingConfig) {
    console.log(chalk.yellow(`Domain ${domain} already exists in configuration.`));
    console.log(chalk.yellow('Updating configuration with the new API key.'));
  }

  const cloudonixApi = new CloudonixService(apikey);
  const spinner = ora(`Verifying domain ${domain} with Cloudonix API...`).start();

  try {
    const domainDetails = await cloudonixApi.getDomainDetails(domain);
    const { autoAlias, inboundSipUri } = extractDomainInfo(domainDetails, domain);

    const domainConfig = {
      apiKey: apikey,
      alias: domainDetails.alias || autoAlias,
      autoAlias,
      inboundSipUri,
      tenant: 'self',
    };

    saveDomainConfig(domain, domainConfig);

    const successMessage = inboundSipUri
      ? `Domain ${domain} configured successfully with inbound SIP URI: ${inboundSipUri}`
      : `Domain ${domain} configured successfully with alias: ${domainConfig.alias}`;

    spinner.succeed(chalk.green(successMessage));
  } catch (error) {
    spinner.fail(chalk.red(`Failed to configure domain ${domain}: ${error.message}`));
    debugLog('Error details:', error);
    process.exit(1);
  }
}

function handleDeleteCase(domain, existingConfig) {
  if (existingConfig) {
    console.log(chalk.yellow(`Domain ${domain} already exists in configuration.`));
    console.log(chalk.yellow(`Use 'cx-vcc delete --domain ${domain}' to remove it.`));
  } else {
    console.error(chalk.red(`Domain ${domain} not found in configuration.`));
    console.log(
      chalk.yellow(`Use 'cx-vcc configure --domain ${domain} --apikey YOUR_API_KEY' to add it.`)
    );
  }

  const domains = getAvailableDomains();
  if (domains.length > 0) {
    console.log(chalk.blue('\nAvailable domains:'));
    domains.forEach((d) => console.log(`- ${d}`));
  }
}

function extractDomainInfo(domainDetails, domain) {
  let autoAlias = domain;
  let inboundSipUri = '';

  if (domainDetails.aliases && Array.isArray(domainDetails.aliases)) {
    const autoAliasObj = domainDetails.aliases.find((alias) => alias.type === 'auto');
    if (autoAliasObj && autoAliasObj.alias) {
      autoAlias = autoAliasObj.alias;
      inboundSipUri = `${autoAlias}.sip.cloudonix.net`;
    }
  }

  return { autoAlias, inboundSipUri };
}

module.exports = configureCommand;
