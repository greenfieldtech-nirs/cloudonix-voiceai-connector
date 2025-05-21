#!/usr/bin/env node

const { program } = require('commander');
const pkg = require('../package.json');
require('dotenv').config();

// Import commands
const configureCommand = require('./commands/configure');
const deleteCommand = require('./commands/delete');
const serviceCommand = require('./commands/service');
const addNumberCommand = require('./commands/addnumber');
const displayCommand = require('./commands/display');
const syncCommand = require('./commands/sync');

// Import utilities
const { setDebugMode } = require('./utils/debug');
const displayBanner = require('./utils/banner');

program
  .name('cx-vcc')
  .description(
    'Cloudonix Voice AI Connector - Setup SIP trunks between Cloudonix and Voice AI providers'
  )
  .version(pkg.version, '-v, --version', 'Output the current version')
  .hook('preAction', (thisCommand, _actionCommand) => {
    // Set debug mode based on the global flag
    const options = thisCommand.opts();
    setDebugMode(options.debug || false);
    displayBanner();
  });

// Configure command
program
  .command('configure')
  .description('Configure a new Cloudonix domain')
  .requiredOption('-d, --domain <domain>', 'Cloudonix domain name')
  .requiredOption('-a, --apikey <apikey>', 'Cloudonix API key')
  .option('--debug', 'Enable debug mode for detailed logging')
  .action(configureCommand);

// Delete command
program
  .command('delete')
  .description('Delete a Cloudonix domain configuration')
  .requiredOption('-d, --domain <domain>', 'Cloudonix domain name to delete')
  .option('--debug', 'Enable debug mode for detailed logging')
  .action(deleteCommand);

// Service command
program
  .command('service')
  .description('Configure a Voice AI service provider')
  .requiredOption(
    '-p, --provider <provider>',
    'Service provider name (currently supports: vapi, retell, 11labs)'
  )
  .requiredOption('-a, --apikey <apikey>', 'API key for the service provider')
  .option('-n, --name <n>', 'Name for the SIP trunk (if creating a trunk)')
  .option(
    '-d, --domain <domain>',
    'Cloudonix domain to use for SIP trunk (only required when creating a trunk)'
  )
  .option('--debug', 'Enable debug mode for detailed logging')
  .action(serviceCommand);

// Add Number command
program
  .command('addnumber')
  .description('Add a phone number to a Voice AI provider')
  .requiredOption('-d, --domain <domain>', 'Cloudonix domain to use')
  .requiredOption(
    '-p, --provider <provider>',
    'Service provider name (currently supports: vapi, retell, 11labs)'
  )
  .requiredOption('-n, --number <number>', 'Phone number to add (E.164 format mandatory)')
  .option('--debug', 'Enable debug mode for detailed logging')
  .action(addNumberCommand);

// Display command
program
  .command('display')
  .description('Display configuration information')
  .option('-d, --domain <domain>', 'Specific domain to display')
  .option('-r, --remote', 'Display remote configuration from service providers')
  .option('--debug', 'Enable debug mode for detailed logging')
  .action(displayCommand);

// Sync command
program
  .command('sync')
  .description('Synchronize local configuration with remote service providers')
  .option('-d, --domain <domain>', 'Limit sync to a specific Cloudonix domain')
  .option(
    '-p, --provider <provider>',
    'Limit sync to a specific service provider (vapi, retell, 11labs)'
  )
  .option('--debug', 'Enable debug mode for detailed logging')
  .action(syncCommand);

program.parse(process.argv);

// Display help if no arguments provided
if (!process.argv.slice(2).length) {
  program.help();
}
