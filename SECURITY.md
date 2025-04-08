# Security Guidelines for AWS Cognito Web Identity Federation Project

This document outlines security best practices for working with this project to ensure sensitive information is protected.

## Sensitive Information

The following information is considered sensitive and should never be committed to version control:

- AWS Account ID
- Cognito Identity Pool ID
- Google Client ID
- S3 bucket names
- CloudFront distribution ID and URL

## Environment Configuration

1. Always use the `.env` file for storing sensitive configuration values
2. Never commit the `.env` file to version control (it's included in `.gitignore`)
3. Use `.env.example` with placeholder values as a template for others

## Before Committing Code

1. Run the reset-config script to ensure no sensitive information is in frontend files:
   ```
   npm run reset-config
   ```

2. Install the pre-commit hook to automatically check for sensitive information:
   ```
   cp scripts/pre-commit-hook.sh .git/hooks/pre-commit
   chmod +x .git/hooks/pre-commit
   ```

## Deployment Workflow

1. Keep sensitive values in `.env` file
2. Deploy infrastructure with `npm run deploy`
3. Update frontend configuration with actual values using `npm run update-config`
4. Deploy frontend with `npm run deploy-frontend`
5. Reset configuration to placeholders with `npm run reset-config` before committing

## Security Checks

- The pre-commit hook checks for common patterns of sensitive information
- Always review changes before committing to ensure no sensitive data is included
- Periodically audit the codebase for any hardcoded credentials or configuration

## Additional Security Considerations

- Use IAM roles with least privilege principle
- Enable CloudTrail for auditing AWS API calls
- Consider implementing server-side validation of tokens
- Regularly rotate credentials and update configuration
