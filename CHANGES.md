# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Added support for 11Labs as a new voice agent provider
- Integrated the official elevenlabs SDK
- Updated service command to support 11Labs configuration (no longer requires domain parameter)
- Added phone number management for 11Labs
- Implemented addnumber functionality for 11Labs provider
- Added support for displaying remote 11Labs phone numbers with the display --remote command
- Added new `sync` command to synchronize local configuration with remote service providers

### Changed
- Made domain parameter optional for service command
- Standardized phone number naming convention across all providers to include domain name and phone number (e.g., "[domain.cloudonix.net] +12125551234")
- Switched from using the 11Labs SDK to direct API calls for better reliability

### Fixed
- Corrected SIP domain for 11Labs to use sip.rtc.elevenlabs.io:5060;transport=tcp
- Fixed display command output for 11Labs phone numbers
- Properly store the API URL for 11Labs in configuration
- Fixed termination URI in 11Labs phone number creation to use the domain's inboundSipUri
- Fixed display command with --remote flag to properly show Retell phone numbers
- Fixed 11Labs API endpoints to include the version prefix correctly (/v1/convai/phone-numbers/)
- Added fallback mechanism to display 11Labs phone numbers from local configuration when API returns no results
- Fixed API authentication for 11Labs by using Xi-Api-Key header instead of Authorization header
- Enhanced debugging for 11Labs API calls with detailed request/response logging
- Improved 11Labs API response handling with multiple fallback mechanisms and more detailed debug output
- Fixed 11Labs API URL display in the configuration output

## [0.1.6] - 2025-05-02

### Added
- New `--remote` flag to the `display` command to show remote configuration from service providers
- Loading animation when fetching remote phone numbers
- Enhanced VAPI phone number display with credential and gateway information
- Interface definition files for standardizing API implementations
- Factory pattern for service provider instantiation

### Changed
- Improved formatting of Retell phone number display
- Added human-readable timestamps for the "Last Modified" field
- Enhanced property name formatting (converting snake_case to Title Case)
- Restructured code with proper inheritance for API services
- Moved Cloudonix API functionality to a dedicated directory

### Fixed
- SIP URI for VAPI phone numbers now correctly uses `sip.vapi.ai` instead of `api.vapi.ai`
- Retell API endpoint for phone numbers now correctly uses `/list-phone-numbers` 
- Timestamp conversion for Retell phone numbers now properly handles Unix timestamps
- Removed the redundant "Phone Numbers: None configured" message

## [0.1.5] - 2025-04-27

- Bump version
- Add .npmignore
- Resolve some packaging issues

## [0.1.4] - 2025-04-20

- Update README with all supported voice agents 
- Fix the --help command

## [0.1.0] - 2025-04-15

- Initial release
- Basic functionality for connecting Cloudonix with Voice AI providers