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

* Bring up a [development environment](https://www.mediawiki.org/wiki/How_to_become_a_MediaWiki_hacker) for MediaWiki (e.g. [Docker](https://www.mediawiki.org/wiki/MediaWiki-Docker) or [Vagrant](https://www.mediawiki.org/wiki/MediaWiki-Vagrant)). Be sure to install docker-compose v2 instead of v1.
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
* Run `docker-compose exec mediawiki composer update` or similar.
* Add the following to your `LocalSettings.php` file:
  ```
  wfLoadExtension( 'WikiLambda' );
  wfLoadExtension( 'WikimediaMessages' );
  wfLoadExtension( 'UniversalLanguageSelector' );
  ```
* Run `php maintenance/run.php createAndPromote --custom-groups functioneer,functionmaintainer --force Admin` (or `docker-compose exec mediawiki php maintenance/run.php createAndPromote --custom-groups functioneer,functionmaintainer --force Admin` if MediaWiki is setup through Docker) to give your Admin user the special rights for creating and editing ZObjects.
* Run `php maintenance/run.php update` (or `docker-compose exec mediawiki php maintenance/run.php update` if MediaWiki is setup through Docker) to provision necessary schemas and initial content (this step could take around 20 minutes).

Done! Navigate to the newly created `Z1` page on your wiki to verify that the extension is successfully installed.

### Back-end services

WikiLambda uses two back-end services for running user-defined and built-in functions in a secure, scalable environment; a set of "evaluators" that run user-defined native code, and an "orchestrator" that receives execution requests and determines what to run.

#### Default experience using Beta Wikifunctions

On install, the extension will try to use the orchestrator and evaluator services of the [Beta Cluster version of Wikifunctions](https://wikifunctions.beta.wmflabs.org/). This default configuration will let you do rudimentary tests with the built-in objects, but not with custom on-wiki content (as they are pointed at the content of Beta Wikifunctions).

You can test your installation by running the PHPUnit test suite as described in the MediaWiki install instructions:

```
docker-compose exec mediawiki composer phpunit:entrypoint -- extensions/WikiLambda/tests/phpunit/integration/ActionAPI/ApiFunctionCallTest.php
```

If the tests all pass, your installation has successfully called the configured function orchestrator with the calls, executed them, and got the expected results back. Congratulations!

You can evaluate an arbitrary function call by navigating to `localhost:8080/wiki/Special:RunFunction`, and selecting a function.

#### Local services

If you would like to use your own installation of the function orchestrator and evaluator services, please perform the following additional step:

* Copy the contents of the `services` block in `mediawiki/extensions/WikiLambda/docker-compose.sample.yml` to the analogous `services` block in your `mediawiki/docker-compose.override.yml`.
* If you want to use a different port or name for your orchestrator service, you will need to set the `$wgWikiLambdaOrchestratorLocation` configuration from the default of `mediawiki_function-orchestrator_1:6254` in your `LocalSettings.php` file, e.g. to `mediawiki-function-orchestrator-1:6254` you would add:

 ```
 $wgWikiLambdaOrchestratorLocation = "http://mediawiki-function-orchestrator-1:6254/1/v1/evaluate";
 ```

This will provide you with your own orchestrator and evaluator services, pointed at your wiki. You can now use this for local content as well as built-in content.

* If your wiki is not called 'mediawiki-web', e.g. because your checkout of MediaWiki is not in a directory called 'mediawiki', you will need to set `$wgWikiLambdaOrchestratorLocation` in your `LocalSettings.php` and make similar edits to the `environment` variables you have set in your `mediawiki/docker-compose.override.yml` file.
  * To find out the correct name for all the variables, run `docker compose ps` in your mediawiki directory. The output should be something similar to this:
  ```
  NAME                                   COMMAND                  SERVICE                         STATUS              PORTS
  core-function-evaluator-javascript-1   "node server.js"         function-evaluator-javascript   running             0.0.0.0:6929->6927/tcp, :::6929->6927/tcp
  core-function-evaluator-python-1       "node server.js"         function-evaluator-python       running             0.0.0.0:6928->6927/tcp, :::6928->6927/tcp
  core-function-orchestrator-1           "node server.js"         function-orchestrator           running             0.0.0.0:6254->6254/tcp, :::6254->6254/tcp
  core-mediawiki-1                       "/bin/bash /php_entr…"   mediawiki                       running             9000/tcp
  core-mediawiki-jobrunner-1             "/bin/bash /entrypoi…"   mediawiki-jobrunner             running
  core-mediawiki-web-1                   "/bin/bash /entrypoi…"   mediawiki-web                   running             0.0.0.0:8080->8080/tcp, :::8080->8080/tcp
  ```
  * Use the `SERVICE` name for the `mediawiki-web` container for your `WIKI_API_URL` variable, `http://<MEDIAWIKI WEB SERVICE NAME>:8080/w/api.php`
    * E.g. `http://mediawiki-web:8080/w/api.php`
  * Use the container `NAME` of the javascript evaluator for the javascript `evaluatorUri` in the `ORCHESTRATOR_CONFIG` variable, `http://<JAVASCRIPT EVALUATOR CONTAINER NAME>:6927/1/v1/evaluate/`
    * E.g. `http://core-function-evaluator-javascript-1:6927/1/v1/evaluate/`
  * Use the container `NAME` of the python evaluator for the python `evaluatorUri` in the
  `ORCHESTRATOR_CONFIG` variable, `http://<PYTHON EVALUATOR CONTAINER NAME>:6927/1/v1/evaluate/`
    * E.g. `http://core-function-evaluator-python-1:6927/1/v1/evaluate/`
  * Use the container `NAME` of the orchestrator for the `$wgWikiLambdaOrchestratorLocation` config variable in `LocalSettings.php` file, as specified above.
    * E.g. `http://core-function-orchestrator-1:6254/1/v1/evaluate/`
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
npm run browser-test

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

## See also

<https://www.mediawiki.org/wiki/Extension:WikiLambda>
