import * as cdk from '@aws-cdk/core';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as iam from "@aws-cdk/aws-iam";
import * as asg from "@aws-cdk/aws-autoscaling";
import * as fis from "@aws-cdk/aws-fis";
import * as cw from "@aws-cdk/aws-cloudwatch";

interface ChaosFisStackProps extends cdk.StackProps {
    productCompositeAlb: elbv2.ApplicationLoadBalancer,
    productCompositeListenerTarget: elbv2.ApplicationTargetGroup
}

export class ChaosFisStack extends cdk.Stack {
    // TODO: stop conditions
  public readonly reviewAsg: asg.AutoScalingGroup;

  constructor(scope: cdk.Construct, id: string, props: ChaosFisStackProps) {
    super(scope, id, props);

    const fisRole = new iam.Role(this, "fisRole", {
          assumedBy: new iam.ServicePrincipal("fis.amazonaws.com"),
          managedPolicies: [
            iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
          ]
        }
    );
    const chaosSteadyStateAlarm = this.createChaosSteadyStateAlarm(props.productCompositeAlb.loadBalancerFullName, props.productCompositeListenerTarget.targetGroupFullName);
    this.createFisTemplateForCPUAttack(fisRole, chaosSteadyStateAlarm);
    this.createFisTemplateForInstanceTerminate(fisRole, chaosSteadyStateAlarm);
    this.createFisTemplateForNetwork(fisRole, chaosSteadyStateAlarm);
  }

  createChaosSteadyStateAlarm(albName: string, targetGroupName: string) : cw.Alarm {
    const chaosSteadyStateAlarm = new cw.Alarm(this, 'chaosSteadyStateAlarm', {
        alarmName: 'chaosSteadyStateAlarm',
        metric: new cw.Metric({
            metricName: 'TargetResponseTime',
            namespace: 'AWS/ApplicationELB',
            dimensions: {
                'LoadBalancer': albName,
                'TargetGroup': targetGroupName
            },
            statistic: 'p90',
        }).with( {
            period: cdk.Duration.seconds(60)
        }),
        threshold: 1,
        evaluationPeriods: 2,
        treatMissingData: cw.TreatMissingData.MISSING,
        comparisonOperator: cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        datapointsToAlarm: 2,
    });

    return chaosSteadyStateAlarm;
  }

  createFisTemplateForCPUAttack(fisRole: iam.Role, alarm: cw.Alarm) : void {
      const cpuAttackAction: fis.CfnExperimentTemplate.ExperimentTemplateActionProperty = {
          actionId: 'aws:ssm:send-command',
          parameters: {
              documentArn: "arn:aws:ssm:us-east-1::document/AWSFIS-Run-CPU-Stress",
              documentParameters: "{\"DurationSeconds\":\"300\", \"InstallDependencies\":\"True\"}",
              duration: 'PT5M',
          },
          targets: { Instances: 'targetInstances' },
      };

      const cpuAttackTarget: fis.CfnExperimentTemplate.ExperimentTemplateTargetProperty = {
          resourceType: 'aws:ec2:instance',
          resourceTags: { Name: 'ChaosProductCompositeStack/productCompositeAsg' },
          selectionMode: 'ALL',
          filters: [
              {
                  path:'State.Name',
                  values: [ 'running' ]
              }
          ]
      };

      const cpuAttackTemplate = new fis.CfnExperimentTemplate(this,'cpuAttackTemplate', {
          description: 'CPU Attack Template',
          roleArn: fisRole.roleArn,
          stopConditions: [{
              source: 'aws:cloudwatch:alarm',
              value: alarm.alarmArn
          }],
          tags: {'Name': 'CPU Attack Template'},
          actions: {
              'CPU-Attack-Action' : cpuAttackAction
          },
          targets: {
              'targetInstances': cpuAttackTarget
          }
      });
  };

  createFisTemplateForInstanceTerminate(fisRole: iam.Role, alarm: cw.Alarm) : void {
      const terminateAttackAction: fis.CfnExperimentTemplate.ExperimentTemplateActionProperty = {
          actionId: 'aws:ec2:terminate-instances',
          parameters: {
          },
          targets: { Instances: 'targetInstances' }
      };

      const terminateAttackTarget: fis.CfnExperimentTemplate.ExperimentTemplateTargetProperty = {
          resourceType: 'aws:ec2:instance',
          resourceTags: { Name: 'ChaosReviewStack/reviewAsg' },
          selectionMode: 'COUNT(1)',
          filters: [
              {
                  path:'State.Name',
                  values: [ 'running' ]
              }
          ]
      };

      const terminateAttackTemplate = new fis.CfnExperimentTemplate(this,'TerminateAttackTemplate', {
          description: 'Terminate Attack Template',
          roleArn: fisRole.roleArn,
          stopConditions: [{
              source: 'aws:cloudwatch:alarm',
              value: alarm.alarmArn
          }],
          tags: {'Name': 'Terminate Attack Template'},
          actions: {
              'Terminate-Attack-Action' : terminateAttackAction
          },
          targets: {
              'targetInstances': terminateAttackTarget
          }
      });
  };

  createFisTemplateForNetwork(fisRole: iam.Role, alarm: cw.Alarm) : void {
      const networkAttackAction: fis.CfnExperimentTemplate.ExperimentTemplateActionProperty = {
          actionId: 'aws:ssm:send-command',
          parameters: {
              documentArn: "arn:aws:ssm:us-east-1::document/AWSFIS-Run-Network-Latency",
              documentParameters: "{\"DelayMilliseconds\": \"5000\", \"Interface\": \"eth0\", \"DurationSeconds\":\"300\", \"InstallDependencies\":\"True\"}",
              duration: 'PT5M',
          },
          targets: { Instances: 'targetInstances' }
      };

      const networkAttackTarget: fis.CfnExperimentTemplate.ExperimentTemplateTargetProperty = {
          resourceType: 'aws:ec2:instance',
          resourceTags: { Name: 'ChaosRecommendationStack/recommendationAsg' },
          selectionMode: 'ALL',
          filters: [
              {
                  path:'State.Name',
                  values: [ 'running' ]
              }
          ]
      };

      const networkAttackTemplate = new fis.CfnExperimentTemplate(this,'networkAttackTemplate', {
          description: 'Network Attack Template',
          roleArn: fisRole.roleArn,
          stopConditions: [{
              source: 'aws:cloudwatch:alarm',
              value: alarm.alarmArn
          }],
          tags: {'Name': 'Network Attack Template'},
          actions: {
              'Network-Attack-Action' : networkAttackAction
          },
          targets: {
              'targetInstances': networkAttackTarget
          }
      });
  };
}
