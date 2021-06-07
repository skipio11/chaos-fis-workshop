import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as targets from '@aws-cdk/aws-elasticloadbalancingv2-targets';
import * as iam from "@aws-cdk/aws-iam";
import * as asg from "@aws-cdk/aws-autoscaling";
import * as fis from "@aws-cdk/aws-fis";
import * as cw from "@aws-cdk/aws-cloudwatch";

interface ChaosFisStackProps extends cdk.StackProps {

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
    this.createFisTemplateForCPUAttack(fisRole);
    this.createFisTemplateForInstanceTerminate(fisRole);
    this.createFisTemplateForNetwork(fisRole);
  }

  createFisTemplateForCPUAttack(fisRole: iam.Role) : void {
      const cpuAttackAction: fis.CfnExperimentTemplate.ExperimentTemplateActionProperty = {
          // actionId: 'aws:ssm:send-command/AWSFIS-Run-CPU-Stress',
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
          stopConditions: [
              { source: 'none' }
          ],
          tags: {'Name': 'CPU Attack Template'},
          actions: {
              'CPU-Attack-Action' : cpuAttackAction
          },
          targets: {
              'targetInstances': cpuAttackTarget
          }
      });
  };

  createFisTemplateForInstanceTerminate(fisRole: iam.Role) : void {
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
          stopConditions: [
              { source: 'none' }
          ],
          tags: {'Name': 'Terminate Attack Template'},
          actions: {
              'Terminate-Attack-Action' : terminateAttackAction
          },
          targets: {
              'targetInstances': terminateAttackTarget
          }
      });
  };

  createFisTemplateForNetwork(fisRole: iam.Role) : void {
      const networkAttackAction: fis.CfnExperimentTemplate.ExperimentTemplateActionProperty = {
          actionId: 'aws:ssm:send-command',
          parameters: {
              documentArn: "arn:aws:ssm:us-east-1::document/AWSFIS-Run-Network-Latency",
              documentParameters: "{\"DelayMilliseconds\": \"500\", \"Interface\": \"eth0\", \"DurationSeconds\":\"300\", \"InstallDependencies\":\"True\"}",
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
          stopConditions: [
              { source: 'none' }
          ],
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
