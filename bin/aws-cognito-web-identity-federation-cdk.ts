#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AwsCognitoWebIdentityFederationCdkStack } from '../lib/aws-cognito-web-identity-federation-cdk-stack';

const app = new cdk.App();

// Get Google Client ID from context or environment variable
const googleClientId = app.node.tryGetContext('googleClientId') || process.env.GOOGLE_CLIENT_ID;

if (!googleClientId) {
  throw new Error('Google Client ID is not provided. Please set it in the context or GOOGLE_CLIENT_ID environment variable.');
}

if (!googleClientId) {
  throw new Error('Google Client ID is not provided. Please set it in the context or as an environment variable.');
}

new AwsCognitoWebIdentityFederationCdkStack(app, 'AwsCognitoWebIdentityFederationCdkStack', {
  googleClientId: googleClientId,
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1' 
  },
});
