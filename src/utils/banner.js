const chalk = require('chalk');
const pkg = require('../../package.json');

const banner = `
 .d8888b.  888                        888                   d8b          
d88P  Y88b 888                        888                   Y8P          
888    888 888                        888                                
888        888  .d88b.  888  888  .d88888  .d88b.  88888b.  888 888  888 
888        888 d88""88b 888  888 d88" 888 d88""88b 888 "88b 888 \`Y8bd8P' 
888    888 888 888  888 888  888 888  888 888  888 888  888 888   X88K   
Y88b  d88P 888 Y88..88P Y88b 888 Y88b 888 Y88..88P 888  888 888 .d8""8b. 
 "Y8888P"  888  "Y88P"   "Y88888  "Y88888  "Y88P"  888  888 888 888  888 
                                                                          
 v${pkg.version} - Cloudonix Voice AI Connector

 Home: https://cloudonix.com
 Documentation: https://developers.cloudonix.com
 Discord: https://discord.gg/etCGgNh9VV
 GitHub: https://github.com/cloudonix
`;

function displayBanner() {
  console.log(chalk.cyan(banner));
}

module.exports = displayBanner;