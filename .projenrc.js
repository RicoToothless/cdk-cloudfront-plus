const { AwsCdkConstructLibrary } = require('projen');
const { Automation } = require('projen-automate-it');

const AUTOMATION_TOKEN = 'PROJEN_GITHUB_TOKEN';

const project = new AwsCdkConstructLibrary({
  author: 'Pahud Hsieh',
  authorAddress: 'pahudnet@gmail.com',
  description: 'CDK construct library for CloudFront Extensions',
  cdkVersion: '1.73.0',
  defaultReleaseBranch: 'main',
  jsiiFqn: 'projen.AwsCdkConstructLibrary',
  name: 'cdk-cloudfront-plus',
  repositoryUrl: 'https://github.com/pahudnet/cdk-cloudfront-plus.git',
  cdkDependencies: [
    '@aws-cdk/core',
    '@aws-cdk/aws-cloudfront',
    '@aws-cdk/aws-cloudfront-origins',
    '@aws-cdk/aws-lambda',
    '@aws-cdk/aws-sam',
  ],
  devDeps: [
    'projen-automate-it',
  ],
  publishToPypi: {
    distName: 'cdk-cloudfront-plus',
    module: 'cdk_cloudfront_plus',
  },
  dependabot: false,
});

const automation = new Automation(project, {
  automationToken: AUTOMATION_TOKEN,
});
automation.autoApprove();
automation.autoMerge();
automation.projenYarnUpgrade();

const common_exclude = ['cdk.out', 'cdk.context.json', 'images', 'yarn-error.log', 'dependabot.yml'];
project.npmignore.exclude(...common_exclude);
project.gitignore.exclude(...common_exclude);

project.synth();