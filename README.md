# Cloudonix Voice AI Connector (cx-vcc)

A command-line tool to establish SIP trunks between Cloudonix and Voice AI providers.

## Installation

### Prerequisites
- Node.js v14 or higher
- npm v6 or higher

### Install from Source
```bash
# Clone the repository
git clone <repository-url>
cd cloudonix-voiceai-connector

# Install dependencies
npm install

# Link the CLI tool globally
npm link
```

### Install from npm
```bash
npm install -f cloudonix-voiceai-connector
```
This will install the CLI tool globally on your system.

## Usage

After installation, you can use the `cx-vcc` command globally. For example:

```bash
cx-vcc --help
```

### Global Options

The following options can be used with any command:

```bash
--debug     Enable debug mode for detailed API request/response logging
--version   Show version number
--help      Show help information
```

### Configure a Cloudonix Domain

Configure a new Cloudonix domain:

```bash
cx-vcc configure --domain example.com --apikey YOUR_CLOUDONIX_API_KEY
```

This will:
1. Verify the domain with Cloudonix API
2. Retrieve domain details including the "auto" alias from aliases list
3. Create an inbound SIP URI by concatenating the auto alias with ".sip.cloudonix.net"
4. Store the configuration in YAML format at `~/.cx-vcc/config.yaml`

View domain configuration:

```bash
cx-vcc configure --domain example.com
```

This will show if the domain is configured and list all available domains.

### Delete a Cloudonix Domain

Remove a domain from the configuration:

```bash
cx-vcc delete --domain example.com
```

This will:
1. Prompt for confirmation
2. Remove the domain from the configuration file

### Configure a Voice AI Service Provider

To create a connection to your Voice Agent service provider, use the following example:

```bash
cx-vcc service --provider vapi --apikey YOUR_VAPI_API_KEY --name "My SIP Trunk" --domain example.com
```

This will:
1. Configure the VAPI API key
2. Create a SIP trunk connection between VAPI and Cloudonix
3. Use the inbound SIP URI from the specified domain
4. Store the trunk credential ID in the Cloudonix domain configuration
5. Display the SIP trunk details

### Add a Phone Number to a VAPI Assistant

```bash
cx-vcc addnumber --domain example.com --provider vapi --number +12025551234
```

This will:
1. Add the phone number to the previously created SIP trunk
2. Store the phone number details in the domain configuration
3. Display the phone number details

The phone number must be in E.164 format (e.g., +12025551234).

### Display Configuration

Display all configurations:

```bash
cx-vcc display
```

Display configuration for a specific domain:

** Display all configured domains and their associated phone numbers**
```
cx-vcc display
```

or

** Display configuration and associated phone numbers for the `example.com` Cloudonix domain. **
```
cx-vcc display --domain example.com
```

The displayed information includes:
- Domain name
- API keys (masked for security)
- Domain aliases
- Inbound SIP URI
- Associated phone numbers (if any), including:
  - Phone number
  - SIP URI

This command is useful for verifying your current setup and troubleshooting configuration issues.

### Debug Mode

You can enable debug mode with any command by adding the `--debug` flag:

```bash
cx-vcc --debug configure --domain example.com --apikey YOUR_API_KEY
cx-vcc --debug service --provider vapi --apikey YOUR_API_KEY
cx-vcc --debug addnumber --domain example.com --provider vapi --number +12025551234
```

When debug mode is enabled:
- All API requests will be logged with their URL, method, and payload
- All API responses will be logged with their status and response data
- Detailed error information will be displayed when errors occur, including the file and line number

This is useful for troubleshooting issues with the API integration.

### Configuration File

The configuration is stored in YAML format at `~/.cx-vcc/config.yaml` with a structure like:

```yaml
domains:
  example.com:
    apiKey: XI6057D.............
    alias: 488633................
    autoAlias: 488633b..................
    inboundSipUri: 48863.................
    tenant: self
    vapi:
      trunkCredentialId: 32b330f7...............
      phoneNumbers:
        '+12127773456':
          id: 682ce050-................
          sipUri: sip:+12127773456@api.vapi.ai
    retell:
      trunkCredentialId: Not required
      phoneNumbers:
        '+12127773456':
          sipUri: sip:+12127773456@api.retellai.com
vapi:
  apiKey: aeacb..................
  apiUrl: https://api.vapi.ai
retell:
  apiKey: key_0..................
  apiUrl: https://api.retellai.com

```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/yourusername/cloudonix-voiceai-connector/tags).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
