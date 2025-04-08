# AWS Cognito Web Identity Federation Project Documentation

This document provides an overview of the AWS Cognito Web Identity Federation project and the changes made with Amazon Q's assistance.

## Project Overview

This project implements a web application that uses AWS Cognito Web Identity Federation with Google as an identity provider. The application allows users to sign in with their Google accounts and view pet images stored in a private S3 bucket.

## Key Components

1. **Frontend Application**:
   - HTML/CSS/JavaScript web application
   - Google Identity Services for authentication
   - AWS SDK for JavaScript to interact with AWS services

2. **AWS Infrastructure** (deployed with CDK):
   - S3 bucket for hosting the web application
   - CloudFront distribution for content delivery
   - Private S3 bucket for storing pet images
   - Cognito Identity Pool with Google as an identity provider
   - IAM roles for authenticated users

## Issues Fixed

### 1. Google Authentication API Migration

The original implementation used the deprecated Google Sign-In API. This was updated to use the new Google Identity Services (GIS) platform.

Changes made:
- Replaced the old Google Sign-In script with the new GIS script
- Updated the authentication flow to use the new API
- Added proper JWT token handling

### 2. CORS Configuration

Added CORS configuration to the private S3 bucket to allow access from the CloudFront domain:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://d2xb6jeb0obylb.cloudfront.net"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

### 3. Image Loading Path

Updated the image loading code to correctly access images in the `private-data/pets/` directory of the S3 bucket.

### 4. Sign Out Functionality

Added sign-out functionality to allow users to log out of the application:
- Added a sign-out button to the UI
- Implemented a sign-out function that:
  - Clears AWS credentials
  - Revokes Google token
  - Resets the UI to the signed-out state

## Security Considerations

1. **Authentication**: The application uses Google as a trusted identity provider through AWS Cognito.

2. **Authorization**: IAM roles control what authenticated users can access:
   - Authenticated users can only access objects in the private S3 bucket
   - The IAM policy grants only `s3:GetObject` and `s3:ListBucket` permissions

3. **Content Delivery**: CloudFront provides secure content delivery with HTTPS.

## Future Improvements

1. Add support for multiple identity providers (e.g., Facebook, Amazon)
2. Implement user-specific folders in the S3 bucket
3. Add image upload functionality
4. Enhance the UI with better styling and responsive design
5. Add server-side validation of tokens
