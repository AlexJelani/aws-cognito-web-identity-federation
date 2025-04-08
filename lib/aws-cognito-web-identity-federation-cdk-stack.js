"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsCognitoWebIdentityFederationCdkStack = void 0;
const cdk = require("aws-cdk-lib");
const s3 = require("aws-cdk-lib/aws-s3");
const s3deploy = require("aws-cdk-lib/aws-s3-deployment");
const iam = require("aws-cdk-lib/aws-iam");
const cognito = require("aws-cdk-lib/aws-cognito");
const cloudfront = require("aws-cdk-lib/aws-cloudfront");
const origins = require("aws-cdk-lib/aws-cloudfront-origins");
const path = require("path");
class AwsCognitoWebIdentityFederationCdkStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        if (!props?.googleClientId) {
            throw new Error('googleClientId is required. Please provide it via context or environment variable.');
        }
        // Create S3 bucket for the web application
        this.appBucket = new s3.Bucket(this, 'WebAppBucket', {
            // We don't need website hosting configuration since we'll use CloudFront
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
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
            assumedBy: new iam.FederatedPrincipal('cognito-identity.amazonaws.com', {
                StringEquals: {
                    'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
                },
                'ForAnyValue:StringLike': {
                    'cognito-identity.amazonaws.com:amr': 'authenticated',
                },
            }, 'sts:AssumeRoleWithWebIdentity'),
        });
        // Grant authenticated users access to the private data bucket
        authenticatedRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['s3:GetObject', 's3:ListBucket'],
            resources: [
                this.privateDataBucket.bucketArn,
                `${this.privateDataBucket.bucketArn}/*`,
            ],
        }));
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
            distribution: this.distribution,
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
exports.AwsCognitoWebIdentityFederationCdkStack = AwsCognitoWebIdentityFederationCdkStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXdzLWNvZ25pdG8td2ViLWlkZW50aXR5LWZlZGVyYXRpb24tY2RrLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXdzLWNvZ25pdG8td2ViLWlkZW50aXR5LWZlZGVyYXRpb24tY2RrLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUVuQyx5Q0FBeUM7QUFDekMsMERBQTBEO0FBQzFELDJDQUEyQztBQUMzQyxtREFBbUQ7QUFDbkQseURBQXlEO0FBQ3pELDhEQUE4RDtBQUM5RCw2QkFBNkI7QUFNN0IsTUFBYSx1Q0FBd0MsU0FBUSxHQUFHLENBQUMsS0FBSztJQU1wRSxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQThDO1FBQ3RGLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLElBQUksQ0FBQyxLQUFLLEVBQUUsY0FBYyxFQUFFO1lBQzFCLE1BQU0sSUFBSSxLQUFLLENBQUMsb0ZBQW9GLENBQUMsQ0FBQztTQUN2RztRQUVELDJDQUEyQztRQUMzQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ25ELHlFQUF5RTtZQUN6RSxpQkFBaUIsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsU0FBUztZQUNqRCxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1lBQ3hDLGlCQUFpQixFQUFFLElBQUk7U0FDeEIsQ0FBQyxDQUFDO1FBRUgsb0NBQW9DO1FBQ3BDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQ2hFLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87WUFDeEMsaUJBQWlCLEVB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RyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDeEMsS0FBSyxFQUFFLEtBQUssQ0FBQyxjQUFjO1lBQzNCLFdBQVcsRUFBRSwwQ0FBMEM7U0FDeEQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUU7WUFDaEMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNO1lBQ2xCLFdBQVcsRUFBRSxZQUFZO1NBQzFCLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsMEJBQTBCLEVBQUU7WUFDbEQsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYztZQUN2QyxXQUFXLEVBQUUsbUNBQW1DO1NBQ2pELENBQUMsQ0FBQztRQUVILCtCQUErQjtRQUMvQixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLDRCQUE0QixFQUFFO1lBQ3BELEtBQUssRUFBRTs7aURBRW9DLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxjQUFjLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsTUFBTTs7OzBDQUd4RyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVU7OztrQkFHakQsSUFBSSxDQUFDLFlBQVksQ0FBQyxzQkFBc0I7T0FDbkQ7WUFDRCxXQUFXLEVBQUUsOEJBQThCO1NBQzVDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXZLRCwwRkF1S0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMgczNkZXBsb3kgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzLWRlcGxveW1lbnQnO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XG5pbXBvcnQgKiBhcyBjbG91ZGZyb250IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250JztcbmltcG9ydCAqIGFzIG9yaWdpbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQtb3JpZ2lucyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgaW50ZXJmYWNlIENvZ25pdG9XZWJJZGVudGl0eUZlZGVyYXRpb25TdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBnb29nbGVDbGllbnRJZD86IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIEF3c0NvZ25pdG9XZWJJZGVudGl0eUZlZGVyYXRpb25DZGtTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBhcHBCdWNrZXQ6IHMzLkJ1Y2tldDtcbiAgcHVibGljIHJlYWRvbmx5IHByaXZhdGVEYXRhQnVja2V0OiBzMy5CdWNrZXQ7XG4gIHB1YmxpYyByZWFkb25seSBpZGVudGl0eVBvb2w6IGNvZ25pdG8uQ2ZuSWRlbnRpdHlQb29sO1xuICBwdWJsaWMgcmVhZG9ubHkgZGlzdHJpYnV0aW9uOiBjbG91ZGZyb250LkRpc3RyaWJ1dGlvbjtcbiAgXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogQ29nbml0b1dlYklkZW50aXR5RmVkZXJhdGlvblN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGlmICghcHJvcHM/Lmdvb2dsZUNsaWVudElkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2dvb2dsZUNsaWVudElkIGlzIHJlcXVpcmVkLiBQbGVhc2UgcHJvdmlkZSBpdCB2aWEgY29udGV4dCBvciBlbnZpcm9ubWVudCB2YXJpYWJsZS4nKTtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgUzMgYnVja2V0IGZvciB0aGUgd2ViIGFwcGxpY2F0aW9uXG4gICAgdGhpcy5hcHBCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdXZWJBcHBCdWNrZXQnLCB7XG4gICAgICAvLyBXZSBkb24ndCBuZWVkIHdlYnNpdGUgaG9zdGluZyBjb25maWd1cmF0aW9uIHNpbmNlIHdlJ2xsIHVzZSBDbG91ZEZyb250XG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLCAvLyBCbG9jayBwdWJsaWMgYWNjZXNzIHNpbmNlIENsb3VkRnJvbnQgd2lsbCBhY2Nlc3MgaXRcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBTMyBidWNrZXQgZm9yIHByaXZhdGUgZGF0YVxuICAgIHRoaXMucHJpdmF0ZURhdGFCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdQcml2YXRlRGF0YUJ1Y2tldCcsIHtcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsXG4gICAgfSk7XG5cbiAgICAvLyBVcGxvYWQgc2FtcGxlIHByaXZhdGUgZGF0YSB0byB0aGUgcHJpdmF0ZSBidWNrZXRcbiAgICBuZXcgczNkZXBsb3kuQnVja2V0RGVwbG95bWVudCh0aGlzLCAnRGVwbG95UHJpdmF0ZURhdGEnLCB7XG4gICAgICBzb3VyY2VzOiBbczNkZXBsb3kuU291cmNlLmFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9wcml2YXRlLWRhdGEnKSldLFxuICAgICAgZGVzdGluYXRpb25CdWNrZXQ6IHRoaXMucHJpdmF0ZURhdGFCdWNrZXQsXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgQ2xvdWRGcm9udCBPcmlnaW4gQWNjZXNzIElkZW50aXR5IGZvciBTM1xuICAgIGNvbnN0IG9yaWdpbkFjY2Vzc0lkZW50aXR5ID0gbmV3IGNsb3VkZnJvbnQuT3JpZ2luQWNjZXNzSWRlbnRpdHkodGhpcywgJ09yaWdpbkFjY2Vzc0lkZW50aXR5Jywge1xuICAgICAgY29tbWVudDogJ0FsbG93IENsb3VkRnJvbnQgdG8gYWNjZXNzIHRoZSB3ZWIgYXBwIGJ1Y2tldCcsXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCByZWFkIHBlcm1pc3Npb25zIHRvIENsb3VkRnJvbnRcbiAgICB0aGlzLmFwcEJ1Y2tldC5ncmFudFJlYWQob3JpZ2luQWNjZXNzSWRlbnRpdHkpO1xuXG4gICAgLy8gQ3JlYXRlIENsb3VkRnJvbnQgZGlzdHJpYnV0aW9uXG4gICAgdGhpcy5kaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywgJ1dlYkFwcERpc3RyaWJ1dGlvbicsIHtcbiAgICAgIGRlZmF1bHRSb290T2JqZWN0OiAnaW5kZXguaHRtbCcsXG4gICAgICBkZWZhdWx0QmVoYXZpb3I6IHtcbiAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbih0aGlzLmFwcEJ1Y2tldCwge1xuICAgICAgICAgIG9yaWdpbkFjY2Vzc0lkZW50aXR5LFxuICAgICAgICB9KSxcbiAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXG4gICAgICAgIGNhY2hlUG9saWN5OiBjbG91ZGZyb250LkNhY2hlUG9saWN5LkNBQ0hJTkdfT1BUSU1JWkVELFxuICAgICAgfSxcbiAgICAgIGVycm9yUmVzcG9uc2VzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBodHRwU3RhdHVzOiA0MDQsXG4gICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJywgLy8gU1BBIHN1cHBvcnQgLSByZWRpcmVjdCA0MDRzIHRvIGluZGV4Lmh0bWxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgQ29nbml0byBJZGVudGl0eSBQb29sIHdpdGggR29vZ2xlIGFzIGlkZW50aXR5IHByb3ZpZGVyXG4gICAgdGhpcy5pZGVudGl0eVBvb2wgPSBuZXcgY29nbml0by5DZm5JZGVudGl0eVBvb2wodGhpcywgJ0lkZW50aXR5UG9vbCcsIHtcbiAgICAgIGFsbG93VW5hdXRoZW50aWNhdGVkSWRlbnRpdGllczogZmFsc2UsXG4gICAgICBpZGVudGl0eVBvb2xOYW1lOiAnUGV0SURGSURQb29sJyxcbiAgICAgIFxuICAgICAgLy8gQ29uZmlndXJlIEdvb2dsZSBhcyBpZGVudGl0eSBwcm92aWRlclxuICAgICAgc3VwcG9ydGVkTG9naW5Qcm92aWRlcnM6IHsgXG4gICAgICAgICdhY2NvdW50cy5nb29nbGUuY29tJzogcHJvcHMuZ29vZ2xlQ2xpZW50SWQgXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIElBTSByb2xlcyBmb3IgYXV0aGVudGljYXRlZCB1c2Vyc1xuICAgIGNvbnN0IGF1dGhlbnRpY2F0ZWRSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdDb2duaXRvQXV0aGVudGljYXRlZFJvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uRmVkZXJhdGVkUHJpbmNpcGFsKFxuICAgICAgICAnY29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tJyxcbiAgICAgICAge1xuICAgICAgICAgIFN0cmluZ0VxdWFsczoge1xuICAgICAgICAgICAgJ2NvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbTphdWQnOiB0aGlzLmlkZW50aXR5UG9vbC5yZWYsXG4gICAgICAgICAgfSxcbiAgICAgICAgICAnRm9yQW55VmFsdWU6U3RyaW5nTGlrZSc6IHtcbiAgICAgICAgICAgICdjb2duaXRvLWlkZW50aXR5LmFtYXpvbmF3cy5jb206YW1yJzogJ2F1dGhlbnRpY2F0ZWQnLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgICdzdHM6QXNzdW1lUm9sZVdpdGhXZWJJZGVudGl0eSdcbiAgICAgICksXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBhdXRoZW50aWNhdGVkIHVzZXJzIGFjY2VzcyB0byB0aGUgcHJpdmF0ZSBkYXRhIGJ1Y2tldFxuICAgIGF1dGhlbnRpY2F0ZWRSb2xlLmFkZFRvUG9saWN5KFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgIGFjdGlvbnM6IFsnczM6R2V0T2JqZWN0JywgJ3MzOkxpc3RCdWNrZXQnXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgdGhpcy5wcml2YXRlRGF0YUJ1Y2tldC5idWNrZXRBcm4sXG4gICAgICAgICAgYCR7dGhpcy5wcml2YXRlRGF0YUJ1Y2tldC5idWNrZXRBcm59LypgLFxuICAgICAgICBdLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gQXR0YWNoIHJvbGVzIHRvIHRoZSBpZGVudGl0eSBwb29sXG4gICAgbmV3IGNvZ25pdG8uQ2ZuSWRlbnRpdHlQb29sUm9sZUF0dGFjaG1lbnQodGhpcywgJ0lkZW50aXR5UG9vbFJvbGVBdHRhY2htZW50Jywge1xuICAgICAgaWRlbnRpdHlQb29sSWQ6IHRoaXMuaWRlbnRpdHlQb29sLnJlZixcbiAgICAgIHJvbGVzOiB7XG4gICAgICAgIGF1dGhlbnRpY2F0ZWQ6IGF1dGhlbnRpY2F0ZWRSb2xlLnJvbGVBcm4sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gUHJlcGFyZSBhbmQgZGVwbG95IGZyb250ZW5kIGZpbGVzXG4gICAgY29uc3QgZnJvbnRlbmREZXBsb3ltZW50ID0gbmV3IHMzZGVwbG95LkJ1Y2tldERlcGxveW1lbnQodGhpcywgJ0RlcGxveUZyb250ZW5kJywge1xuICAgICAgc291cmNlczogW3MzZGVwbG95LlNvdXJjZS5hc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vZnJvbnRlbmQvc3JjJykpXSxcbiAgICAgIGRlc3RpbmF0aW9uQnVja2V0OiB0aGlzLmFwcEJ1Y2tldCxcbiAgICAgIGRpc3RyaWJ1dGlvbjogdGhpcy5kaXN0cmlidXRpb24sIC8vIEFkZCBkaXN0cmlidXRpb24gdG8gaW52YWxpZGF0ZSBjYWNoZSBhZnRlciBkZXBsb3ltZW50XG4gICAgICBkaXN0cmlidXRpb25QYXRoczogWycvKiddLCAvLyBJbnZhbGlkYXRlIGFsbCBwYXRoc1xuICAgIH0pO1xuXG4gICAgLy8gT3V0cHV0IHZhbHVlc1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDbG91ZEZyb250VVJMJywge1xuICAgICAgdmFsdWU6IGBodHRwczovLyR7dGhpcy5kaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZX1gLFxuICAgICAgZGVzY3JpcHRpb246ICdVUkwgb2YgdGhlIENsb3VkRnJvbnQgZGlzdHJpYnV0aW9uJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdXZWJBcHBCdWNrZXROYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMuYXBwQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ05hbWUgb2YgdGhlIHdlYiBhcHBsaWNhdGlvbiBidWNrZXQnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1ByaXZhdGVEYXRhQnVja2V0TmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnByaXZhdGVEYXRhQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ05hbWUgb2YgdGhlIHByaXZhdGUgZGF0YSBidWNrZXQnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0lkZW50aXR5UG9vbElkJywge1xuICAgICAgdmFsdWU6IHRoaXMuaWRlbnRpdHlQb29sLnJlZixcbiAgICAgIGRlc2NyaXB0aW9uOiAnSUQgb2YgdGhlIENvZ25pdG8gSWRlbnRpdHkgUG9vbCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnR29vZ2xlQ2xpZW50SWQnLCB7XG4gICAgICB2YWx1ZTogcHJvcHMuZ29vZ2xlQ2xpZW50SWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0dvb2dsZSBDbGllbnQgSUQgdXNlZCBmb3IgYXV0aGVudGljYXRpb24nLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1JlZ2lvbicsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnJlZ2lvbixcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVdTIFJlZ2lvbicsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2xvdWRGcm9udERpc3RyaWJ1dGlvbklkJywge1xuICAgICAgdmFsdWU6IHRoaXMuZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbklkLFxuICAgICAgZGVzY3JpcHRpb246ICdJRCBvZiB0aGUgQ2xvdWRGcm9udCBkaXN0cmlidXRpb24nLFxuICAgIH0pO1xuXG4gICAgLy8gUG9zdC1kZXBsb3ltZW50IGluc3RydWN0aW9uc1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdQb3N0RGVwbG95bWVudEluc3RydWN0aW9ucycsIHtcbiAgICAgIHZhbHVlOiBgXG4gICAgICAgIEFmdGVyIGRlcGxveW1lbnQsIHJ1biB0aGUgZm9sbG93aW5nIGNvbW1hbmQgdG8gdXBkYXRlIHRoZSBmcm9udGVuZCBjb25maWd1cmF0aW9uOlxuICAgICAgICBub2RlIHNjcmlwdHMvdXBkYXRlLWZyb250ZW5kLWNvbmZpZy5qcyAke3RoaXMuaWRlbnRpdHlQb29sLnJlZn0gJHtwcm9wcy5nb29nbGVDbGllbnRJZH0gJHt0aGlzLnByaXZhdGVEYXRhQnVja2V0LmJ1Y2tldE5hbWV9ICR7dGhpcy5yZWdpb259XG4gICAgICAgIFxuICAgICAgICBUaGVuIGRlcGxveSB0aGUgdXBkYXRlZCBmcm9udGVuZDpcbiAgICAgICAgYXdzIHMzIHN5bmMgZnJvbnRlbmQvZGlzdC8gczM6Ly8ke3RoaXMuYXBwQnVja2V0LmJ1Y2tldE5hbWV9XG4gICAgICAgIFxuICAgICAgICBJbXBvcnRhbnQ6IFVwZGF0ZSB5b3VyIEdvb2dsZSBPQXV0aCAyLjAgQ2xpZW50IElEIHNldHRpbmdzIHRvIGluY2x1ZGUgdGhlIENsb3VkRnJvbnQgVVJMIGFzIGFuIGF1dGhvcml6ZWQgSmF2YVNjcmlwdCBvcmlnaW46XG4gICAgICAgIGh0dHBzOi8vJHt0aGlzLmRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lfVxuICAgICAgYCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUG9zdC1kZXBsb3ltZW50IGluc3RydWN0aW9ucycsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==