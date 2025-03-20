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

```bash
cx-vcc service --provider vapi --apikey YOUR_VAPI_API_KEY
```

This will:
1. Verify the API key with the provider by calling the `/assistant` endpoint
2. Store the API key in the configuration file for later use

To create a SIP trunk while configuring the service:

```bash
cx-vcc service --provider vapi --apikey YOUR_VAPI_API_KEY --name "My SIP Trunk" --domain example.com
```

This will:
1. Configure the VAPI API key
2. Create a SIP trunk connection between VAPI and Cloudonix
3. Use the inbound SIP URI from the specified domain
4. Store the trunk credential ID in the domain configuration
5. Display the SIP trunk details

### Add a Phone Number to a VAPI Assistant

```bash
cx-vcc addnumber --domain example.com --provider vapi --number +12025551234 --assistant YOUR_ASSISTANT_ID
```

This will:
1. Add the phone number to the previously created SIP trunk
2. Associate the phone number with the specified assistant
3. Store the phone number details in the domain configuration
4. Display the phone number details

The command follows this process:
1. First it adds the number as a "BYO phone number" to the SIP trunk
2. Then it assigns the number to the specified VAPI assistant

The phone number must be in E.164 format (e.g., +12025551234).

### Display Configuration

Display all configurations:

```bash
cx-vcc display
```

Display configuration for a specific domain:

```
cx-vcc display --domain example.com
```

This command allows you to view the current configuration of the Cloudonix Voice AI Connector. It provides a human-readable output with color-coded formatting for easier reading.
When run without any options, it will display:

1. All configured Cloudonix domains and their details
2. The global VAPI configuration

When run with the --domain option, it will display:
1. The specific domain's configuration
2. VAPI-specific configurations for that domain (if any)

The displayed information includes:
- Domain name
- API keys (masked for security)
- Domain aliases
- Inbound SIP URI
- Tenant information
- VAPI trunk credential ID (if configured)
- Associated phone numbers (if any), including:
  - Phone number
  - Number ID
  - Credential ID
  - Associated Assistant ID

This command is useful for verifying your current setup and troubleshooting configuration issues.

### Debug Mode

You can enable debug mode with any command by adding the `--debug` flag:

```bash
cx-vcc --debug configure --domain example.com --apikey YOUR_API_KEY
cx-vcc --debug service --provider vapi --apikey YOUR_API_KEY
cx-vcc --debug addnumber --domain example.com --provider vapi --number +12025551234 --assistant YOUR_ASSISTANT_ID
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
    apiKey: YOUR_CLOUDONIX_API_KEY
    alias: domain-alias-from-api
    autoAlias: auto-alias-value
    inboundSipUri: auto-alias-value.sip.cloudonix.net
    tenant: self
    vapi:
      trunkCredentialId: credential-id-from-vapi
      phoneNumbers:
        - id: phone-number-id
          number: "+12025551234"
          credentialId: credential-id-from-vapi
          assistantId: assistant-id
vapi:
  apiKey: YOUR_VAPI_API_KEY
  apiUrl: https://api.vapi.ai
```

### API Details

- **Cloudonix API**: 
  - Uses the `/customers/self/domains/{domain}` endpoint to get domain details


- **VAPI API**:
  - Uses the `/assistant` endpoint to verify API keys
  - Uses the `/credential` endpoint to create SIP trunk connections
  - Uses the `/phone-number` endpoint to add phone numbers to SIP trunks and assistants

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/yourusername/cloudonix-voiceai-connector/tags).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
