import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as targets from '@aws-cdk/aws-elasticloadbalancingv2-targets';
import * as iam from "@aws-cdk/aws-iam";
import * as asg from "@aws-cdk/aws-autoscaling";
import * as cw from "@aws-cdk/aws-cloudwatch";

interface ChaosLoadGeneratorStackProps extends cdk.StackProps {
  productCompositeAlbDnsName: String,
}

export class ChaosLoadGeneratorStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: ChaosLoadGeneratorStackProps) {
    super(scope, id, props);
    const vpc = new ec2.Vpc(this, 'VPC');

    const securityGroup = new ec2.SecurityGroup(this, 'securityGroup', {
      vpc,
      description: '',
      allowAllOutbound: true   // Can be set to false
    });

    // TODO : delete
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Temporary');

    const ec2Role = new iam.Role(this, "ec2Role", {
          assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
          managedPolicies: [
            iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
            iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess'),
            iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy')
          ]
        }
    );

    const amznLinux = ec2.MachineImage.latestAmazonLinux({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      edition: ec2.AmazonLinuxEdition.STANDARD,
      virtualization: ec2.AmazonLinuxVirt.HVM,
      storage: ec2.AmazonLinuxStorage.GENERAL_PURPOSE,
      cpuType: ec2.AmazonLinuxCpuType.X86_64,
    });

    const instanceType = ec2.InstanceType.of(ec2.InstanceClass.M5, ec2.InstanceSize.LARGE);

    const loadGenerator = new ec2.Instance(this, 'loadGenerator', {
      vpc,
      role: ec2Role,
      instanceType: instanceType,
      machineImage: amznLinux,
      vpcSubnets: vpc.selectSubnets({subnetType: ec2.SubnetType.PRIVATE}),
      securityGroup: securityGroup,
      //https://github.com/nakabonne/ali
      userData: ec2.UserData.custom(`
        #!/bin/bash
        yum update -y
        yum install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm && systemctl enable amazon-ssm-agent && systemctl start amazon-ssm-agent
        rpm -ivh https://github.com/nakabonne/ali/releases/download/v0.5.4/ali_0.5.4_linux_amd64.rpm
        mkdir -p /root/ali && cd /root/ali
        echo "ali --rate=2000 --duration=0 http://${props.productCompositeAlbDnsName}/product-composites/product-001" > execute.sh && chmod 744 ./execute.sh
      `)
    });
  }
}
