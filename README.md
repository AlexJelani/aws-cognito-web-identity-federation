# AWS Cognito Web Identity Federation CDK Project with CloudFront

This project implements the AWS Cognito Web Identity Federation lab using AWS CDK with CloudFront for content delivery.

## Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js and npm installed
- AWS CDK installed (`npm install -g aws-cdk`)
- A Google API Project with OAuth 2.0 Client ID (see instructions below)

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Download sample pet images:
   ```
   ./scripts/download-pet-images.sh
   ```
4. Create a Google API Project and OAuth 2.0 Client ID:
   - Go to the Google Developer Console (https://console.developers.google.com/)
   - Create a new project
   - Enable the Google+ API
   - Create OAuth 2.0 credentials
   - Set the authorized JavaScript origins to include your CloudFront URL (you'll need to update this after deployment)

## Deployment

1. Deploy the CDK stack with your Google Client ID:
   ```
   npm run deploy -- --context googleClientId=YOUR_GOOGLE_CLIENT_ID
   ```
   Or set it as an environment variable:
   ```
   export GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
   npm run deploy
   ```

2. After deployment, note the outputs including the CloudFront URL and Identity Pool ID.

3. Update the Google OAuth 2.0 Client ID settings to include your CloudFront URL as an authorized JavaScript origin.

4. Create a `frontend/dist` directory and copy the frontend files:
   ```
   mkdir -p frontend/dist
   cp frontend/src/* frontend/dist/
   ```

5. Update the frontend configuration with the deployment values:
   ```
   npm run update-config
   ```

6. Deploy the updated frontend to the S3 bucket and invalidate CloudFront cache:
   ```
   npm run deploy-frontend
   npm run invalidate-cache
   ```
   
   Or use the combined post-deploy script:
   ```
   npm run post-deploy
   ```

7. Access your application using the CloudFront URL provided in the CDK outputs.

## Cleanup

To remove all resources created by this project:

```
cdk destroy
```

## Architecture

This project creates:
1. An S3 bucket for hosting the web application
2. A CloudFront distribution for content delivery
3. A private S3 bucket for storing pet images
4. A Cognito Identity Pool with Google as an identity provider
5. IAM roles for authenticated users to access the private S3 bucket
# Configuration Guide

This project uses environment variables for configuration. Follow these steps to set up your environment:

## Initial Setup

1. Copy the example environment file to create your own:
   
  cp .env.example .env
  

2. Edit the .env file and replace the placeholder values with your actual configuration:
   
  # AWS Configuration
  AWS_REGION=us-east-1
  AWS_ACCOUNT_ID=your-aws-account-id

  # Cognito Configuration
  IDENTITY_POOL_ID=your-identity-pool-id

  # Google OAuth Configuration
  GOOGLE_CLIENT_ID=your-google-client-id

  # S3 Bucket Names
  PRIVATE_BUCKET_NAME=your-private-bucket-name
  WEB_APP_BUCKET_NAME=your-webapp-bucket-name

  # CloudFront Configuration
  CLOUDFRONT_URL=https://your-distribution-id.cloudfront.net
  CLOUDFRONT_DISTRIBUTION_ID=your-distribution-id
  

3. Install the required dependencies:
   
  npm install dotenv
  

## Updating Frontend Configuration

After deployment or when you change your configuration, update the frontend files:

```
npm run update-config
```

This script will:
1. Load your environment variables from the `.env` file
2. Update the configuration in both `frontend/src/app.js` and `frontend/dist/app.js` (if it exists)

## Security Notes

- The `.env` file contains sensitive information and is excluded from version control
- Never commit your actual configuration values to the repository
- When sharing this project, always use the `.env.example` file with placeholder values
