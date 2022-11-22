# WikiLambda extension for MediaWiki

WikiLambda will provide Wikimedia wikis with a wikitext parser function to call evaluation of functions written, managed, and evaluated on a central wiki.

## Using the wikitext parser function

WikiLambda provides the `{{#function:…}}` parser function, which lets you embed function calls inside wikitext documents which are then resolved at parse time.

It is currently very limited, allowing only a single direct function call to a function which both takes only strings as its inputs and emits a string as its output.

To use, simply edit any wikitext page. The target function is the zeroth parameter (named by ZID), e.g.:

  {{#function:Z12345}}

If your function takes parameters, they can be passed in pipe-delimited, e.g.:

  {{#function:Z12345|Hello|world|!}}

Much further functionality is to come.


## Development instructions

* Bring up a [development environment](https://www.mediawiki.org/wiki/How_to_become_a_MediaWiki_hacker) for MediaWiki (e.g. [Docker](https://www.mediawiki.org/wiki/MediaWiki-Docker) or [Vagrant](https://www.mediawiki.org/wiki/MediaWiki-Vagrant)). Be sure to install docker-compose v2 instead of v1.
* In your `mediawiki/extensions/` subdirectory, clone the extension as follows:
  ```
  git clone --recurse-submodules --remote-submodules https://gerrit.wikimedia.org/r/mediawiki/extensions/WikiLambda
  ```
* In your `mediawiki/extensions/` subdirectory, also clone the WikimediaMessages extension:
  ```
  git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/WikimediaMessages
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
  ```
* Run `php maintenance/update.php` (or `docker-compose exec mediawiki php maintenance/update.php` if MediaWiki is setup through Docker) to provision necessary schemas and initial content (this step could take around 20 minutes).

Done! Navigate to the newly created `Z1` page on your wiki to verify that the extension is successfully installed.

### Back-end services

WikiLambda uses two back-end services for running user-defined and built-in functions in a secure, scalable environment; an "evaluator" that runs user-defined native code, and an "orchestrator" that recieves execution requests and determines what to run.

#### Default experience using Beta Wikifunctions

On install, the extension will try to use the orchestrator and evaluator services of the [Beta Cluster version of Wikifunctions](https://wikifunctions.beta.wmflabs.org/). This default configuration will let you do rudimentary tests with the built-in objects, but not with custom on-wiki content (as they are pointed at the content of Beta Wikifunctions).

You can test your installation by running the PHPUnit test suite as described in the MediaWiki install instructions: `docker-compose exec mediawiki php tests/phpunit/phpunit.php extensions/WikiLambda/tests/phpunit/integration/API/ApiFunctionCallTest.php`. If the tests all pass, your installation has successfully called the configured function orchestrator with the calls, executed them, and got the expected results back. Congratulations!

You can evaluate an arbitrary function call by navigating to `localhost:8080/wiki/Special:CreateZObject`, adding a new key/value pair whose value is of type `Z7`, and selecting a function.

#### Local services

If you would like to use your own installation of the function orchestrator and evaluator services, please perform the following additional step:

* Copy the contents of the `services` block in `mediawiki/extensions/WikiLambda/docker-compose.sample.yml` to the analogous `services` block in your `mediawiki/docker-compose.override.yml`.
* If you want to use a different port or name for your orchestrator service, you will need to set the `$wgWikiLambdaOrchestratorLocation` configuration from the default of `mediawiki_function-orchestrator_1:6254` in your `LocalSettings.php` file, e.g. to `core_function-orchestrator_1:6254` you would add:

 ```
 $wgWikiLambdaOrchestratorLocation = "core_function-orchestrator_1:6254";
 ```

* If your wiki is not called 'mediawiki-web', e.g. because your checkout of MediaWiki is not in a directory called 'mediawiki', you will need to set `$wgWikiLambdaOrchestratorLocation` in your `LocalSettings.php` and make similar edits to the `environment` variables you have set in your `mediawiki/docker-compose.override.yml` file.

This will provide you with your own orchestrator and evaluator service, pointed at your wiki. You can now use this for local content as well as built-in content.

#### Locally-built services for development

If you would instead like to develop changes to the function orchestrator or evaluator, you will need to use a locally-built version of the services. To do this for the orchestrator:

* [Get Blubber](https://wikitech.wikimedia.org/wiki/Blubber/Download#Blubber_as_a_(micro)Service) so you can build the service images
* In a directory outside of your MediaWiki checkout, clone the services via `git clone --recurse-submodules --remote-submodules https://gerrit.wikimedia.org/r/mediawiki/services/function-orchestrator`.
* From the root of your function-orchestrator installation, run
  `blubber .pipeline/blubber.yaml development | docker build -t local-orchestrator -f - .`
* Alter `mediawiki/docker-compose.override.yaml` to replace `image: docker-registry...` in the `function-orchestrator` service stanza to read `image: local-orchestrator:latest`.

If changing the evaluator, follow the same steps but for the evaluator image and directory.

### Front-end data model (Vuex)

Abstract Wikimedia uses a [Vuex](https://vuex.vuejs.org/) data model to store state and manipulate the data being provided by the PHP API.

WikiLambda is build on top of complex data structure called zObjects. This data is fetched and managed by Vuex, and this section is going to describe how VUEX make use of this data.

#### zObject from JSON to Array

The most important topic of the store manipulation is the conversion of zObjects from JSON to Array. zObject can be very large and splitting it up in "smaller" parts was required to simplify the development and design of the FrontEnd.

The solution to this problem, was to convert a zObject JSON into an array that would allow us to separate the data into smaller parts and use individual array Indexes to support data manipulation.

An example of a zObject JSON (mutlilingual string):

```
{
        "Z1K1": "Z12",
        "Z12K1": [
            {
                "Z1K1": "Z11",
                "Z11K1": "Z1002",
                "Z11K2": "Good Morning"
            },
            {
                "Z1K1": "Z11",
                "Z11K1": "Z1787",
                "Z11K2": "Buongiorno"
            }
        ]
    }
```
The provided example have 2 different instances of a monolingual string (Z11). If we would have been using JSON in our data model, we would have found difficult to manage the data. The Vue components would have had to have a complex flow of data all the way up, and modification of data (for example change Buongiorno to Buon giorno) would have been difficult due to the multiple instances of the same structure withint he JSON.

To simplify the overall structure the above zObject is translated in the following array structure at first load in the method "convertZObjectToTree" in the `zobjectThreeUtils.js` mixins folder.

| id | key       | parent    | value        |
|----|-----------|-----------|--------------|
| 0  | undefined | undefined | object       |
| 1  | Z1K1      | 0         | Z12          |
| 2  | Z12K1     | 1         | array        |
| 3  | 0         | 2         | object       |
| 4  | Z1K1      | 3         | Z11          |
| 5  | Z11K1     | 3         | Z1002        |
| 6  | Z11K2     | 3         | Good Morning |
| 7  | 1         | 2         | object       |
| 8  | Z1K1      | 7         | Z11          |
| 9  | Z11K1     | 7         | Z1787        |
| 10 | Z11K2     | 7         | Buongiorno   |

The array data model allows us to manage the data in a more intuitive way. Each vue component is able to define its own scope by the use of Id's. For example the component that handles monolingual string will be rendered twice. One will be provided a Property of zObjectId of 3 and one with the value of 7. Doing so will allow the component to self manage the render (get all children of ID 3 or ID 7) and the manipulation of the data (modify Z11K2 of the monolingual with ID 7), and simplify the overall structure of the data.

### Selenium Tests

A set of Selenium tests, used to run end-to-end tests of the application, is available within the project. The tests require an environment with specific versions of things to run, and so it is suggested you use "fresh-node" to run them locally without the need to modify your personal environment.

The tests need a specific set of environment variable to be avaialable. Please see the following list on how to set this `https://www.mediawiki.org/wiki/Selenium/How-to/Set_environment_variables`

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

# run the tests
npm run selenium-test

NOTE: the tests will produce some snapshot after completition (both on failure and success). This can be found on "extensions/WikiLambda/tests/selenium/log"
```

## Rate-limiting

WikiLambda uses [PoolCounter](https://www.mediawiki.org/wiki/Extension:PoolCounter) to limit the number of concurrent function calls a user may have in flight at any given time. In order to set the concurrency limit, you need to add configuration for a `WikiLambdaFunctionCall` pool to [$wgPoolCounterConf](https://www.mediawiki.org/wiki/Manual:$wgPoolCounterConf) in `LocalSettings.php`.

The example below allows users to have at most two functions executing at a given time, placing any function calls that exceed the concurrency limit in a queue:

```
$wgPoolCounterConf = [
    'WikiLambdaFunctionCall' => [
        'class' => MediaWiki\Extension\PoolCounter\Client::class,
        'timeout' => 1, // wait timeout in seconds
        'workers' => 2, // maximum number of active threads in each pool
        'maxqueue' => 5, // maximum number of total threads in each pool
    ]
];
```

## See also

<https://www.mediawiki.org/wiki/Extension:WikiLambda>
