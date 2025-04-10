#!/bin/bash

echo "Security Credential Rotation Script"
echo "================================="
echo
echo "This script will help guide you through rotating the exposed credentials."
echo
echo "Steps to take:"
echo "1. Go to AWS Console -> Cognito -> Identity Pools"
echo "2. Create a new Identity Pool or update the existing one"
echo "3. Update Google OAuth credentials in Google Cloud Console"
echo "4. Update your .env file with the new values"
echo "5. Run 'node scripts/update-config.js' to update the frontend configuration"
echo
echo "Important: Make sure to update any CI/CD pipelines with the new values"