#!/usr/bin/env bash

# runs browser tests targeted against the local environment
# this script prefers to be run with
#   npm run local:selenium

set -eu
script_dir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
core_dir="$script_dir/../../../"

set -a
source $core_dir/.env

npm run selenium-test -- "$@"
