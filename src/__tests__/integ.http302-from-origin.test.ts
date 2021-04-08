import { SynthUtils, arrayWith } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import * as cf from '@aws-cdk/aws-cloudfront';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as cdk from '@aws-cdk/core';
import * as extensions from '../extensions';

test('check HTTP302FromOrigin setting', () => {
  // GIVEN
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'http302-demo');

  // WHEN
  new extensions.HTTP302FromOrigin(stack, 'http302');

  // WHEN
  // check http302FromOrigin SAR version
  expect(stack).toHaveResourceLike('AWS::Serverless::Application', {
    Location: {
      ApplicationId: 'arn:aws:serverlessrepo:us-east-1:418289889111:applications/http302-from-origin',
      SemanticVersion: '1.0.2',
    },
  });

  // check where to get lambda version
  expect(stack).toHaveResourceLike('AWS::Lambda::Version', {
    FunctionName: {
      'Fn::Select': arrayWith(
        {
          'Fn::Split': arrayWith(
            {
              'Fn::GetAtt': [
                'http30232E1FD3B',
                'Outputs.Http302Function',
              ],
            },
          ),
        },
      ),
    },
  });
});

test('check ALB & cloudfront setting', () => {
  // GIVEN
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'http302-demo');

  // create the cloudfront distribution with extension(s)
  const http302FromOrigin = new extensions.HTTP302FromOrigin(stack, 'http302');

  // WHEN
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

  // cloudfront
  new cf.CloudFrontWebDistribution(stack, 'DemoCloudFront', {
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

  // THEN
  expect(SynthUtils.synthesize(stack).template).toMatchSnapshot();

  // check ALB redirect
  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::Listener', {
    DefaultActions: [
      {
        RedirectConfig: {
          Host: 'neverssl.com',
          Path: '/',
          Protocol: 'HTTP',
          StatusCode: 'HTTP_302',
        },
        Type: 'redirect',
      },
    ],
    Port: 80,
    Protocol: 'HTTP',
  });

  // check cloudfront setting & lambda association
  expect(stack).toHaveResourceLike('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      DefaultCacheBehavior: {
        LambdaFunctionAssociations: [
          {
            EventType: 'origin-response',
            LambdaFunctionARN: {
              Ref: 'LambdaVersionhttp30247FAA424',
            },
          },
        ],
        ViewerProtocolPolicy: 'allow-all',
      },
      Origins: [
        {
          CustomOriginConfig: {
            OriginProtocolPolicy: 'http-only',
          },
          DomainName: {
            'Fn::GetAtt': [
              'Alb302Redirect610ABF15',
              'DNSName',
            ],
          },
        },
      ],
    },
  });
});
