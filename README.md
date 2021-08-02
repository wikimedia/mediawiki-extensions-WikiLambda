# WikiLambda extension for MediaWiki

WikiLambda will provide Wikimedia wikis with a wikitext parser function to call evaluation of functions written, managed, and evaluated on a central wiki.

## Development instructions

* Bring up a [development environment](https://www.mediawiki.org/wiki/How_to_become_a_MediaWiki_hacker) for MediaWiki (e.g. [Docker](https://www.mediawiki.org/wiki/MediaWiki-Docker) or [Vagrant](https://www.mediawiki.org/wiki/MediaWiki-Vagrant)).
* In your `mediawiki/extensions/` subdirectory, clone the extension as follows:
  ```
  git clone --recurse-submodules --remote-submodules https://gerrit.wikimedia.org/r/mediawiki/extensions/WikiLambda
  ```
* Add the following to your `LocalSettings.php` file:
  ```
  wfLoadExtension( 'WikiLambda' );
  ```
* Run `php maintenance/update.php` to provision necessary schemas and initial content.

Done! Navigate to the newly created `ZObject:Z1` page on your wiki to verify that the extension is successfully installed.

### Orchestration and evaluation

If you would like to use the orchestrator/evaluator (e.g., to run user-defined and built-in functions), please perform the following additional steps:

* Copy the contents of the `services` block in `mediawiki/extensions/WikiLambda/docker-compose.sample.yml` to the analogous `services` block in your `mediawiki/docker-compose.override.yml`
* Replace `<TAG>` entries in the stanza you just copied with the latest builds from the Docker registry for [the orchestrator](https://docker-registry.wikimedia.org/wikimedia/mediawiki-services-function-orchestrator/tags/) and  [the evaluator](https://docker-registry.wikimedia.org/wikimedia/mediawiki-services-function-evaluator/tags/).
* If you would instead like to use a local version of the function orchestrator or evaluator, carry out the following steps.

  ```
  # First, get Blubber: https://wikitech.wikimedia.org/wiki/Blubber/Download#Blubber_as_a_(micro)Service
  # Then, from the root of your function-orchestrator installation, run
  blubber .pipeline/blubber.yaml development | docker build -t local-orchestrator -f - .
  ```

  After that, in `mediawiki/docker-compose.override.yaml`, replace `image: docker-registry...` in the `function-orchestrator` service stanza to read `image: local-orchestrator:latest`. If changing the evaluator, follow the same steps but for the evaluator image.

* If you want to use a different port or your checkout of MediaWiki is not in a directory called 'mediawiki', you may need to change the WikiLambdaOrchestratorLocation configuration from the default of `mediawiki_function-orchestrator_1:6254` in your LocalSettings file, e.g. to `core_function-orchestrator_1:6254`..
* You can test your installation by removing `@group: Broken` from `mediawiki/extensions/WikiLambda/tests/phpunit/integration/API/ApiFunctionCallTest.php` and running the PHPUnit test suite as described in the MediaWiki install instructions.
* You can evaluate an arbitrary function call by navigating to `localhost:8080/wiki/Special:CreateZObject`, adding a new key/value pair whose value is of type `Z7`, and selecting a function.
* Note that if you are running the evaluator at a different relative URL than the default, you will have to change the value of WikiLambdaEvaluatorLocation in your local settings appropriately.

## See also

<https://www.mediawiki.org/wiki/Extension:WikiLambda>
