<?php
/**
 * WikiLambda AbstractWikiContent deferred data updater:
 * * deletes AWArticleStore entries when an Abstract Wiki Content is removed
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
use Wikimedia\Timestamp\ConvertibleTimestamp;

class AbstractContentDataRemoval extends DataUpdate {

	private LoggerInterface $logger;

	/**
	 * @param Title $title
	 * @param AWArticleStore $articleStore
	 */
	public function __construct(
		private readonly Title $title,
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

		// Get the metadata payload (if stored) to edit only the relevant keys
		$metadata = $this->articleStore->getArticleMetadata( $topicQid );
		$payload = $metadata === null ? [] : $metadata->getPayload();
		$payload[ 'awDeleted' ] = ConvertibleTimestamp::now();

		// Store the metadata object in the article store
		$metadata = new AWArticleMetadata( $topicQid, $payload );
		$this->articleStore->setArticleMetadata( $metadata );
	}
}
