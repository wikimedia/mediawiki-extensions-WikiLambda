<?php
/**
 * WikiLambda AbstractWikiContent deferred data updater:
 * * keeps AWArticleMetadata in the AWArticleStore up to date with new or update section info.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\AbstractContent;

use MediaWiki\Deferred\DataUpdate;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleMetadata;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Title\Title;
use Psr\Log\LoggerInterface;

class AbstractContentDataUpdate extends DataUpdate {

	private LoggerInterface $logger;

	/**
	 * @param Title $title
	 * @param AbstractWikiContent $awContent
	 * @param AWArticleStore $articleStore
	 */
	public function __construct(
		private readonly Title $title,
		private readonly AbstractWikiContent $awContent,
		private readonly AWArticleStore $articleStore,
	) {
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaAbstract' );
	}

	/**
	 * @inheritDoc
	 */
	public function doUpdate() {
		$topicQid = $this->title->getDBkey();

		$this->logger->info(
			__METHOD__ . ': Updating Metadata in the AWArticleStore for {topicQid}',
			[ 'topicQid' => $topicQid ]
		);

		$sections = $this->awContent->getSections();
		if ( $sections === null ) {
			$this->logger->error(
				__METHOD__ . ' failed: AbstractWikiContent for {topicQid} had no sections',
				[ 'topicQid' => $topicQid ]
			);
			return;
		}

		// Get the metadata payload (if stored) to edit only the relevant keys
		$metadata = $this->articleStore->getArticleMetadata( $topicQid );
		$payload = $metadata === null ? [] : $metadata->getPayload();

		if ( $metadata === null ) {
			// Not a problem, but we should only see this on the initial article
			// creation. If we observe AWArticleMetadata missing often, we should
			// figure out why it's being deleted from the AWArticleStore.
			$this->logger->warning(
				__METHOD__ . ' found missing AWArticleMetadata object for {topicQid}',
				[ 'topicQid' => $topicQid ]
			);
		}

		// Iterate through the content sections, and gather the section index=>qid array:
		$sectionIds = [];
		foreach ( $sections as $sectionQid => $section ) {
			$sectionIndex = intval( $section['index'] ?? 0 );
			$sectionIds[ $sectionIndex ] = $sectionQid;
		}

		// Set sections in the payload
		$payload[ 'sections' ] = $sectionIds;

		// Set some info about the content object update and revision
		$payload[ 'awLastUpdated' ] = $this->title->getTouched();
		$payload[ 'awLatestRevID' ] = (string)$this->title->getLatestRevID();

		// Store the metadata object in the article store
		$metadata = new AWArticleMetadata( $topicQid, $payload );
		$this->articleStore->setArticleMetadata( $metadata );
	}
}
