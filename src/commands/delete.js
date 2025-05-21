const chalk = require('chalk');
const inquirer = require('inquirer');
const { deleteDomainConfig, getDomainConfig } = require('../utils/config');

/**
 * Delete a Cloudonix domain configuration
 * @param {Object} options - Command options
 * @param {string} options.domain - Domain name to delete
 */
async function deleteCommand(options) {
  const { domain } = options;

  // Check if domain exists in config
  const existingConfig = getDomainConfig(domain);
  if (!existingConfig) {
    console.error(chalk.red(`Domain ${domain} not found in configuration.`));
    process.exit(1);
  }

  // Confirm deletion
  const confirmation = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to delete the configuration for domain ${domain}?`,
      default: false,
    },
  ]);

  if (!confirmation.confirm) {
    console.log(chalk.yellow('Operation cancelled.'));
    return;
  }

  // Delete the domain
  const deleted = deleteDomainConfig(domain);

  if (deleted) {
    console.log(chalk.green(`Domain ${domain} configuration successfully deleted.`));
  } else {
    console.error(chalk.red(`Failed to delete domain ${domain} configuration.`));
    process.exit(1);
  }
}

module.exports = deleteCommand;
