#!/bin/bash -eu

# This script generates a commit that updates the function-schemata submodule
# ./bin/updateSubmodule.sh        updates to master
# ./bin/updateSubmodule.sh hash   updates to specified hash

# cd to the function-schemata directory
cd $(cd $(dirname $0)/..; pwd)

# Check that both working directories are clean
if git status -uno --ignore-submodules | grep -i changes > /dev/null
then
	echo >&2 "Working directory must be clean"
	exit 1
fi
cd function-schemata/
if git status -uno --ignore-submodules | grep -i changes > /dev/null
then
	echo >&2 "function-schemata/ working directory must be clean"
	exit 1
fi
cd ..

git fetch origin
# Create sync-repos branch if needed and reset it to master
git checkout -B sync-function-schemata -t origin/master
git submodule update
cd function-schemata/
git fetch origin

# Figure out what to set the submodule to
if [ -n "${1:-}" ]
then
	TARGET="$1"
	TARGETDESC="$1"
else
	TARGET=origin/master
	TARGETDESC="HEAD ($(git rev-parse --short origin/master))"
fi

# Generate commit summary
# TODO recurse
NEWCHANGES=$(git log ..$TARGET --oneline --no-merges --topo-order --reverse --color=never)
TASKS=$(git log ..$TARGET --no-merges --format=format:%B | grep "Bug: T" | sort | uniq)
NEWCHANGESDISPLAY=$(git log ..$TARGET --oneline --no-merges --topo-order --reverse --color=always)
COMMITMSG=$(cat <<END
Update function-schemata sub-module to $TARGETDESC

New changes:
$NEWCHANGES

$TASKS
END
)
# Check out master of function-schemata
git checkout $TARGET

# Commit
cd ..
git commit function-schemata -m "$COMMITMSG" > /dev/null
if [ "$?" == "1" ]
then
	echo >&2 "No changes"
else
	cat >&2 <<END


Created commit with changes:
$NEWCHANGESDISPLAY
END
fi
