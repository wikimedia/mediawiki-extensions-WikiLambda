# WikiLambda extension for MediaWiki

WikiLambda provides for hosting, and letting users call evaluation, of functions written, managed, and evaluated on a central wiki, Wikifunctions.

## Development instructions

### Quick start

From whatever directory you wish to set up your development environment, run:

```bash
git clone "https://gerrit.wikimedia.org/r/mediawiki/core" mediawiki
cd mediawiki
git clone --recurse-submodules --remote-submodules https://gerrit.wikimedia.org/r/mediawiki/extensions/WikiLambda extensions/WikiLambda
cd extensions/WikiLambda
npm run local:setup
```

Note that all of the docker container locations mentioned here and in `docker-compose.override.yml`
have the `mediawiki-` prefix. This is derived from the name of the directory to which
you have cloned the `mediawiki/core` repository.

### Full instructions

* Bring up a [development environment](https://www.mediawiki.org/wiki/How_to_become_a_MediaWiki_hacker) for MediaWiki (e.g. [Docker](https://www.mediawiki.org/wiki/MediaWiki-Docker) or [Vagrant](https://www.mediawiki.org/wiki/MediaWiki-Vagrant)). Be sure to install docker compose v2 instead of v1.
* In your `mediawiki/extensions/` subdirectory, clone the extension as follows:
  ```
  git clone --recurse-submodules --remote-submodules https://gerrit.wikimedia.org/r/mediawiki/extensions/WikiLambda
  ```
* In your `mediawiki/extensions/` subdirectory, also clone the WikimediaMessages and UniversalLanguageSelector extensions:
  ```
  git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/WikimediaMessages
  git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/UniversalLanguageSelector
  ```
  The following extensions are also recommended installations in the same directory:
  ```
  git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/EventLogging
  git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/EventBus
  ```
* Extend MediaWiki's composer dependencies to use ours by adding a `composer.local.json` file in your `mediawiki/` directory:
  ```
  {
    "extra": {
      "merge-plugin": {
        "include": [
          "extensions/WikiLambda/composer.json"
        ]
      }
    }
  }
  ```
* Run `docker compose exec mediawiki composer update` or similar.
* Add the following to your `LocalSettings.php` file:
  ```
  wfLoadExtension( 'WikiLambda' );
  $wgWikiLambdaEnableRepoMode = true;
  $wgWikiLambdaEnableClientMode = true;
  wfLoadExtension( 'WikimediaMessages' );
  wfLoadExtension( 'UniversalLanguageSelector' );
  ```
* Run `php maintenance/run.php createAndPromote --custom-groups functioneer,functionmaintainer --force Admin` (or `docker compose exec mediawiki php maintenance/run.php createAndPromote --custom-groups functioneer,functionmaintainer --force Admin` if MediaWiki is setup through Docker) to give your Admin user the special rights for creating and editing ZObjects.
* Run `php maintenance/run.php update` (or `docker compose exec mediawiki php maintenance/run.php update` if MediaWiki is setup through Docker) to provision necessary schemas and initial content (this step could take around 20 minutes).

Done! Navigate to the newly created `Z1` page on your wiki to verify that the extension is successfully installed.

### Loading ZObject data

#### Loading the built-in data

`function-schemata/data/definitions` contains all the JSON files for the canonical built-in ZObjects
that a blank Wikifunctions environment must have in a blank installation. When following the general
installation instructions, you will be asked to run the MediaWiki `maintenance/run.php update`
script, which loads into the database all the built-in data if they are not there yet.
However, the update script will not overwrite any existing data.

To make fresh loads of the built-in data, load a given Zid or range of Zids, merge with existing
data, or other more complex loading operations, use the `loadPreDefinedObject.php` maintenance script.

The `loadPreDefinedObject` script uses the function-schemata data definition files so always make
sure that the function-schemata is up to date. From the Wikilambda directory:

```
$ git submodule update --init --recursive
```

To run the script, from your MediaWiki installation directory, do:
```
$ docker compose exec mediawiki php extensions/WikiLambda/maintenance/loadPreDefinedObject.php <OPTIONS>
```

##### Options

The script can be called with a number of options that allow you to set the Zid or Zids to insert,
and how to handle merges with already existing data.

To configure **what objects to load**, use the following flags:

* `--all`: Loads all built-in objects, from Z1 to Z999.
* `--zid <Zid>`: Loads only the specified Zid from the built-in object range.
* `--from <Zid>`: Sets the lower range of the set of sequential Zids to be loaded.
* `--to <Zid>`: Sets the upper range of the set of sequential Zids to be loaded.


In the absence of any special flags, if an object already exists in the database, the script will
skip it. To set a different **update or merge strategy**, use the following flags:

* `--force`: Whenever an object already exists in the database, overwrite it with the version
available in the built-in data directory.
* `--merge`: Whenever an object already exists in the database, attempt to merge the current version
with the built-in version. The multilingual and other important changes will be kept as currently
stored, while other changes will trigger a conflict. Every conflict will request input from the user
to decide whether to keep the current version or restore to the builtin version. To skip the
interactive mode, use the additional flags:
  * `--current`: Whenever a conflict is found, this will automatically default to keeping the
  current value.
  * `--builtin`: Whenever a conflict is found, this will automatically default to restoring the
  builtin value.

Other configuration flags are:
* `--wait <ms>`: Adds a sleep time (in milliseconds) between insertions.


##### Dependencies

Whenever the script inserts a subset of the builtin objects, specified with `--zid` or `--from` and
`--to`, it will track the dependencies and output a notification message at the end of the
insertions. These dependencies are not inserted automatically, so you must make sure that they are
already available:

```
Done!
> 70 objects were created or updated successfully.

Make sure the following dependencies are inserted and up to date:
Z14, Z50, Z61, Z1002
```

##### Examples


To load all built-in objects (only new ones, skip those which are already loaded), use the `--all` option:
```
$ docker compose exec mediawiki php extensions/WikiLambda/maintenance/loadPreDefinedObject.php \
--all
```

To load a given Zid, use the `--zid` option:
```
# Update Z14
$ docker compose exec mediawiki php extensions/WikiLambda/maintenance/loadPreDefinedObject.php \
--zid Z14
```

To load all missing objects in a range of zids, use the `--from` and `--to` options:
```
# Update from Z6000 to Z7000
$ docker compose exec mediawiki php extensions/WikiLambda/maintenance/loadPreDefinedObject.php \
--from Z6000 --to Z7000
```

To forcefully insert all objects, overwriting the ones that already exist, use the `--force` option:
```
# Force all
$ docker compose exec mediawiki php extensions/WikiLambda/maintenance/loadPreDefinedObject.php \
--all --force

# Rewrite Z6005 with its builtin version
$ docker compose exec mediawiki php extensions/WikiLambda/maintenance/loadPreDefinedObject.php \
--zid Z6005 --force
```

To insert all non-existing objects, and merge the already existing ones, use the `--merge` option.

```
$ docker compose exec mediawiki php extensions/WikiLambda/maintenance/loadPreDefinedObject.php \
--all --merge
```

If conflicts are found, the script will request input from the user:
```
> Conflict:
  | Zid: Z507
  | Path: Z2K2.Z50K1.1.Z3K1
  | Current value: "Z7"
  | Builtin value: "Z99"
> Restore to builtin value? (y/n) [n] >
```

As explained in this warning message, the object Z507 could not be merged automatically. The value
found down the key path is currently stored as `Z7`, but the value as per the
`function-schemata/data/definitions/Z507.json` file is `Z99`. This requires the user to make an
informed decision to either keep the version currently preset in the database (`n`) or to restore
it to its builtin value (`y`).

To insert all non-existing objects, and merge the already existing ones by always keeping the
current values whenever there are conflicts, use the `--merge --current` options.

```
$ docker compose exec mediawiki php extensions/WikiLambda/maintenance/loadPreDefinedObject.php \
--all --merge --current
```

To insert all non-existing objects, and merge the already existing ones by always resetting the
builtin values whenever there are conflicts, use the `--merge --builtin` options.

```
$ docker compose exec mediawiki php extensions/WikiLambda/maintenance/loadPreDefinedObject.php \
--all --merge --builtin
```

#### Loading a production data dump

Sometimes it might be necessary to replicate locally the current state of the Wikifunctions.org
production database. This can be useful for data debugging purposes, analytics, etc. For this, you
can use the `loadJsonDump.php` maintenance script.

This script requires objects being downloaded via the
[wikifunctions-content-download](https://gitlab.wikimedia.org/repos/abstract-wiki/wikifunctions-content-download/)
script.

To use this script, clone the project and follow the usage guide in the `README.md` file:
```
# With ssh:
git@gitlab.wikimedia.org:repos/abstract-wiki/wikifunctions-content-download.git

# With https:
git clone https://gitlab.wikimedia.org/repos/abstract-wiki/wikifunctions-content-download.git

# Install dependencies:
cd wikifunctions-content-download
npm ci

# Run script so that the objects are stored in your Wikilambda directory:
npm start -- --dir /home/user/mediawiki/core/extensions/WikiLambda/zobjectcache
```

This script will download all the production current objects into the `zobjectcache` folder in your
WikiLambda extension. If this is the first time using the download script, it will take some time to complete the
job. Otherwise it will just download the objects that have new versions available.

Make sure that your `zobjectcache` directory contains the following files:
* The index file `Z0.json` which contains a map with the latest revision ID for every ZObject Id.
* All the versioned ZObject files, with filenames `Zid.revision.json`.

You are now ready to use the `loadJsonDump.php` maintenance script to load all the data into your
local installation, using the argument `--dir` to specify the data directory:

```
docker compose exec mediawiki php extensions/WikiLambda/maintenance/loadJsonDump.php --dir zobjectcache
```

To insert a given zid, use the argument `--zid`:

```
docker compose exec mediawiki php extensions/WikiLambda/maintenance/loadJsonDump.php --dir zobjectcache --zid Z6005
```
NOTE: You must use this option **very carefully**, as it will only force insert the specified Zid without
being concerned about its dependencies between this and other objects. While it's safe to push locally the
whole production database, as we are replicating the full context in one go, pushing one Zid should
only be done if we are sure that the context matches this object perfectly.

### Back-end services

WikiLambda uses two back-end services for running user-defined and built-in functions in a secure, scalable environment; a set of "evaluators" that run user-defined native code, and an "orchestrator" that receives execution requests and determines what to run.

#### Default experience without running local services

On install, the extension will try to use the orchestrator and evaluator services, which you may not have running. This default configuration will let you do rudimentary tests of the system, but not proper integration or full running without the back-end services.

You can test your installation by running the PHPUnit test suite as described in the MediaWiki install instructions:

```
docker compose exec mediawiki composer phpunit:entrypoint -- extensions/WikiLambda/tests/phpunit/integration/ActionAPI/ApiFunctionCallTest.php
```

If the tests all pass, your installation has successfully called the mocked function orchestrator with the calls, executed them, and got the expected results back. Congratulations!

#### Local services

If you would like to use your own installation of the function orchestrator and evaluator services, please perform the following additional step:

1. Copy the contents of the `services` block in `mediawiki/extensions/WikiLambda/docker-compose.sample.yml` to the analogous `services` block in your `mediawiki/docker-compose.override.yml`.
2. Set the `$wgWikiLambdaOrchestratorLocation` configuration variable in your `LocalSettings.php` as explained in the [Orchestrator location](#orchestrator-location) section below.
3. Set the function orchestrator environment variables in your docker-compose.override.yml file, as detailed in the [Orchestrator environment variables](#orchestrator-env) section below.
4. Restart your docker containers

You can evaluate an arbitrary function call by navigating to `localhost:8080/wiki/Special:RunFunction`, and selecting a function.

<a name="orchestrator-location"></a>
##### Orchestrator location

Your Mediawiki installation needs to know the location of your orchestrator service. This variable
is set by default to the standard local name for the function orchestrator. You can see this in the
`extension.json` file, in the `config` property:

```
 "WikiLambdaOrchestratorLocation": {
   "description": "Host and port of the function orchestrator.",
   "value": "https://mediawiki-function-orchestrator-1:6254/1/v1/evaluate"
 }
```

To run your local orchestrator, you may need to override this variable, by setting its new value
in your `LocalSettings.php` file with the correct name and port of your orchestrator container.

For example, if your orchestrator is called `core-function-orchestrator-1` and its port is `6254`,
set the configuration variable to:

```
$wgWikiLambdaOrchestratorLocation = "http://core-function-orchestrator-1:6254/1/v1/evaluate";
```

NOTE: Container names are automatically assigned by docker and often uses the name of the directory
where your Mediawiki repository is checked out. To find out the correct details of your docker containers,
run `docker compose ps` in your mediawiki directory. The output should be something similar to this:

```
NAME                                   COMMAND                  SERVICE                         STATUS              PORTS
core-function-evaluator-javascript-1   "node server.js"         function-evaluator-javascript   running             0.0.0.0:6929->6927/tcp, :::6929->6927/tcp
core-function-evaluator-python-1       "node server.js"         function-evaluator-python       running             0.0.0.0:6928->6927/tcp, :::6928->6927/tcp
core-function-orchestrator-1           "node server.js"         function-orchestrator           running             0.0.0.0:6254->6254/tcp, :::6254->6254/tcp
core-mediawiki-1                       "/bin/bash /php_entr…"   mediawiki                       running             9000/tcp
core-mediawiki-jobrunner-1             "/bin/bash /entrypoi…"   mediawiki-jobrunner             running
core-mediawiki-web-1                   "/bin/bash /entrypoi…"   mediawiki-web                   running             0.0.0.0:8080->8080/tcp, :::8080->8080/tcp
```

<a name="orchestrator-env"></a>
##### Orchestrator environment variables

In your `docker-compose.override.yml` file, under the `function-orchestrator` service section, you'll
need to set the following environment variables, which will allow you to enable and configure
different features

* **`WIKI_API_URL`** (mandatory): How to access the Mediawiki API from the function orchestrator.
  This URL uses the service name of the `mediawiki-web` container: `http://<MEDIAWIKI WEB SERVICE NAME>:8080/w/api.php`.
  * E.g. `http://mediawiki-web:8080/w/api.php`
* **`WIKI_VIRTUAL_HOST`** (optional): E.g. `www.wikifunctions.org`
* **`ORCHESTRATOR_CONFIG`** (mandatory): Internal configuration object for the orchestrator.
  * **`evaluatorConfigs`** (mandatory): Configuration object for each of the available evaluators.
    Each of them will need to set the correct value for their `evaluatorUri` configuration to: `http://<EVALUATOR CONTAINER NAME>:6927/1/v1/evaluate/`
    * E.g. For **JavaScript** set `evaluatorUri` to `http://core-function-evaluator-javascript-1:6927/1/v1/evaluate/`
    * E.g. For **Python** set `evaluatorUri` to `http://core-function-evaluator-python-1/1/v1/evaluate/`
  * **`doValidate`** (deprecated)
  * **`addNestedMetadata`** (optional): Feature flag to activate the return of nested metadata objects.
  * **`useWikidata`** (optional): Feature flag to allow internal access to Wikidata.
* **`WIKIDATA_API_URL`** (mandatory): This is necessary to work with Wikidata items and should point
  at the public Wikidata base URL.
  * E.g. `https://www.wikidata.org`
* **`WIKIDATA_VIRTUAL_HOST`** (optional): E.g. `www.wikidata.org`
* **`ORCHESTRATOR_TIMEOUT_MS`** (optional): Sets the orchestrator timeout limit, in milliseconds. If
  not set, the default value is 20000 ms.


##### Other configuration tips

* If you would like to avoid permissions checks when developing locally, navigate to `localhost:8080/wiki` and log in (login: Admin, password: dockerpass)
* If you would like to bypass the cache when developing locally, change the signature of the `orchestrate` function in `includes/OrchestratorRequest.php`, setting `$bypassCache = true`:

```
public function orchestrate( $query, $bypassCache = true ) : string {
```

#### Locally-built services for development

If you would instead like to develop changes to the function orchestrator or evaluators, you will need to use a locally-built version of the services. To do this for the orchestrator:

* In a directory outside of your MediaWiki checkout, clone the services via `git clone --recurse-submodules --remote-submodules https://gitlab.wikimedia.org/repos/abstract-wiki/wikifunctions/function-orchestrator`.
* From the root of your function-orchestrator installation, run
  `docker build -f .pipeline/blubber.yaml --target development -t local-orchestrator .`
* Alter `mediawiki/docker-compose.override.yml` to comment out `image: docker-registry...` in the `function-orchestrator` service stanza and uncomment the `image: local-orchestrator:latest` line instead.

To do this for the evaluator:
* In a directory outside of your MediaWiki checkout, clone the services via `git clone --recurse-submodules --remote-submodules https://gitlab.wikimedia.org/repos/abstract-wiki/wikifunctions/function-evaluator`.
* From the root of your function-evaluator installation:
  * To build the javascript evaluator image, run:
    `docker build -f .pipeline/blubber.yaml --target development-javascript-all-wasm -t local-evaluator-js .`
  * To build the python evaluator image, run:
    `docker build -f .pipeline/blubber.yaml --target development-python3-all-wasm -t local-evaluator-py .`
* Alter `mediawiki/docker-compose.override.yml` to comment out `image: docker-registry...` in the `function-evaluator` javascript and python services and uncomment the `image: local-evaluator-js:latest` and `image: local-evaluator-py:latest` lines instead.


### PHPunit Tests

To run the extension PHPunit tests, from the MediaWiki installation directory, run:

```
docker compose exec mediawiki composer phpunit:entrypoint extensions/WikiLambda/tests/phpunit/
```

### Jest Tests

To run the Jest unit and integration tests, from the WikiLambda directory, do:

```
# Install npm dependencies
npm ci

# Run tests
npm test

# Run linter
npm run lint:fix

# Run unit tests
npm run test:unit
```

### Selenium Tests

#### Quickstart

From your `extensions/WikiLambda` directory run:

```bash
npm run local:selenium
```

#### Full instructions

A set of Selenium tests, used to run end-to-end tests of the application, is available within the project. The tests require an environment with specific versions of things to run, and so it is suggested you use "fresh-node" to run them locally without the need to modify your personal environment.

The tests need a specific set of environment variable to be available. Please see the following list on how to set this `https://www.mediawiki.org/wiki/Selenium/How-to/Set_environment_variables`

For information on how to run fresh-node and how to get started, see the following documentation: `https://www.mediawiki.org/wiki/Selenium/Getting_Started/Run_tests_using_Fresh`

After the environment variable and fresh node are both set locally, run the following commands:

```

// go to your WikiLambda extension
cd path/to/WikiLambda # you can start in the extension, no need for core

// Initialize Fresh node
fresh-node -env -net # you can start fresh in the extension folder, no need for core

// Set the variable inline (unless you are loading them from a .env file)
export MW_SERVER=http://localhost:8080
export MW_SCRIPT_PATH=/w
export MEDIAWIKI_USER=Admin
export MEDIAWIKI_PASSWORD=dockerpass

# for additional debugging, you can enable video recording
# see https://www.mediawiki.org/wiki/Selenium/How-to/Record_videos_of_test_runs
export DISPLAY=:1
Xvfb "$DISPLAY" -screen 0 1280x1024x24 &

# run the browser tests
npm run selenium-test

NOTE: the tests will produce some snapshot after completition (both on failure and success). This can be found on "extensions/WikiLambda/tests/selenium/log"
```

## Rate-limiting

WikiLambda uses [PoolCounter](https://www.mediawiki.org/wiki/Extension:PoolCounter) to limit the number of concurrent function calls a user may have in flight at any given time. In order to set the concurrency limit, you need to add configuration for a `WikiLambdaFunctionCall` pool to [$wgPoolCounterConf](https://www.mediawiki.org/wiki/Manual:$wgPoolCounterConf) in `LocalSettings.php`.

The example below allows users to have at most two functions executing at a given time, placing any function calls that exceed the concurrency limit in a queue:

```
$wgPoolCounterConf = [
    'WikiLambdaFunctionCall' => [
        'class' => MediaWiki\PoolCounter\PoolCounterClient::class,
        'timeout' => 1, // wait timeout in seconds
        'workers' => 2, // maximum number of active threads in each pool
        'maxqueue' => 5, // maximum number of total threads in each pool
    ]
];
```

## Using the wikitext parser function

WikiLambda provides the `{{#function:…}}` parser function, which lets you embed function calls inside wikitext documents which are then resolved at parse time.

It is currently very limited, allowing only a single direct function call to a function which both takes only strings as its inputs and emits a string as its output.

To use, simply edit any wikitext page. The target function is the zeroth parameter (named by ZID), e.g.:

  {{#function:Z12345}}

If your function takes parameters, they can be passed in pipe-delimited, e.g.:

  {{#function:Z12345|Hello|world|!}}

Much further functionality is to come.

### Enabling use of rich text output from embedded calls

Enable the new functionality in your LocalSettings.php file:

  $wgWikifunctionsEnableHTMLOutput = true;

Create a Function and connected Implementation that outputs an HTML fragment, such as one that wraps a given input string in "<b>…</b>". Note that all direct use of the Function will show you HTML fragment Objects in the interface with the source HTML displayed, and never try to render it as HTML.

Now try to use your new Function as an embedded call:

  {{#function:Z12345|input}}

You should see that the HTML is rendered into the article, suitably sanitised. For example, bad user input of `<script>…</script>` should get escaped or silently dropped (depending on how it is passed into the system), Functions that try to output unpermitted HTML like `<meta>` tags will see them dropped, and `<a>` links will only be allowed to the local server (or, if in a SiteMatrix cluster, local servers) without any attributes beyond the `href`.

### Enabling use of Wikidata item references

Enable the new functionality in your LocalSettings.php file:

  $wgWikifunctionsEnableWikidataInputTypes = true;

Create a Function and connected Implementation that uses a Wikidata item reference, such as one that displays the label of a given item in a given language. You should be able to use it directly as expected.

Now try to use your new Function as an embedded call:

  {{#function:Z12345|Q42|en}}

Note that for embedded Function calls, we default blank language parameter values to the page content render language, and Wikidata item parameter values to the associated QID of the page on which the fragment is being rendered, if available. Consequently, on https://en.wikipedia.org/wiki/Douglas_Adams, the above could be written simply as {{#function:Z12345}}.


## See also

<https://www.mediawiki.org/wiki/Extension:WikiLambda>
