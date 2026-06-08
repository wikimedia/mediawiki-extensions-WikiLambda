<?php
/**
 * WikiLambda Service Wiring
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use GuzzleHttp\Client;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiRequest;
use MediaWiki\Extension\WikiLambda\Authorization\ZObjectAuthorization;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore;
use MediaWiki\Extension\WikiLambda\AWStorage\AWFragmentStore;
use MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper;
use MediaWiki\Extension\WikiLambda\Language\WikifunctionsLanguageFactory;
use MediaWiki\Extension\WikiLambda\Renderer\WikifunctionsFragmentImageRenderer;
use MediaWiki\Extension\WikiLambda\Renderer\WikifunctionsFragmentRenderer;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;

/**
 * @codeCoverageIgnore
 */
return [
	// For repo wikis

	'WikiLambdaZObjectStore' => static function ( MediaWikiServices $services ): ZObjectStore {
		return WikiLambdaServices::buildZObjectStore( $services );
	},

	'WikiLambdaZObjectAuthorization' => static function ( MediaWikiServices $services ): ZObjectAuthorization {
		return new ZObjectAuthorization(
			LoggerFactory::getInstance( 'WikiLambda' )
		);
	},

	'WikiLambdaOrchestratorRequest' => static function ( MediaWikiServices $services ): OrchestratorRequest {
			$config = $services->getConfigFactory()->makeConfig( 'WikiLambda' );
			$host = $config->get( 'WikiLambdaOrchestratorLocation' );
			$client = new Client( [ 'base_uri' => $host ] );
			return new OrchestratorRequest( $client );
	},

	// For both repo and client wikis

	'WikiLambdaMemcachedWrapper' => static function ( MediaWikiServices $services ): MemcachedWrapper {
		return WikiLambdaServices::buildMemcachedWrapper( $services );
	},

	'WikiLambdaPFragmentRenderer' => static function ( MediaWikiServices $services ): WikifunctionsFragmentRenderer {
		$imageRenderer = new WikifunctionsFragmentImageRenderer(
			LoggerFactory::getInstance( 'WikiLambda' ),
			$services->getHttpRequestFactory(),
			WikiLambdaServices::getMemcachedWrapper(),
			$services->getBadFileLookup()
		);
		return new WikifunctionsFragmentRenderer(
			LoggerFactory::getInstance( 'WikiLambda' ),
			$services->getUserFactory(),
			$services->getMainConfig(),
			$imageRenderer
		);
	},

	// For client wikis

	'WikifunctionsClientStore' => static function ( MediaWikiServices $services ): WikifunctionsClientStore {
		return new WikifunctionsClientStore(
			$services->getConnectionProvider()
		);
	},

	// For abstract mode

	'AbstractWikiRequest' => static function ( MediaWikiServices $services ): AbstractWikiRequest {
		return new AbstractWikiRequest(
			$services->getMainConfig(),
			$services->getHttpRequestFactory(),
			WikiLambdaServices::getAWFragmentStore(),
			WikiLambdaServices::getPFragmentRenderer()
		);
	},

	// For abstract and abstract client mode

	'AbstractWikiArticleStore' => static function ( MediaWikiServices $services ): AWArticleStore {
		return WikiLambdaServices::buildAWArticleStore( $services );
	},

	'AbstractWikiFragmentStore' => static function ( MediaWikiServices $services ): AWFragmentStore {
		return WikiLambdaServices::buildAWFragmentStore( $services );
	},

	// For all environments

	'WikifunctionsLanguageFactory' => static function ( MediaWikiServices $services ): WikifunctionsLanguageFactory {
		return new WikifunctionsLanguageFactory(
			$services->getLanguageFactory()
		);
	},

	'WikiLambdaWikidataEntityLookup' => static function ( MediaWikiServices $services ): WikidataEntityLookup {
		return new WikidataEntityLookup();
	}
];
