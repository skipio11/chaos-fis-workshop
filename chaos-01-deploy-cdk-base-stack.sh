#!/bin/bash
set -e

SCRIPT_DIR_NAME=`dirname "$0"`
WORK_DIR_PATH=`cd ${SCRIPT_DIR_NAME}; pwd -P`

. ${WORK_DIR_PATH}/chaos-env.sh

cd ${WORK_DIR_PATH}/chaos-stack && cdk deploy ChaosBaseStack --require-approval never --outputs-file ${CDK_OUTPUT_FILE_CHAOS_BASE_STACK}

CHAOS_BUCKET_NAME=`cat ${CDK_OUTPUT_FILE_CHAOS_BASE_STACK} | jq -r '.ChaosBaseStack.chaosBucketName'`
echo "CHAOS_BUCKET_NAME: ${CHAOS_BUCKET_NAME}"

exit 0;