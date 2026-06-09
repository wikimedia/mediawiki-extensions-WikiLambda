<?php

/**
 * WikiLambda maintenance script to update the Abstract Wikipedia Article store.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Maintenance;

use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentUtils;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContentHandler;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleMetadata;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore;
use MediaWiki\Extension\WikiLambda\AWStorage\AWFragmentStore;
use MediaWiki\Extension\WikiLambda\AWStorage\AWSection;
use MediaWiki\Extension\WikiLambda\Language\WikifunctionsLanguage;
use MediaWiki\Extension\WikiLambda\Language\WikifunctionsLanguageFactory;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Maintenance\Maintenance;
use MediaWiki\Revision\RevisionStore;
use MediaWiki\Title\TitleFactory;
use Wikimedia\Timestamp\ConvertibleTimestamp;

$IP = getenv( 'MW_INSTALL_PATH' );
if ( $IP === false ) {
	$IP = __DIR__ . '/../../..';
}
require_once "$IP/maintenance/Maintenance.php";

class UpdateAbstractWikiArticleStore extends Maintenance {
	private AWArticleStore $articleStore;
	private AWFragmentStore $fragmentStore;

	private WikifunctionsLanguageFactory $languageFactory;

	private RevisionStore $revisionStore;
	private TitleFactory $titleFactory;

	private int $abstractNs;

	/**
	 * @inheritDoc
	 */
	public function __construct() {
		parent::__construct();
		$this->requireExtension( 'WikiLambda' );
		$this->addDescription( 'Populate the durable Abstract Wiki Article Store for a list of topics and languages' );

		// List of comma-separated qids; required, requires a following value
		$this->addOption(
			'topics',
			'List of Abstract Wikipedia Topic QIDs to update, comma-separated',
			true,
			true
		);

		// List of comma-separated language codes; required, requires a following value
		$this->addOption(
			'langs',
			'List of MediaWiki\'s BCP-47 locale identifiers to update the Abstract Wiki Articles for, comma-separated.',
			true,
			true
		);
	}

	/**
	 * This script generates and updates the content of the Abstract Wiki Article
	 * store, which contains a record of generated Sections and Article Metadata.
	 *
	 * The script updates the store for a given set of topic Qids and a given set
	 * of BCP-47 language codes.
	 *
	 * E.g.:
	 * To generate and update the sections for the Abstract Wikipedia articles
	 * about Q42/Douglas Adams in Spanish and English, do:
	 *
	 * $ php maintenance/run.php \
	 *   ./extensions/WikiLambda/maintenance/updateAbstractWikiArticleStore.php
	 *   --topics Q42 --langs es,en
	 *
	 * The script follows this logic:
	 *
	 * For each qid in --topics:
	 * 1. Retrieve the AbstractWikiContent (stored in abstract.wikipedia.org)
	 *    If this script is strictly run in Abstract repo, then we can simply
	 *    retrieve the content object without having to depend on a network trip.
	 * 2. Get the Article sections
	 * 3. For each section within the Abstract Article and each language in --langs:
	 *    3.1. Get the section fragments
	 *    3.2. For each fragment:
	 *         3.2.1. Get AWFragment from AWFragmentStore
	 *         3.2.2. Serialize the fragment to HTML
	 *                * if AWFragment::isMissing: create a pending fragment block
	 *                * if not AWFragment::isOk: create a failing fragment block
	 *                * else: use the stored fragment html payload
	 *    3.3. Join all fragments to generate payload
	 *    3.4. Build AWSection( topic_qid, section_qid, locale, payload )
	 *    3.5. AWArticleStore::setSection( AWSection )
	 *    3.6. TODO: If any of the fragments was outdated or missing, re-program
	 *         this script so that we run it again (for qid/sectionqid/locale)
	 *         when fragments are ready and cached.
	 * 4. Finally, we update the AWArticleMetadata row
	 *
	 * @inheritDoc
	 */
	public function execute() {
		$services = $this->getServiceContainer();

		$config = $services->getMainConfig();

		// We restrict this maintenance script to be run in Abstract Mode, so that we can depend
		// on AbstractWikiContentHandler and load the AW article locally without any network trip.
		if ( !$config->get( 'WikiLambdaEnableAbstractMode' ) ) {
			$this->fatalError( 'This maintenance script should be run in the Abstract Wikipedia (repo) instance' );
		}

		$this->languageFactory = WikiLambdaServices::getWikifunctionsLanguageFactory();
		$this->revisionStore = $services->getRevisionStore();
		$this->titleFactory = $services->getTitleFactory();

		// Build AWArticleStore and AWFragmentStore, because ServiceWiring hasn't run
		$this->articleStore = WikiLambdaServices::buildAWArticleStore( $services );
		$this->fragmentStore = WikiLambdaServices::buildAWFragmentStore( $services );

		// Build AbstractWiki ContentHandler
		$contentHandlerFactory = $services->getContentHandlerFactory();
		$contentHandler = $contentHandlerFactory->getContentHandler( CONTENT_MODEL_ABSTRACT );
		'@phan-var AbstractWikiContentHandler $contentHandler';

		// Get AbstractContent primary namespace ID
		$namespaces = $config->get( 'WikiLambdaAbstractNamespaces' );
		$this->abstractNs = is_array( $namespaces ) && ( count( $namespaces ) > 0 )
			? intval( array_keys( $namespaces )[0] )
			: NS_MAIN;

		// Get --topics and --langs inputs
		$topics = $this->getOptionTopics();
		$langs = $this->getOptionLangs();

		// Mark the time of maintenance script execution; we'll use the
		// same time for the whole duration of the script, so that all
		// the fragments are generated for a consistent date.
		$now = new ConvertibleTimestamp();
		$this->output( "Start time: " . $now->format( 'Y-m-d H:i:s O' ) . "\n" );

		foreach ( $topics as $topicQid ) {
			$this->output( "Generating topic $topicQid\n" );

			// 1. Get AbstractWikiContent (locally stored, so we know it is in NS_MAIN namespace)
			$title = $this->titleFactory->newFromText( $topicQid, $this->abstractNs );

			if ( !$title || !$title->exists() ) {
				// TODO: log and continue with next topic qid
				$this->output( "> no content for this topic; next!\n" );
				continue;
			}

			$awContent = $contentHandler->getAbstractContentForTitle( $this->revisionStore, $title );

			if ( $awContent === false ) {
				// TODO: log and continue with next topic qid
				$this->output( "> no content for this topic; next!\n" );
				continue;
			}

			if ( !$awContent->isValid() ) {
				// TODO: log and continue with next topic qid
				$this->output( "> invalid content for this topic; next!\n" );
				continue;
			}

			$metadata = $this->articleStore->getArticleMetadata( $topicQid );
			$payload = $metadata === null ? [] : $metadata->getPayload();

			// Initialize pendingSections map, we don't wanna step on any
			// metadata if the update script was called with a subset of the
			// available languages, so we will compile the pending sections for
			// this iteration and merge them with the existing ones later on.
			$pendingSections = array_fill_keys( $langs, [] );

			// Now we know that sections has valid (non-empty) content
			$sections = $awContent->getSections() ?? [];
			$sectionIds = [];

			// For each section...
			foreach ( $sections as $sectionQid => $section ) {
				$this->output( "\n> Generating section $sectionQid for all languages:\n" );

				// We compile all the section indices and qids for the metadata object
				$sectionIndex = intval( $section['index'] ?? 0 );
				$sectionIds[ $sectionIndex ] = $sectionQid;
				// Get the section fragment function calls; remove benjamin item
				$sectionFragments = array_slice( $section['fragments'], 1 );

				// For each language, regenerate and store the AW Section HTML blob
				foreach ( $langs as $locale ) {
					// TODO: Currently we generate each section in all languages before passing
					// onto the next section, because we store by section, so we complete, store
					// and continue.
					// Because fragments need the same wikidata items for all languages, it might
					// be more cache-efficient to run all fragments for all languages instead.
					// However, that would complicate the code a little bit, and would also mean
					// that we are paralelly generating all sections in all languages at the same
					// time, so issues are less recoverable and affect the generation of whole
					// articles rather than only article sections.
					$language = $this->languageFactory->getLanguage( $locale );
					$freshSection = $this->generateAWSectionForLang(
						$topicQid,
						$sectionQid,
						$language,
						$now,
						$sectionFragments
					);

					// Depending on the section state (missing or failing)
					// we can do different things. For pending sections,
					// only update if there's no current section stored.
					if ( $freshSection->isPending() ) {
						$pendingSections[ $locale ][] = $sectionQid;
						$oldSection = $this->articleStore->getSection( $topicQid, $sectionQid, $locale );
						// There's already some section stored, so let's keep it
						// instead of replacing it with a pending state one:
						if ( $oldSection ) {
							// TODO log that we are passing on an update: this log is IMPORTANT
							$this->output( "> > NOT storing section $sectionQid for $locale - "
								. "section is pending but a stale version is already stored\n" );
							continue;
						}
					}

					// TODO: do we need to handle errors from this setter?
					$this->output( "> > Storing section $sectionQid for $locale - payload: "
						. $freshSection->getPayload() . "\n" );
					$this->articleStore->setSection( $freshSection );
				}
			}

			// 4. Before being done with this topicQid, we compile and store the AWArticleMetadata

			// We update the indices here as well, to make sure they are up to date
			$payload[ 'sections' ] = $sectionIds;
			// Merge existing pendingSections with updated one, and filter out those languages with empty arrays
			$payload[ 'pendingSections' ] = array_merge( $payload[ 'pendingSections' ] ?? [], $pendingSections );
			$payload[ 'pendingSections' ] = array_filter( $payload[ 'pendingSections' ], static function ( $secs ) {
				return count( $secs ) > 0;
			} );
			// Add information of the new render time and status
			$payload[ 'lastRendered' ] = ConvertibleTimestamp::now();

			$this->output( "> Metadata for topic $topicQid: " . json_encode( $payload ) . "\n" );

			// Set updated metadata
			// TODO: build payload in a schema-aware way (whatever that means),
			// so that we can filter out or initialize necessary keys if we need to
			$this->articleStore->setArticleMetadata( new AWArticleMetadata( $topicQid, $payload ) );
		}
	}

	/**
	 * @param string $topicQid
	 * @param string $sectionQid
	 * @param WikifunctionsLanguage $language
	 * @param ConvertibleTimestamp $ts
	 * @param array $fragments
	 * @return AWSection
	 */
	private function generateAWSectionForLang(
		string $topicQid,
		string $sectionQid,
		WikifunctionsLanguage $language,
		ConvertibleTimestamp $ts,
		array $fragments
	): AWSection {
		// Construct a blank AWSection with no payload
		$awSection = new AWSection( $topicQid, $sectionQid, $language->getCode() );

		foreach ( $fragments as $fragment ) {
			// 3.2.1. Get the fragment from the store, which might be fresh html, stale html, or missing:
			$awFragment = $this->fragmentStore->getRenderedAWFragment(
				$fragment,
				$topicQid,
				$language,
				$ts->format( 'Y-m-d' ),
			);

			// 3.2.2. Append the fragment to the section
			// Internally, AWSection::appendFragment keeps a record whenever it
			// encounters pending or failing fragments.
			$awSection->appendFragment( $awFragment );
		}

		return $awSection;
	}

	/**
	 * Get validated and unique Wikidata qids from --topics.
	 * E.g. --topics Q1,Q2,Q4
	 *
	 * @return array
	 */
	private function getOptionTopics(): array {
		$raw = $this->getOption( 'topics' ) ?? '';

		// Get array of trimmed qids
		$qids = array_map( 'trim', explode( ',', $raw ) );

		// Filter by qid valid format
		$qids = array_filter( $qids, static function ( string $qid ) {
			// TODO: should we log something whenever inputs are not valid qids?
			// this would indicate some issue in the configuration, so maybe
			// we shouldn't fatal but we should have some visibility.
			return AbstractContentUtils::isValidWikidataItemReference( $qid );
		} );

		if ( $qids === [] ) {
			$this->fatalError( 'The --qids option must contain at least one QID.' );
		}

		// Return unique values
		return array_values( array_unique( $qids ) );
	}

	/**
	 * Get unique language codes from --langs.
	 * E.g. --langs en,es,eu
	 *
	 * @return array
	 */
	private function getOptionLangs(): array {
		$raw = $this->getOption( 'langs' ) ?? '';

		// Get array of trimmed language codes
		$langs = array_map( 'trim', explode( ',', $raw ) );

		// TODO: Is there a way that we can validate language codes?
		$langs = array_filter( $langs, static function ( string $lang ): bool {
			// TODO: should we log invalid language codes so that we can fix
			// the configuration issue?
			return preg_match( '/^[a-z]{2,3}(-[a-z0-9]+)*$/i', $lang ) === 1;
		} );

		if ( $langs === [] ) {
			$this->fatalError( 'The --langs option must contain at least one valid language code.' );
		}

		// Return unique values
		return array_values( array_unique( $langs ) );
	}
}

$maintClass = UpdateAbstractWikiArticleStore::class;
require_once RUN_MAINTENANCE_IF_MAIN;
