import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as iam from "@aws-cdk/aws-iam";
import * as asg from "@aws-cdk/aws-autoscaling";
import * as s3 from '@aws-cdk/aws-s3';

interface ChaosProductCompositeStackProps extends cdk.StackProps {
  vpc: ec2.Vpc,
  appSecurityGroup: ec2.SecurityGroup,
  albSecurityGroup: ec2.SecurityGroup,
  eurekaAlbDnsName: String,
  chaosBucket: s3.Bucket,
}

export class ChaosProductCompositeStack extends cdk.Stack {
  public readonly productCompositeAlb: elbv2.ApplicationLoadBalancer;
  public readonly productCompositeAsg: asg.AutoScalingGroup;
  public readonly productCompositeListenerTarget: elbv2.ApplicationTargetGroup;

  constructor(scope: cdk.Construct, id: string, props: ChaosProductCompositeStackProps) {
    super(scope, id, props);
    const vpc = props.vpc;

    const ec2Role = new iam.Role(this, "ec2Role", {
          assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
          managedPolicies: [
            iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
            iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess'),
            iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy')
          ]
        }
    );
    props.chaosBucket.grantRead(ec2Role);

    const amznLinux = ec2.MachineImage.latestAmazonLinux({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      edition: ec2.AmazonLinuxEdition.STANDARD,
      virtualization: ec2.AmazonLinuxVirt.HVM,
      storage: ec2.AmazonLinuxStorage.GENERAL_PURPOSE,
      cpuType: ec2.AmazonLinuxCpuType.X86_64,
    });

    const instanceType = ec2.InstanceType.of(ec2.InstanceClass.M5, ec2.InstanceSize.LARGE);

    this.productCompositeAsg = new asg.AutoScalingGroup(this, 'productCompositeAsg', {
      vpc,
      role: ec2Role,
      instanceType: instanceType,
      machineImage: amznLinux,
      vpcSubnets: vpc.selectSubnets({subnetType: ec2.SubnetType.PRIVATE}),
      securityGroup: props.appSecurityGroup,
      minCapacity: 2,
      maxCapacity: 2,
      desiredCapacity: 2,
      instanceMonitoring: asg.Monitoring.DETAILED,
      userData: ec2.UserData.custom(`
        #!/bin/bash
        yum update -y
        yum install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm && systemctl enable amazon-ssm-agent && systemctl start amazon-ssm-agent
        yum install java-11-amazon-corretto -y
        yum install amazon-cloudwatch-agent -y && amazon-cloudwatch-agent-ctl -a start
        yum install -y https://s3.us-east-2.amazonaws.com/aws-xray-assets.us-east-2/xray-daemon/aws-xray-daemon-3.x.rpm
        mkdir -p /root/xray/ && cd /root/xray && wget https://github.com/aws/aws-xray-java-agent/releases/latest/download/xray-agent.zip && unzip xray-agent.zip
        mkdir -p /root/log & mkdir -p /root/product-composite && cd /root/product-composite
        echo 'aws s3 cp s3://${props.chaosBucket.bucketName}/product-composite.jar  ./product-composite.jar' >> start.sh
        echo 'java -jar -javaagent:/root/xray/disco/disco-java-agent.jar=pluginPath=/root/xray/disco/disco-plugins -Dcom.amazonaws.xray.strategy.tracingName=product-composite -Dspring.profiles.active=aws -Deureka.client.serviceUrl.defaultZone=http://${props.eurekaAlbDnsName}/eureka/ -Dlogging.file.path=/root/log product-composite.jar &' >> start.sh
        sh start.sh
      `)
    });
    this.productCompositeAsg.scaleOnCpuUtilization('productCompositeAsgScalingOnCpu', {
      targetUtilizationPercent: 60
    });

    this.productCompositeAlb = new elbv2.ApplicationLoadBalancer(this, 'productCompositeAlb', {
      vpc,
      securityGroup: props.albSecurityGroup,
      vpcSubnets: vpc.selectSubnets({subnetType:  ec2.SubnetType.PUBLIC} ),
      internetFacing: true,
    });

    const productCompositeListener = this.productCompositeAlb.addListener('productCompositeListener', {
      port: 80,
    });

    this.productCompositeListenerTarget = productCompositeListener.addTargets('productCompositeAlbTargets', {
      port: 80,
      targets: [
        this.productCompositeAsg
      ]
    });

    new cdk.CfnOutput(this, 'productCompositeAlbDnsName', { value: this.productCompositeAlb.loadBalancerDnsName });
  }
}
