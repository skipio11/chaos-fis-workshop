import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as asg from "@aws-cdk/aws-autoscaling";
import * as cw from "@aws-cdk/aws-cloudwatch";
import * as iam from '@aws-cdk/aws-iam';

interface ChaosMonitoringStackProps extends cdk.StackProps {
  vpc: ec2.Vpc,
  productCompositeAlb: elbv2.ApplicationLoadBalancer,
  productCompositeAsg: asg.AutoScalingGroup,
  productCompositeListenerTarget: elbv2.ApplicationTargetGroup
  eurekaAsg: asg.AutoScalingGroup,
  productAsg: asg.AutoScalingGroup,
  recommendationAsg: asg.AutoScalingGroup,
  reviewAsg: asg.AutoScalingGroup,
}

export class ChaosMonitoringStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: ChaosMonitoringStackProps) {
    super(scope, id, props);

    const chaosMonitoringDashboard = new cw.Dashboard(this, 'chaosMonitoringDashboard', {dashboardName: 'chaosMonitoringDashboard', start: '-PT15M'});

    chaosMonitoringDashboard.addWidgets(
        this.createAsgWidget('product-composite', 'CPUUtilization', props.productCompositeAsg.autoScalingGroupName),
        this.createAsgWidget('product', 'CPUUtilization', props.productAsg.autoScalingGroupName),
        this.createAsgWidget('recommendation', 'CPUUtilization', props.recommendationAsg.autoScalingGroupName),
        this.createAsgWidget('review', 'CPUUtilization', props.reviewAsg.autoScalingGroupName),
        // this.createAsgWidget('eureka', 'CPUUtilization', props.eurekaAsg.autoScalingGroupName),
        this.createAlbWidget('product-composite', 'RequestCount', props.productCompositeAlb.loadBalancerFullName, props.productCompositeListenerTarget.targetGroupFullName),
        this.createAlbWidget('product-composite', 'HTTPCode_ELB_5XX_Count', props.productCompositeAlb.loadBalancerFullName, props.productCompositeListenerTarget.targetGroupFullName),
        // this.createAlbWidget('product-composite', 'HTTPCode_ELB_3XX_Count', props.productCompositeAlb.loadBalancerFullName, props.productCompositeListenerTarget.targetGroupFullName),
        // this.createAlbWidget('product-composite', 'HTTPCode_ELB_4XX_Count', props.productCompositeAlb.loadBalancerFullName, props.productCompositeListenerTarget.targetGroupFullName),
        this.createAlbWidget('product-composite', 'TargetResponseTime', props.productCompositeAlb.loadBalancerFullName, props.productCompositeListenerTarget.targetGroupFullName, 'avg'),
        this.createAlbWidget('product-composite', 'TargetResponseTime', props.productCompositeAlb.loadBalancerFullName, props.productCompositeListenerTarget.targetGroupFullName, 'p90'),
        // this.createAlbWidget('product-composite', 'TargetResponseTime', props.productCompositeAlb.loadBalancerFullName, props.productCompositeListenerTarget.targetGroupFullName, 'p95'),
        // this.createAlbWidget('product-composite', 'TargetResponseTime', props.productCompositeAlb.loadBalancerFullName, props.productCompositeListenerTarget.targetGroupFullName, 'p99'),
    );
  }

  createAlbWidget(serviceName: string, metricName: string, albName: string, targetGroupName: string, statistic: string = 'sum', namespace: string = 'AWS/ApplicationELB') : cw.GraphWidget {
    return new cw.GraphWidget({
      title: serviceName + '/' + metricName + '/' + statistic,
      width: 12,
      left: [
        new cw.Metric({
          namespace: namespace,
          metricName: metricName,
          dimensions: {
            'LoadBalancer': albName,
            'TargetGroup': targetGroupName
          },
          statistic: statistic,
          period: cdk.Duration.minutes(1)
        }),
      ]
    })
  }

  createAsgWidget(serviceName: string, metricName: string, asgName: string, statistic: string = 'avg', namespace: string = 'AWS/EC2', ) : cw.GraphWidget {
    return new cw.GraphWidget({
      title: serviceName + '/' + metricName + '/' + statistic,
      width: 12,
      left: [ new cw.Metric({
        namespace: namespace,
        metricName: metricName,
        dimensions: {
          'AutoScalingGroupName': asgName,
        },
        statistic: statistic,
        period: cdk.Duration.minutes(1)
      }),
      ]
    })
  }
}
