import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
export interface CognitoWebIdentityFederationStackProps extends cdk.StackProps {
    googleClientId?: string;
}
export declare class AwsCognitoWebIdentityFederationCdkStack extends cdk.Stack {
    readonly appBucket: s3.Bucket;
    readonly privateDataBucket: s3.Bucket;
    readonly identityPool: cognito.CfnIdentityPool;
    readonly distribution: cloudfront.Distribution;
    constructor(scope: Construct, id: string, props?: CognitoWebIdentityFederationStackProps);
}
