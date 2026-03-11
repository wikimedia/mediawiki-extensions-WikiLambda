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
use MediaWiki\Extension\WikiLambda\ParserFunction\WikifunctionsPFragmentSanitiserTokenHandler;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikifunctionCallException;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\Logger\LoggerFactory;
use Psr\Log\LoggerInterface;
use Wikimedia\ObjectCache\WANObjectCache;

class AbstractWikiRequest {

	private Config $config;
	private HttpRequestFactory $httpRequestFactory;
	private WANObjectCache $objectCache;
	private LoggerInterface $logger;

	public function __construct( Config $config, HttpRequestFactory $httpRequestFactory ) {
		$this->config = $config;
		$this->httpRequestFactory = $httpRequestFactory;

		$this->objectCache = WikiLambdaServices::getZObjectStash();
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaAbstract' );
	}

	/**
	 * Re-generates a safe Abstract Wikipedia fragment by requesting it remotely
	 * from Wikifunctions (repo), sanitising it, and storing it locally in the
	 * cache under both the fresh and the stale keys.
	 *
	 * Returns an associative array containing the cached value, either a
	 * successfully rendered and sanitised fragment, or a failed one.
	 *
	 * @param array $functionCall
	 * @param string $cacheKeyFresh
	 * @param string $cacheKeyStale
	 * @return array
	 */
	public function generateSafeFragment(
		array $functionCall,
		string $cacheKeyFresh,
		string $cacheKeyStale
	): array {
		$cachedValue = [];
		// Set initial TTL, for successful renders or 400/bad requests:
		// * fresh value for at least 48 hours to ensure availability through timezones
		// * stale value for a month
		$staleValueTTL = $this->objectCache::TTL_MONTH;
		$freshValueTTL = $this->objectCache::TTL_WEEK;

		try {
			// 1. Run fragment function call, should return a Z89/Html fragment object
			$htmlFragment = $this->fetchRenderedFragment( $functionCall );

			// 2. If successful, sanitize the Z89K1/Html fragment value
			$sanitizedHtml = WikifunctionsPFragmentSanitiserTokenHandler::sanitiseHtmlFragment(
				$this->logger,
				$htmlFragment[ ZTypeRegistry::Z_HTML_FRAGMENT_VALUE ]
			);

			// 3. Cache sucessful sanitized fragment preview
			$cachedValue[ 'success' ] = true;
			$cachedValue[ 'value' ] = $sanitizedHtml;

		} catch ( WikifunctionCallException $e ) {
			// For temporary server errors: reduce fresh TTL to a minute
			if (
				$e->getHttpStatusCode() === HttpStatus::INTERNAL_SERVER_ERROR ||
				$e->getHttpStatusCode() === HttpStatus::SERVICE_UNAVAILABLE
			) {
				$freshValueTTL = $this->objectCache::TTL_MINUTE;
			}

			// Cache serialized error
			$cachedValue[ 'success' ] = false;
			$cachedValue[ 'value' ] = $e->toArray();

			$this->logger->error(
				__METHOD__ . ': AbstractWikiRequest::fetchRenderedFragment threw an Exception: {error}',
				[
					'error' => $e->getMessage(),
					'exception' => $e
				]
			);
		}

		// 4. Cache the response with both the fresh and the stale keys
		$cachedValueStr = json_encode( $cachedValue );
		$this->objectCache->set( $cacheKeyFresh, $cachedValueStr, $freshValueTTL );
		$this->objectCache->set( $cacheKeyStale, $cachedValueStr, $staleValueTTL );

		return $cachedValue;
	}

	/**
	 * Performs remote call to Wikifunctions' wikilambda_function_call Action API
	 *
	 * @param array $functionCall
	 * @return array HTML fragment (Z89) response object
	 * @throws WikifunctionCallException
	 */
	public function fetchRenderedFragment( array $functionCall ): array {
		// Base API URL from config
		$targetUrl = $this->config->get( 'WikiLambdaClientTargetAPI' );
		if ( !$targetUrl ) {
			// Missing configuration, abstractwiki-not-implemented error
			throw new WikifunctionCallException(
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
		$httpStatusCode = $request->getStatus();

		// HTTP 503
		// Transport level error; Wikifunctions could not be reached.
		if ( !$status->isOK() && $httpStatusCode === 0 ) {
			throw new WikifunctionCallException(
				'apierror-abstractwiki_run_fragment-service-unavailable',
				HttpStatus::SERVICE_UNAVAILABLE
			);
		}

		// HTTP 500
		// Decode the response and check that content is a valid JSON object.
		// If that's not the case, there's an unknown internal server error
		$responseData = json_decode( $request->getContent(), true );
		if ( !is_array( $responseData ) ) {
			throw new WikifunctionCallException(
				'apierror-abstractwiki_run_fragment-unknown-error',
				HttpStatus::INTERNAL_SERVER_ERROR
			);
		}

		// If there's an error key in the API response, it could be:
		// * error.code !== 'wikilambda-zerror'
		//   * 200/internal_api_error_* - some unknown error
		//   * 429/apierror-wikilambda_function_call-concurrency-limit - too many requests
		//   * 503/timeouterror-text - timeout
		// * error.code === 'wikilambda-zerror'
		//   * 503/Z529 - unable to connect to the orchestrator
		//   * 403/Z559 - no permissions
		//   * 400/Z501 - JSON styntax error
		//   * 400/Z518 - ZObject type mismatch
		if ( array_key_exists( 'error', $responseData ) ) {
			$errorCode = $responseData[ 'error' ][ 'code' ];
			// For 503 and 429, currently unavailable, try again later:
			if (
				$httpStatusCode === HttpStatus::SERVICE_UNAVAILABLE ||
				$httpStatusCode === HttpStatus::TOO_MANY_REQUESTS
			) {
				throw new WikifunctionCallException(
					'apierror-abstractwiki_run_fragment-service-unavailable',
					HttpStatus::SERVICE_UNAVAILABLE
				);
			}

			// For 403, permissions error, return forbidden:
			if ( $httpStatusCode === HttpStatus::FORBIDDEN ) {
				throw new WikifunctionCallException(
					'apierror-abstractwiki_run_fragment-forbidden',
					HttpStatus::FORBIDDEN
				);
			}

			// For 400, either wrong JSON or wrong ZObject type, return bad request:
			if ( $httpStatusCode === HttpStatus::BAD_REQUEST ) {
				throw new WikifunctionCallException(
					'apierror-abstractwiki_run_fragment-bad-fragment',
					HttpStatus::BAD_REQUEST
				);
			}

			// Else, return unknown issue:
			throw new WikifunctionCallException(
				'apierror-abstractwiki_run_fragment-unknown-error',
				HttpStatus::INTERNAL_SERVER_ERROR
			);
		}

		// The response does not have an error, but also doesn't have the
		// expected content, so throw an unknown error.
		if ( !array_key_exists( 'wikilambda_function_call', $responseData ) ) {
			throw new WikifunctionCallException(
				'apierror-abstractwiki_run_fragment-unknown-error',
				HttpStatus::INTERNAL_SERVER_ERROR
			);
		}

		// Give phan some assistance on what we expect the response to look like
		'@phan-var array{wikilambda_function_call?: array{data?: string}} $responseData';

		$responseEnvelopeStr = $responseData[ 'wikilambda_function_call' ][ 'data' ] ?? '';
		$responseEnvelope = json_decode( $responseEnvelopeStr );

		// The response is not a valid JSON, which probably means
		// that there is some unknown bug somewhere, return unknown:
		if ( !is_object( $responseEnvelope ) ) {
			throw new WikifunctionCallException(
				'apierror-abstractwiki_run_fragment-unknown-error',
				HttpStatus::INTERNAL_SERVER_ERROR
			);
		}

		// Give phan some assistance on what we expect the envelope to look like
		'@phan-var object{Z22K1:array<string,string|array>,Z22K2:array<string,string|array>} $responseEnvelope';

		$htmlFragment = $responseEnvelope->{ ZTypeRegistry::Z_RESPONSEENVELOPE_VALUE };

		// If the response value is Void, there is an error in the metadata.
		// We can capture it and show some stuff.
		if ( $htmlFragment === ZTypeRegistry::Z_VOID ) {
			$metadata = $responseEnvelope->{ ZTypeRegistry::Z_RESPONSEENVELOPE_METADATA };
			$zerror = ZObjectUtils::getErrorsFromMetadata( $metadata );

			throw new WikifunctionCallException(
				'apierror-abstractwiki_run_fragment-returned-zerror',
				HttpStatus::BAD_REQUEST,
				$zerror
			);
		}

		// We make sure that the result is a Z89/HTML fragment.
		// If not the case, the fragment is probably wrong, so return 400:
		if ( !is_object( $htmlFragment ) || !property_exists( $htmlFragment, ZTypeRegistry::Z_HTML_FRAGMENT_VALUE ) ) {
			throw new WikifunctionCallException(
				'apierror-abstractwiki_run_fragment-bad-response',
				HttpStatus::BAD_REQUEST
			);
		}

		return (array)$htmlFragment;
	}
}
