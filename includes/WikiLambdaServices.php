<?php
/**
 * WikiLambda Services
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use InvalidArgumentException;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiRequest;
use MediaWiki\Extension\WikiLambda\Authorization\ZObjectAuthorization;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore;
use MediaWiki\Extension\WikiLambda\AWStorage\AWFragmentStore;
use MediaWiki\Extension\WikiLambda\AWStorage\DBAWArticleStore;
use MediaWiki\Extension\WikiLambda\AWStorage\MainStashAWArticleStore;
use MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper;
use MediaWiki\Extension\WikiLambda\Language\WikifunctionsLanguageFactory;
use MediaWiki\Extension\WikiLambda\ParserFunction\WikifunctionsPFragmentRenderer;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;

/**
 * @codeCoverageIgnore
 */
class WikiLambdaServices {

	/**
	 * @return ZObjectStore
	 */
	public static function getZObjectStore(): ZObjectStore {
		return MediaWikiServices::getInstance()->getService( 'WikiLambdaZObjectStore' );
	}

	/**
	 * Note: Not explicitly typed, as this service is mocked in tests
	 *
	 * @return WikifunctionsClientStore
	 */
	public static function getWikifunctionsClientStore(): WikifunctionsClientStore {
		return MediaWikiServices::getInstance()->getService( 'WikifunctionsClientStore' );
	}

	/**
	 * @return ZObjectAuthorization
	 */
	public static function getZObjectAuthorization(): ZObjectAuthorization {
		return MediaWikiServices::getInstance()->getService( 'WikiLambdaZObjectAuthorization' );
	}

	/**
	 * @return MemcachedWrapper
	 */
	public static function getMemcachedWrapper(): MemcachedWrapper {
		return MediaWikiServices::getInstance()->getService( 'WikiLambdaMemcachedWrapper' );
	}

	/**
	 * @return AbstractWikiRequest
	 */
	public static function getAbstractWikiRequest(): AbstractWikiRequest {
		return MediaWikiServices::getInstance()->getService( 'AbstractWikiRequest' );
	}

	/**
	 * @return WikifunctionsPFragmentRenderer
	 */
	public static function getPFragmentRenderer(): WikifunctionsPFragmentRenderer {
		return MediaWikiServices::getInstance()->getService( 'WikiLambdaPFragmentRenderer' );
	}

	/**
	 * @return AWArticleStore
	 */
	public static function getAWArticleStore(): AWArticleStore {
		return MediaWikiServices::getInstance()->getService( 'AbstractWikiArticleStore' );
	}

	/**
	 * @return AWFragmentStore
	 */
	public static function getAWFragmentStore(): AWFragmentStore {
		return MediaWikiServices::getInstance()->getService( 'AbstractWikiFragmentStore' );
	}

	/**
	 * @return WikifunctionsLanguageFactory
	 */
	public static function getWikifunctionsLanguageFactory(): WikifunctionsLanguageFactory {
		return MediaWikiServices::getInstance()->getService( 'WikifunctionsLanguageFactory' );
	}

	/**
	 * Constructs a new instance of ZObjectStore.
	 * Reused by service wiring and installer bootstrapping.
	 *
	 * @internal For use in Service Wiring and early setup on RepoHooks
	 */
	public static function buildZObjectStore( MediaWikiServices $services ): ZObjectStore {
		return new ZObjectStore(
			$services->getConnectionProvider(),
			$services->getTitleFactory(),
			$services->getWikiPageFactory(),
			$services->getRevisionStore(),
			$services->getUserGroupManager(),
			LoggerFactory::getInstance( 'WikiLambda' )
		);
	}

	/**
	 * Constructs a new instance of the MemcachedWrapper for WikiLambda's content caching.
	 *
	 * @internal For use in Service Wiring and early setup on RepoHooks
	 */
	public static function buildMemcachedWrapper( MediaWikiServices $services ): MemcachedWrapper {
		$extensionConfig = $services->getConfigFactory()->makeConfig( 'WikiLambda' );
		return new MemcachedWrapper( $extensionConfig );
	}

	/**
	 * Constructs a new instance of the AWArticleStore.
	 *
	 * The concrete backend is selected by $wgWikiLambdaAWArticleStoreBackend:
	 *   - 'db'        — RDBMS-backed store (aw_article_sections, x1).
	 *   - 'mainstash' — MainStash-backed store (T426873; durable key/value
	 *                   substrate with TTL cleanup and x2 replication).
	 *
	 * @internal For use in Service Wiring and early setup on RepoHooks
	 */
	public static function buildAWArticleStore( MediaWikiServices $services ): AWArticleStore {
		$extensionConfig = $services->getConfigFactory()->makeConfig( 'WikiLambda' );
		$backend = $extensionConfig->get( 'WikiLambdaAWArticleStoreBackend' );

		switch ( $backend ) {
			case 'db':
				return new DBAWArticleStore(
					$services->getConnectionProvider()
				);
			case 'mainstash':
				return new MainStashAWArticleStore(
					$services->getMainObjectStash()
				);
			default:
				throw new InvalidArgumentException(
					"Unknown WikiLambdaAWArticleStoreBackend value: '$backend'"
				);
		}
	}

	/**
	 * Constructs a new instance of the AWFragmentStore.
	 *
	 * @internal For use in Service Wiring and early setup on RepoHooks
	 */
	public static function buildAWFragmentStore( MediaWikiServices $services ): AWFragmentStore {
		return new AWFragmentStore(
			$services->getJobQueueGroup(),
			self::buildMemcachedWrapper( $services )
		);
	}
}
