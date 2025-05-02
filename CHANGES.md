# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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