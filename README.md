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

## See also

<https://www.mediawiki.org/wiki/Extension:WikiLambda>
