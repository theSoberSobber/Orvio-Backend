# Changelog

## [1.1.0] - 2025-05-04

### Added
- **Credit Faucet Service**
  - New microservice for managing credits and cashback points
  - Purchase credits via Cashfree payment gateway
  - Redeem cashback points to UPI accounts
  - Clean and simple bank-like UI interface

- **Cashback Points System**
  - Added `cashbackPoints` field to user table
  - Users earn 10% of credit costs as cashback points on successful OTP acknowledgments
  - Points can be redeemed once minimum threshold (10 points) is reached

- **Environment Variables**
  - Added Cashfree API credentials to environment variables
  - Added support for sandbox/production API endpoints

- **Database Updates**
  - Added SQL script to update existing user tables with cashback points column
  - Non-destructive update that preserves existing data

- **Deployment Tools**
  - Added `update-db` command to test_orvio.ps1 and test_orvio.sh scripts
  - Included upgrade guide for existing deployments

### Fixed
- Transaction ID usage in ServiceService to prevent TypeError

### Documentation
- Added UPGRADE.md guide for existing deployments
- Updated README.md with credit faucet information
- Updated environment variable documentation 