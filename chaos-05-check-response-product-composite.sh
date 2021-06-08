#!/bin/bash
set -e

SCRIPT_DIR_NAME=`dirname "$0"`
WORK_DIR_PATH=`cd ${SCRIPT_DIR_NAME}; pwd -P`

. ${WORK_DIR_PATH}/chaos-env.sh

curl http://Chaos-produ-WVT4FHV97CN9-1683737146.us-east-1.elb.amazonaws.com/product-composites/product-001 | jq .

exit 0;