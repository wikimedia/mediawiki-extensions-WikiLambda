#!/usr/bin/env bash

# cleans up and resets a local development environment
# this script prefers to be invoked via npm:
#   npm run local:reset

set -eu

script_dir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
core_dir="$script_dir/../../../"

docker compose down
rm -rf "$core_dir/cache/sqlite/"
if [[ -f "$core_dir/LocalSettings.php" ]]; then
	mv $core_dir/LocalSettings.php{,.bak}
fi
docker compose up -d
docker compose exec mediawiki composer update
docker compose exec mediawiki /bin/bash /docker/install.sh
cat << 'PHP' >> "$core_dir/LocalSettings.php"
$wgDefaultSkin = "vector-2022";
wfLoadSkin( 'Vector' );
wfLoadExtension( 'WikiLambda' );
wfLoadExtension( 'WikimediaMessages' );
PHP
docker compose exec mediawiki php maintenance/run.php update --quick
docker compose exec mediawiki php maintenance/run.php createAndPromote --custom-groups functioneer,functionmaintainer --force Admin

printf "\n\e[32mEt voiλà! A pristine Wikilambda is waiting for you at http://localhost:8080\e[0m\n\n"
printf "Try visiting http://localhost:8080/wiki/Special:ListObjectsByType/Z8 to see some functions\n\n"
