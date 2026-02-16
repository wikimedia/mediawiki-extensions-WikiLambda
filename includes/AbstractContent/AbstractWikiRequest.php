<?php
/**
 * AbstractWiki Request Service
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\AbstractContent;

use MediaWiki\Config\Config;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\Logger\LoggerFactory;
use Psr\Log\LoggerInterface;
use Wikimedia\ObjectCache\BagOStuff;

class AbstractWikiRequest {

	private Config $config;
	private HttpRequestFactory $httpRequestFactory;
	private BagOStuff $objectCache;
	private LoggerInterface $logger;

	public function __construct( Config $config, HttpRequestFactory $httpRequestFactory ) {
		$this->config = $config;
		$this->httpRequestFactory = $httpRequestFactory;

		$this->objectCache = WikiLambdaServices::getZObjectStash();
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaAbstract' );
	}

	/**
	 * Performs remote call to Wikifunctions' wikilambda_function_call Action API
	 *
	 * @param array $functionCall
	 * @return array sanitized HTML fragment (Z89) response object
	 * @throws AbstractWikiRequestException
	 */
	public function renderFragment( array $functionCall ): array {
		// Base API URL from config
		$targetUrl = $this->config->get( 'WikiLambdaClientTargetAPI' );
		if ( !$targetUrl ) {
			// Missing configuration, abstractwiki-not-implemented error
			throw new AbstractWikiRequestException(
				'apierror-abstractwiki_run_fragment-not-enabled',
				HttpStatus::NOT_IMPLEMENTED
			);
		}
		$apiUrl = $targetUrl . '/w/api.php';

		// Stringify the function call
		$functionCallEncoded = json_encode( $functionCall, JSON_THROW_ON_ERROR );

		// Build POST params
		$params = [
			'format' => 'json',
			'action' => 'wikilambda_function_call',
			'wikilambda_function_call_zobject' => $functionCallEncoded,
		];

		// Create and execute request
		$request = $this->httpRequestFactory->create(
			$apiUrl,
			[
				'method' => 'POST',
				'postData' => $params
			],
			__METHOD__
		);

		$status = $request->execute();

		if ( !$status->isOK() ) {
			throw new AbstractWikiRequestException( 'apierror-abstractwiki_run_fragment-bad-response' );
		}

		// Decode response
		$responseData = json_decode( $request->getContent(), true );

		if ( !is_array( $responseData ) ) {
			throw new AbstractWikiRequestException( 'apierror-abstractwiki_run_fragment-bad-response' );
		}

		// Give phan some assistance on what we expect the response to look like
		'@phan-var array{wikilambda_function_call?: array{data?: string}} $responseData';

		$responseEnvelopeStr = $responseData[ 'wikilambda_function_call' ][ 'data' ] ?? '';
		$responseEnvelope = json_decode( $responseEnvelopeStr, true );

		if ( !is_array( $responseEnvelope ) ) {
			throw new AbstractWikiRequestException( 'apierror-abstractwiki_run_fragment-bad-response' );
		}

		// Give phan some assistance on what we expect the envelope to look like
		'@phan-var array{Z22K1:array<string,string|array>,Z22K2:array<string,string|array>} $responseEnvelope';

		$htmlFragment = $responseEnvelope[ ZTypeRegistry::Z_RESPONSEENVELOPE_VALUE ];

		// We make sure that the result is a Z89/HTML fragment
		if ( !is_array( $htmlFragment ) || !array_key_exists( ZTypeRegistry::Z_HTML_FRAGMENT_VALUE, $htmlFragment ) ) {
			throw new AbstractWikiRequestException( 'apierror-abstractwiki_run_fragment-bad-response' );
		}

		return $htmlFragment;
	}

	/**
	 * Caches the latest sanitized HTML fragment with both latest and stale cache keys.
	 *
	 * @param string $sanitizedHtml
	 * @param string $cacheKeyFresh
	 * @param string $cacheKeyStale
	 */
	public function cacheFreshAndStale( $sanitizedHtml, $cacheKeyFresh, $cacheKeyStale ): void {
		// Store fresh value for at least 48 hours to ensure availability through timezones:
		$this->objectCache->set( $cacheKeyFresh, $sanitizedHtml, $this->objectCache::TTL_WEEK );
		// Store stale value for a month:
		$this->objectCache->set( $cacheKeyStale, $sanitizedHtml, $this->objectCache::TTL_MONTH );
	}
}
