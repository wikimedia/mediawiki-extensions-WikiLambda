<?php
/**
 * Provider for Abstract Wikipedia Community Configuration data.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\AbstractContent;

use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\Registration\ExtensionRegistry;
use Psr\Log\LoggerInterface;
use Throwable;

class AbstractWikiConfigProvider {

	private LoggerInterface $logger;
	private ?array $optedInCache = null;

	private const AW_OPTEDIN_PROVIDER_ID = 'AbstractWikiOptedInArticles';

	public function __construct() {
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaAbstractClient' );
	}

	/**
	 * Resolve a CommunityConfiguration-managed list of opted in articles
	 * provided by AbstractWikiOptedInArticles. The schema provides a list
	 * of items, each item containing a list of titles (where the first is the
	 * primary one) and their corresponding qid.
	 *
	 * The returned map should contain titles as the key, so that the different
	 * methods can cheaply consult the qid or redirect listed for the requested
	 * title.
	 *
	 * @see \MediaWiki\Extension\WikiLambda\Config\AbstractWikiOptedInArticlesSchema
	 *
	 * @return array
	 */
	public function provideOptedIn(): array {
		if ( $this->optedInCache !== null ) {
			return $this->optedInCache;
		}

		$this->optedInCache = [];

		if ( !ExtensionRegistry::getInstance()->isLoaded( 'CommunityConfiguration' ) ) {
			return $this->optedInCache;
		}

		try {
			$provider = MediaWikiServices::getInstance()
				->getService( 'CommunityConfiguration.ProviderFactory' )
				->newProvider( self::AW_OPTEDIN_PROVIDER_ID );
			$status = $provider->loadValidConfiguration();

			if ( $status->isOK() ) {
				$value = $status->getValue();
				$items = $value->OptedInArticles ?? [];

				foreach ( $items as $item ) {
					$titles = $item->title ?? [];

					if ( count( $titles ) === 0 || $titles[0] === null || trim( $titles[0] ) === '' ) {
						// This should not happen, log error and continue, we want to ignore
						// this item, but we also want to notice that there's a malformed item
						$this->logger->error(
							__METHOD__ . ': CommunityConfiguration provider {id} contains malformed item', [
								'id' => self::AW_OPTEDIN_PROVIDER_ID,
								'qid' => $item->qid,
								'title' => json_encode( $item->title )
							]
						);
						continue;
					}

					foreach ( $titles as $index => $title ) {
						$this->optedInCache[ $title ] = [
							'qid' => $item->qid,
							'redirect' => $index === 0 ? false : $titles[0]
						];
					}
				}
			}
		} catch ( Throwable $e ) {
			$this->logger->warning(
				__METHOD__ . ': CommunityConfiguration lookup for {id} failed: {msg}',
				[ 'id' => self::AW_OPTEDIN_PROVIDER_ID, 'msg' => $e->getMessage() ]
			);
		}

		return $this->optedInCache;
	}
}
