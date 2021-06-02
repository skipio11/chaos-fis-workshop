#!/bin/bash
set -e

SCRIPT_DIR_NAME=`dirname "$0"`
WORK_DIR_PATH=`cd ${SCRIPT_DIR_NAME}; pwd -P`

. ${WORK_DIR_PATH}/chaos-env.sh

cd ${WORK_DIR_PATH}/chaos-stack && cdk deploy --all --require-approval never

exit 0;