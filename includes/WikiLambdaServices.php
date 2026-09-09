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

use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiConfigProvider;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiRequest;
use MediaWiki\Extension\WikiLambda\Authorization\ZObjectAuthorization;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore;
use MediaWiki\Extension\WikiLambda\AWStorage\AWFragmentStore;
use MediaWiki\Extension\WikiLambda\AWStorage\MainStashAWArticleStore;
use MediaWiki\Extension\WikiLambda\AWStorage\MainStashAWFragmentStore;
use MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper;
use MediaWiki\Extension\WikiLambda\ClientStorage\MainStashWikifunctionsFragmentStore;
use MediaWiki\Extension\WikiLambda\ClientStorage\WikifunctionsClientStore;
use MediaWiki\Extension\WikiLambda\ClientStorage\WikifunctionsFragmentStore;
use MediaWiki\Extension\WikiLambda\ClientStorage\WikifunctionsUsageStore;
use MediaWiki\Extension\WikiLambda\Language\WikifunctionsLanguageFactory;
use MediaWiki\Extension\WikiLambda\Renderer\WikifunctionsFragmentRenderer;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;

/**
 * @codeCoverageIgnore
 */
class WikiLambdaServices {

	/**
	 * @return WikiLambdaMode
	 */
	public static function getMode(): WikiLambdaMode {
		return MediaWikiServices::getInstance()->getService( 'WikiLambdaMode' );
	}

	/**
	 * @return ZObjectStore
	 */
	public static function getZObjectStore(): ZObjectStore {
		return MediaWikiServices::getInstance()->getService( 'WikiLambdaZObjectStore' );
	}

	/**
	 * @return OrchestratorRequest
	 */
	public static function getOrchestratorRequest(): OrchestratorRequest {
		return MediaWikiServices::getInstance()->getService( 'WikiLambdaOrchestratorRequest' );
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
	 * @return WikifunctionsUsageStore
	 */
	public static function getWikifunctionsUsageStore(): WikifunctionsUsageStore {
		return MediaWikiServices::getInstance()->getService( 'WikifunctionsUsageStore' );
	}

	/**
	 * @return WikifunctionsFragmentStore
	 */
	public static function getWikifunctionsFragmentStore(): WikifunctionsFragmentStore {
		return MediaWikiServices::getInstance()->getService( 'WikifunctionsFragmentStore' );
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
	 * @return WikifunctionsFragmentRenderer
	 */
	public static function getPFragmentRenderer(): WikifunctionsFragmentRenderer {
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
	 * @return WikidataEntityLookup
	 */
	public static function getWikidataEntityLookup(): WikidataEntityLookup {
		return MediaWikiServices::getInstance()->getService( 'WikiLambdaWikidataEntityLookup' );
	}

	/**
	 * @return AbstractWikiConfigProvider
	 */
	public static function getAbstractWikiConfigProvider(): AbstractWikiConfigProvider {
		return MediaWikiServices::getInstance()->getService( 'AbstractWikiConfigProvider' );
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
	 * Constructs a new instance of the WikifunctionsFragmentStore.
	 *
	 * The store is backed by MediaWiki MainStash, a durable key/value substrate
	 * with TTL cleanup and x2 replication.
	 *
	 * @internal For use in Service Wiring and early setup on RepoHooks
	 */
	public static function buildWikifunctionsFragmentStore( MediaWikiServices $services ): WikifunctionsFragmentStore {
		return new MainStashWikifunctionsFragmentStore(
			$services->getMainObjectStash(),
			$services->getStatsFactory()
		);
	}

	/**
	 * Constructs a new instance of the MemcachedWrapper for WikiLambda's content caching.
	 *
	 * @internal For use in Service Wiring and early setup on RepoHooks
	 */
	public static function buildMemcachedWrapper( MediaWikiServices $services ): MemcachedWrapper {
		$extensionConfig = $services->getConfigFactory()->makeConfig( 'WikiLambda' );
		return new MemcachedWrapper( $extensionConfig, $services->getStatsFactory() );
	}

	/**
	 * Constructs a new instance of the AWArticleStore.
	 *
	 * The store is backed by MainStash (T426873), a durable key/value substrate
	 * with TTL cleanup and x2 replication.
	 *
	 * @internal For use in Service Wiring and early setup on RepoHooks
	 */
	public static function buildAWArticleStore( MediaWikiServices $services ): AWArticleStore {
		return new MainStashAWArticleStore(
			$services->getMainObjectStash(),
			$services->getStatsFactory()
		);
	}

	/**
	 * Constructs a new instance of the AWFragmentStore.
	 *
	 * The store is backed by MediaWiki MainStash (T431428), a durable key/value
	 * substrate with TTL cleanup and x2 replication.
	 *
	 * @internal For use in Service Wiring and early setup on RepoHooks
	 */
	public static function buildAWFragmentStore( MediaWikiServices $services ): AWFragmentStore {
		return new MainStashAWFragmentStore(
			$services->getJobQueueGroup(),
			$services->getMainObjectStash(),
			$services->getStatsFactory()
		);
	}
}
