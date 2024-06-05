#!/usr/bin/env bash

set -eu

script_dir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
core_dir="$script_dir/../../../"

cat <<EOF > "$core_dir/.env"
MW_SCRIPT_PATH=/w
MW_SERVER=http://localhost:8080
MW_DOCKER_PORT=8080
MEDIAWIKI_USER=Admin
MEDIAWIKI_PASSWORD=dockerpass
XDEBUG_CONFIG=
XDEBUG_ENABLE=true
XHPROF_ENABLE=true
MW_DOCKER_UID=$(id -u)
MW_DOCKER_GID=$(id -g)
EOF

rm -rf "$core_dir/skins/Vector"
rm -rf "$core_dir/extensions/WikimediaMessages"
rm -rf "$core_dir/extensions/UniversalLanguageSelector"

git clone "https://gerrit.wikimedia.org/r/mediawiki/skins/Vector" $core_dir/skins/Vector
git clone "https://gerrit.wikimedia.org/r/mediawiki/extensions/WikimediaMessages" $core_dir/extensions/WikimediaMessages
git clone "https://gerrit.wikimedia.org/r/mediawiki/extensions/UniversalLanguageSelector" $core_dir/extensions/UniversalLanguageSelector

bash $script_dir/local_reset.sh
