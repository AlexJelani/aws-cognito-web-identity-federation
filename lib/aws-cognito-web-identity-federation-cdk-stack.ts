import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as path from 'path';

export interface CognitoWebIdentityFederationStackProps extends cdk.StackProps {
  googleClientId?: string;
}

export class AwsCognitoWebIdentityFederationCdkStack extends cdk.Stack {
  public readonly appBucket: s3.Bucket;
  public readonly privateDataBucket: s3.Bucket;
  public readonly identityPool: cognito.CfnIdentityPool;
  public readonly distribution: cloudfront.Distribution;
  
  constructor(scope: Construct, id: string, props?: CognitoWebIdentityFederationStackProps) {
    super(scope, id, props);

    if (!props?.googleClientId) {
      throw new Error('googleClientId is required. Please provide it via context or environment variable.');
    }

    // Create S3 bucket for the web application
    this.appBucket = new s3.Bucket(this, 'WebAppBucket', {
      // We don't need website hosting configuration since we'll use CloudFront
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // Block public access since CloudFront will access it
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Create S3 bucket for private data
    this.privateDataBucket = new s3.Bucket(this, 'PrivateDataBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Upload sample private data to the private bucket
    new s3deploy.BucketDeployment(this, 'DeployPrivateData', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../private-data'))],
      destinationBucket: this.privateDataBucket,
    });

    // Create CloudFront Origin Access Identity for S3
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OriginAccessIdentity', {
      comment: 'Allow CloudFront to access the web app bucket',
    });

    // Grant read permissions to CloudFront
    this.appBucket.grantRead(originAccessIdentity);

    // Create CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'WebAppDistribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new origins.S3Origin(this.appBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html', // SPA support - redirect 404s to index.html
        },
      ],
    });

    // Create Cognito Identity Pool with Google as identity provider
    this.identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      allowUnauthenticatedIdentities: false,
      identityPoolName: 'PetIDFIDPool',
      
      // Configure Google as identity provider
      supportedLoginProviders: { 
        'accounts.google.com': props.googleClientId 
      },
    });

    // Create IAM roles for authenticated users
    const authenticatedRole = new iam.Role(this, 'CognitoAuthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    // Grant authenticated users access to the private data bucket
    authenticatedRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:GetObject', 's3:ListBucket'],
        resources: [
          this.privateDataBucket.bucketArn,
          `${this.privateDataBucket.bucketArn}/*`,
        ],
      })
    );

    // Attach roles to the identity pool
    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: this.identityPool.ref,
      roles: {
        authenticated: authenticatedRole.roleArn,
      },
    });

    // Prepare and deploy frontend files
    const frontendDeployment = new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../frontend/src'))],
      destinationBucket: this.appBucket,
      distribution: this.distribution, // Add distribution to invalidate cache after deployment
      distributionPaths: ['/*'], // Invalidate all paths
    });

    // Output values
    new cdk.CfnOutput(this, 'CloudFrontURL', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'URL of the CloudFront distribution',
    });

    new cdk.CfnOutput(this, 'WebAppBucketName', {
      value: this.appBucket.bucketName,
      description: 'Name of the web application bucket',
    });

    new cdk.CfnOutput(this, 'PrivateDataBucketName', {
      value: this.privateDataBucket.bucketName,
      description: 'Name of the private data bucket',
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: this.identityPool.ref,
      description: 'ID of the Cognito Identity Pool',
    });

    new cdk.CfnOutput(this, 'GoogleClientId', {
      value: props.googleClientId,
      description: 'Google Client ID used for authentication',
    });

    new cdk.CfnOutput(this, 'Region', {
      value: this.region,
      description: 'AWS Region',
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.distributionId,
      description: 'ID of the CloudFront distribution',
    });

    // Post-deployment instructions
    new cdk.CfnOutput(this, 'PostDeploymentInstructions', {
      value: `
        After deployment, run the following command to update the frontend configuration:
        node scripts/update-frontend-config.js ${this.identityPool.ref} ${props.googleClientId} ${this.privateDataBucket.bucketName} ${this.region}
        
        Then deploy the updated frontend:
        aws s3 sync frontend/dist/ s3://${this.appBucket.bucketName}
        
        Important: Update your Google OAuth 2.0 Client ID settings to include the CloudFront URL as an authorized JavaScript origin:
        https://${this.distribution.distributionDomainName}
      `,
      description: 'Post-deployment instructions',
    });
  }
}
