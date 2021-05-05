# WikiLamba extension for MediaWiki

WikiLambda will provide Wikimedia wikis with a wikitext parser function to call evaluation of functions written, managed, and evaluated on a central wiki.

## Development instructions

* Bring up a [development environment](https://www.mediawiki.org/wiki/How_to_become_a_MediaWiki_hacker) for MediaWiki (e.g. [Docker](https://www.mediawiki.org/wiki/MediaWiki-Docker) or [Vagrant](https://www.mediawiki.org/wiki/MediaWiki-Vagrant)).
* In your `mediawiki/extensions/` subdirectory, clone the extension as follows:
  ```
  git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/WikiLambda
  ```
* Add the following to your `LocalSettings.php` file:
  ```
  wfLoadExtension( 'WikiLambda' );
  ```
* Run `php maintenance/update.php` to provision necessary schemas and initial content.

Done! Navigate to the newly created `ZObject:Z1` page on your wiki to verify that the extension is successfully installed.

### Orchestration

If you would like to use the orchestrator (e.g., to run built-in functions), please perform the following additional steps:

* Copy the `services.function-orchestrator` block in `mediawiki/extensions/WikiLambda/docker-compose.sample.yml` to the analogous `services` block in `mediawiki/docker-compose.override.yml`
* If you want to use a different port or your checkout of MediaWiki is not in a directory called 'mediawiki', you may need to change the WikiLambdaOrchestratorLocation configuration from the default of `mediawiki_function-orchestrator_1:6254` in your LocalSettings file, e.g. to `core_function-orchestrator_1:6254`..
* You can test your installation by removing `@group: Broken` from `mediawiki/extensions/WikiLambda/tests/phpunit/integration/API/ApiFunctionCallTest.php` and running the PHPUnit test suite as described in the MediaWiki install instructions.
* You can evaluate an arbitrary function call by navigating to `localhost:8080/wiki/Special:Create:ZObject`, adding a new key/value pair whose value is of type `Z7`, and selecting a built-in function.

## See also

<https://www.mediawiki.org/wiki/Extension:WikiLambda>
