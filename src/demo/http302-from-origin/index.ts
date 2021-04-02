import * as cf from '@aws-cdk/aws-cloudfront';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as cdk from '@aws-cdk/core';
import * as extensions from '../../extensions';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'http302-demo');

// create the cloudfront distribution with extension(s)
const http302FromOrigin = new extensions.HTTP302FromOrigin(stack, 'http302');

// ALB
const publicSubnet = {
  cidrMask: 20,
  name: 'Public',
  subnetType: ec2.SubnetType.PUBLIC,
};

const vpc = new ec2.Vpc(stack, 'Vpc', {
  natGateways: 0,
  subnetConfiguration: [publicSubnet],
});

const demoAlb = new elbv2.ApplicationLoadBalancer(stack, 'Alb302Redirect', {
  vpc: vpc,
  internetFacing: true,
});

demoAlb.connections.allowFrom(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
demoAlb.addListener('Alb302RedirectRule', {
  port: 80,
  defaultAction: elbv2.ListenerAction.redirect({
    protocol: 'HTTP',
    host: 'neverssl.com',
    path: '/',
  }),
});

// cloudfront without lambda function
const demoCloudFrontNoLambda = new cf.CloudFrontWebDistribution(stack, 'DemoCloudFrontNoLambda', {
  viewerProtocolPolicy: cf.ViewerProtocolPolicy.ALLOW_ALL,
  originConfigs: [
    {
      customOriginSource: {
        originProtocolPolicy: cf.OriginProtocolPolicy.HTTP_ONLY,
        domainName: demoAlb.loadBalancerDnsName,
      },
      behaviors: [{
        isDefaultBehavior: true,
      }],
    },
  ],
});

// cloudfront
const demoCloudFront = new cf.CloudFrontWebDistribution(stack, 'DemoCloudFront', {
  viewerProtocolPolicy: cf.ViewerProtocolPolicy.ALLOW_ALL,
  originConfigs: [
    {
      customOriginSource: {
        originProtocolPolicy: cf.OriginProtocolPolicy.HTTP_ONLY,
        domainName: demoAlb.loadBalancerDnsName,
      },
      behaviors: [{
        isDefaultBehavior: true,
        lambdaFunctionAssociations: [http302FromOrigin],
      }],
    },
  ],
});

new cdk.CfnOutput(stack, 'demoAlbDomainName', {
  value: 'http://' + demoAlb.loadBalancerDnsName,
});
new cdk.CfnOutput(stack, 'demoDomainNameNoLambda', {
  value: 'http://' + demoCloudFrontNoLambda.distributionDomainName,
});
new cdk.CfnOutput(stack, 'demoDomainName', {
  value: 'http://' + demoCloudFront.distributionDomainName,
});
