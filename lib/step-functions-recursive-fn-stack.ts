import { Stack, StackProps, Duration, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as events from 'aws-cdk-lib/aws-events';

export class StepFunctionsRecursiveFnStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const getStatusLambda = new lambda.NodejsFunction(this, 'GetStatusLambda', {
      entry: './src/getStatus.ts',
    });

    const submitLambda = new lambda.NodejsFunction(this, 'SubmitLambda', {
      entry: './src/submit.ts',
    });

    const submitJob = new tasks.LambdaInvoke(this, 'SubmitJob', {
      lambdaFunction: submitLambda,
      outputPath: '$.Payload'
    })

    const waitX = new sfn.Wait(this, 'Wait X Seconds', {
      time: sfn.WaitTime.duration(Duration.seconds(30)),
    });

    const getStatus = new tasks.LambdaInvoke(this, 'Get Job Status', {
      lambdaFunction: getStatusLambda,
      outputPath: '$.Payload',
    });

    const jobFailed = new sfn.Fail(this, 'Job Failed', {
      cause: 'AWS Batch Job Failed',
      error: 'DescribeJob returned FAILED',
    });

    const finalStatus = new tasks.LambdaInvoke(this, 'Get Final Job Status', {
      lambdaFunction: getStatusLambda,
      outputPath: '$.Payload',
    });

    const definition = submitJob
      .next(waitX)
      .next(getStatus)
      .next(new sfn.Choice(this, 'Job Complete?')
        .when(sfn.Condition.stringEquals('$.status', 'FAILED'), jobFailed)
        .when(sfn.Condition.stringEquals('$.status', 'SUCCEEDED'), finalStatus)
        .otherwise(waitX));

    const stateMachine = new sfn.StateMachine(this, 'CronStateMachine', {
      definition,
      timeout: Duration.minutes(5),
    });

    submitLambda.grantInvoke(stateMachine.role);
    getStatusLambda.grantInvoke(stateMachine.role);

    // Need to figure out how to trigger this from the command line
    const rule = new events.Rule(this, 'Rule', {
      schedule: events.Schedule.expression('cron(0 18 ? * MON-FRI *)')
    });

    rule.addTarget(new targets.SfnStateMachine(stateMachine));

    new CfnOutput(this, 'Manually trigger scheduled task', {
      value:  `aws events put-rule --name ${rule.ruleName} --schedule-expression 'rate(1 day)'`
    })
  }
}
