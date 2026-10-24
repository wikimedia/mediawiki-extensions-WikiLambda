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

use JsonException;
use MediaWiki\Config\Config;
use MediaWiki\Extension\WikiLambda\AWStorage\AWFragmentStore;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\OrchestratorRequest;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\Renderer\WikifunctionsFragmentRenderer;
use MediaWiki\Extension\WikiLambda\WikifunctionCallException;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\Logger\LoggerFactory;
use Psr\Log\LoggerInterface;
use RuntimeException;
use stdClass;
use Wikimedia\Stats\StatsFactory;
use Wikimedia\Timestamp\ConvertibleTimestamp;

class AbstractWikiRequest {

	/**
	 * HTTP status codes that we log at warning level when a fragment fails to render.
	 *
	 * These do not have one cause. Some are our fault, e.g. NOT_IMPLEMENTED, when the wiki has
	 * no configuration for a target API. Some are permission problems, e.g. UNAUTHORIZED and
	 * FORBIDDEN. Some can be load problems, e.g. REQUEST_TIMEOUT. We log most of them noisily
	 * for now, until we know how frequently each one occurs in production.
	 *
	 * Failures caused by the content are in HttpStatus::CONTENT_ERROR_CODES, and we log those
	 * quietly. TOO_MANY_REQUESTS is an expected result of the rate limits, and we log it quietly
	 * too. A code in none of these is one that we did not expect, and we log it as an error.
	 */
	private const WARNING_STATUS_CODES = [
		// e.g. Z559/User not permitted to evaluate function
		HttpStatus::UNAUTHORIZED,
		// e.g. Wikifunctions refused our request
		HttpStatus::FORBIDDEN,
		// e.g. Z574/Orchestrator time limit
		HttpStatus::REQUEST_TIMEOUT,
		// e.g. Z530/API failure
		HttpStatus::INTERNAL_SERVER_ERROR,
		// e.g. this wiki has no Wikifunctions target API
		HttpStatus::NOT_IMPLEMENTED,
		// e.g. Z577/Invalid orchestrator result
		HttpStatus::BAD_GATEWAY,
		// e.g. we cannot reach Wikifunctions
		HttpStatus::SERVICE_UNAVAILABLE,
		// e.g. Z576/Evaluator WASM limit
		HttpStatus::GATEWAY_TIMEOUT,
	];

	/**
	 * Response metadata keys that tell editors how fresh a rendered fragment is:
	 * * functionCallCachedOn: when Wikifunctions cached the result, if it came from its cache
	 * * functionCallFreshResult: when the result was made, if it used no cached Wikidata entities
	 * * cachedWikidataEntities: the Wikidata entities that the orchestrator took from its cache
	 */
	private const FRESHNESS_METADATA_KEYS = [
		'functionCallCachedOn',
		'functionCallFreshResult',
		'cachedWikidataEntities',
	];

	private LoggerInterface $logger;
	private StatsFactory $statsFactory;

	public function __construct(
		private readonly Config $config,
		private readonly HttpRequestFactory $httpRequestFactory,
		private readonly AWFragmentStore $fragmentStore,
		private readonly WikifunctionsFragmentRenderer $fragmentRenderer,
		StatsFactory $statsFactory
	) {
		// Non-injected items
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaAbstract' );
		$this->statsFactory = $statsFactory->withComponent( 'WikiLambda' );
	}

	/**
	 * Re-generates an Abstract Wikipedia fragment by requesting it remotely from
	 * Wikifunctions (repo), sanitises it, and stores it in the AWFragmentStore.
	 *
	 * Returns an associative array containing the cached value, either a
	 * successfully rendered and sanitised fragment, or a failed one.
	 *
	 * A render that Wikifunctions answered, successfully or with an error, also
	 * stores, under 'metadata', the freshness metadata that Wikifunctions returned
	 * with it (see FRESHNESS_METADATA_KEYS), when there is any. A failure before
	 * Wikifunctions answered (e.g. it could not be reached) has none. Every render,
	 * successful or not, has its render date and time under
	 * 'renderDate', so that the value returned here is the same as the one that a
	 * later read from the AWFragmentStore returns. (T441561)
	 *
	 * Callers:
	 * * Jobs/CacheAbstractContentFragmentJob
	 * * ActionAPIs/ApiAbstractWikiRunFragment
	 *
	 * @param array $fragment
	 * @param string $topicQid
	 * @param string $languageZid
	 * @param string $datetime
	 * @param string $fragmentKey
	 * @return array
	 */
	public function fetchRenderedAWFragment(
		array $fragment,
		string $topicQid,
		string $languageZid,
		string $datetime,
		string $fragmentKey
	): array {
		$renderedValue = [];

		// 1. Build the Z825 function call with the fragment as composition implementation
		$functionCall = $this->buildRenderAWFragmentCall(
			$fragment,
			$topicQid,
			$languageZid,
			$datetime
		);

		try {
			// 2. Run fragment function call, should return a Z89/Html fragment object
			$response = $this->callRenderFunctionCall( $functionCall );
			$htmlFragment = $response[ 'htmlFragment' ];

			// 2.1. If successful, render the Z89K1/Html fragment value
			$sanitizedHtml = $this->fragmentRenderer->render(
				$htmlFragment[ ZTypeRegistry::Z_HTML_FRAGMENT_VALUE ],
				[
					'qid' => $topicQid,
					'language' => $languageZid,
					'fragmentKey' => $fragmentKey,
				]
			);

			// ... and prepare rendered and sanitized response to be stored
			$renderedValue[ 'success' ] = true;
			$renderedValue[ 'value' ] = $sanitizedHtml;

			// ... with its freshness metadata, if any (T441561)
			if ( $response[ 'metadata' ] ) {
				$renderedValue[ 'metadata' ] = $response[ 'metadata' ];
			}

		} catch ( WikifunctionCallException $e ) {
			// 2.2. If failure, log and prepare the error payload to be stored
			$renderedValue[ 'success' ] = false;
			$renderedValue[ 'value' ] = $e->toArray();

			// ... with the freshness metadata of the failed response, if any (T441561)
			if ( $e->getFreshnessMetadata() ) {
				$renderedValue[ 'metadata' ] = $e->getFreshnessMetadata();
			}

			$httpStatusCode = $e->getHttpStatusCode();

			if ( in_array( $httpStatusCode, HttpStatus::CONTENT_ERROR_CODES, true ) ) {
				// The content caused the error, and an editor must correct it. Log it with the
				// extra data, but do not make noise.
				$logContext = [];
				if ( $e->hasZError() ) {
					$logContext[ 'zerror' ] = $e->getZError();
				}
				$this->logger->info(
					__METHOD__ . ': AbstractWikiRequest::callRenderFunctionCall failed with a user error: {error}',
					[
						'error' => $e->getMessage(),
						'fragmentKey' => $fragmentKey,
						'httpStatusCode' => (string)$httpStatusCode,
					] + $logContext
				);
			} elseif ( $httpStatusCode === HttpStatus::TOO_MANY_REQUESTS ) {
				// e.g. Z570/Orchestrator rate limit, or the Wikifunctions API limits. The job
				// tries again later, so log it without the trace.
				$this->logger->info(
					__METHOD__ . ': AbstractWikiRequest::callRenderFunctionCall was rate limited: {error}',
					[
						'error' => $e->getMessage(),
						'fragmentKey' => $fragmentKey,
						'httpStatusCode' => (string)$httpStatusCode,
					]
				);
			} elseif ( in_array( $httpStatusCode, self::WARNING_STATUS_CODES, true ) ) {
				$this->logger->warning(
					__METHOD__ . ': AbstractWikiRequest::callRenderFunctionCall got a server issue: {error}',
					[
						'error' => $e->getMessage(),
						'exception' => $e,
						'fragmentKey' => $fragmentKey,
						'httpStatusCode' => (string)$httpStatusCode,
					]
				);
			} else {
				// We do not know this status code, so we cannot tell who caused the failure.
				// Log it as an error, so that we can find it and add it to a list above.
				$this->logger->error(
					__METHOD__ . ': AbstractWikiRequest::callRenderFunctionCall got unhandled error: {error}',
					[
						'error' => $e->getMessage(),
						'exception' => $e,
						'fragmentKey' => $fragmentKey,
						'httpStatusCode' => (string)$httpStatusCode,
					]
				);
			}
		}

		// 3. Add the render date. The store adds it to the value that it stores, but
		// not to this one, which callers such as ApiAbstractWikiRunFragment return.
		$renderedValue[ 'renderDate' ] = $datetime;

		// 4. Set the fragment in the AWFragmentStore
		$this->fragmentStore->setRenderedAWFragment(
			$topicQid,
			$languageZid,
			$datetime,
			$fragmentKey,
			$renderedValue
		);

		return $renderedValue;
	}

	/**
	 * Utility function to build a function call to the virtual function
	 * Z825/Run Abstract Fragment, using the fragment as an implementation and
	 * the args Qid, Language and Date as values for Z825K1, Z825K2 and Z825K3.
	 *
	 * Gets the data definition of the virtual function from function-schemata
	 * data/definitions/Z825.json file, as this will be present in the Abstract
	 * Repo environment (and any other)
	 *
	 * Returns the function call, or false if it could not be created
	 *
	 * @param array $fragment
	 * @param string $qid
	 * @param string $language
	 * @param string $datetime
	 * @return array
	 */
	private function buildRenderAWFragmentCall(
		array $fragment,
		string $qid,
		string $language,
		string $datetime
	): array {
		// Transform datetime ('YmdHis') into the date format needed by the cache key
		$date = ( new ConvertibleTimestamp( $datetime ) )->format( 'Y-m-d' );

		// We get the function definition from schemata because:
		// * it will be available in the Abstract repo
		// * we don't need the user-contributed labels
		// * we can avoid making a remote fetch from wikifunctions
		$function = $this->getRenderAWFragmentFunction();

		// Set function's only implementation as fragment to execute:
		$function[ ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS ] = [
			ZTypeRegistry::Z_IMPLEMENTATION,
			[
				ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_IMPLEMENTATION,
				ZTypeRegistry::Z_IMPLEMENTATION_FUNCTION => ZTypeRegistry::Z_RUN_ABSTRACT_FRAGMENT,
				ZTypeRegistry::Z_IMPLEMENTATION_COMPOSITION => $fragment
			]
		];

		// Build argument: Wikidata reference object from qid
		$wikidataReference = [
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_WIKIDATA_REFERENCE_ITEM,
			ZTypeRegistry::Z_WIKIDATA_REFERENCE_ITEM_ID => $qid
		];

		// Build argument: Date parser function call from date string and language
		$dateParser = [
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_FUNCTIONCALL,
			ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION => ZTypeRegistry::Z_DATE_PARSER,
			ZTypeRegistry::Z_DATE_PARSER_STRING => $date,
			ZTypeRegistry::Z_DATE_PARSER_LANGUAGE => $language
		];

		// Build function call to literal function:
		$functionCall = [
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_FUNCTIONCALL,
			ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION => $function,
			ZTypeRegistry::Z_RUN_ABSTRACT_FRAGMENT_QID => $wikidataReference,
			ZTypeRegistry::Z_RUN_ABSTRACT_FRAGMENT_LANGUAGE => $language,
			ZTypeRegistry::Z_RUN_ABSTRACT_FRAGMENT_DATE => $dateParser
		];

		return $functionCall;
	}

	/**
	 * Utility function to get the function definition for Z825/Render Abstract
	 * Fragment from the function schemata data definitions directory.
	 *
	 * @return array
	 * @throws RuntimeException
	 */
	private function getRenderAWFragmentFunction(): array {
		$functionPath = dirname( __DIR__ ) . '/../function-schemata/data/definitions/';
		$functionFile = ZTypeRegistry::Z_RUN_ABSTRACT_FRAGMENT . '.json';

		$functionDefinitionStr = file_get_contents( $functionPath . $functionFile );
		$functionDefinition = json_decode( $functionDefinitionStr, true );
		if ( !is_array( $functionDefinition ) ) {
			// If the file was not found, or decoding it was not possible:
			throw new RuntimeException( "Failed to load function-schemata definition for Z825" );
		}

		return $functionDefinition[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ];
	}

	/**
	 * Performs remote call to Wikifunctions' wikilambda_function_call Action API
	 *
	 * Returns an array with the keys:
	 * * 'htmlFragment': the HTML fragment (Z89) response object, as an array
	 * * 'metadata': the freshness metadata of the response; see getFreshnessMetadata()
	 *
	 * @param array $functionCall
	 * @return array{htmlFragment:array,metadata:array}
	 * @throws WikifunctionCallException
	 */
	public function callRenderFunctionCall( array $functionCall ): array {
		// Base API URL from config
		$targetUrl = $this->config->get( 'WikiLambdaClientTargetAPI' );
		if ( !$targetUrl ) {
			// Missing configuration
			throw new WikifunctionCallException(
				'apierror-abstractwiki_run_fragment-not-enabled',
				HttpStatus::NOT_IMPLEMENTED
			);
		}
		// The action must be present in the URL query string (not just the POST body)
		// so it shows up in HTTP-layer logs on the remote wiki.
		$apiUrl = $targetUrl . '/w/api.php?action=wikilambda_function_call';

		try {
			// Stringify the function call
			$functionCallEncoded = json_encode( $functionCall, JSON_THROW_ON_ERROR );
		} catch ( JsonException ) {
			// Missing or corrupt schemata files means bad configuration
			throw new WikifunctionCallException(
				'apierror-abstractwiki_run_fragment-not-enabled',
				HttpStatus::NOT_IMPLEMENTED
			);
		}

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

		// Set request origin header
		$request->setHeader( 'X-WikiLambda-Request-Origin', OrchestratorRequest::AW_FRAGMENT_ORIGIN_HEADER );

		// How long does the orchestrator take to respond per fragment?
		// Grafana: mediawiki.WikiLambda.aw_orchestrator_call_seconds{}
		$orchestratorCallStart = microtime( true );
		$status = $request->execute();
		$this->statsFactory->getTiming( 'aw_orchestrator_call_seconds' )
			->observeSeconds( microtime( true ) - $orchestratorCallStart );
		$apiHttpStatusCode = $request->getStatus();

		// HTTP 503
		// Transport level error; Wikifunctions could not be reached.
		if ( !$status->isOK() && $apiHttpStatusCode === 0 ) {
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
			// For 503 and 429, currently unavailable, try again later. Keep the code, so that
			// we can tell a rate limit from an outage.
			if (
				$apiHttpStatusCode === HttpStatus::SERVICE_UNAVAILABLE ||
				$apiHttpStatusCode === HttpStatus::TOO_MANY_REQUESTS
			) {
				throw new WikifunctionCallException(
					'apierror-abstractwiki_run_fragment-service-unavailable',
					$apiHttpStatusCode
				);
			}

			// For 403, permissions error, return forbidden:
			if ( $apiHttpStatusCode === HttpStatus::FORBIDDEN ) {
				throw new WikifunctionCallException(
					'apierror-abstractwiki_run_fragment-forbidden',
					HttpStatus::FORBIDDEN
				);
			}

			// For 400, either wrong JSON or wrong ZObject type, return bad request:
			if ( $apiHttpStatusCode === HttpStatus::BAD_REQUEST ) {
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

		// How long did the orchestrator itself spend evaluating, excluding network time?
		// Grafana: mediawiki.WikiLambda.aw_orchestration_duration_seconds{}
		$orchestrationDuration = ZObjectUtils::getMetaDataValue( $responseEnvelope, 'orchestrationDuration' );
		if ( $orchestrationDuration !== null ) {
			$this->statsFactory->getTiming( 'aw_orchestration_duration_seconds' )
				->observe( floatval( $orchestrationDuration ) );
		}

		$htmlFragment = $responseEnvelope->{ ZTypeRegistry::Z_RESPONSEENVELOPE_VALUE };

		// If the response value is Void, there is an error in the response metadata.
		// We can capture it and show some stuff.
		if ( $htmlFragment === ZTypeRegistry::Z_VOID ) {
			$zerror = ZObjectUtils::getMetaDataValue( $responseEnvelope, 'errors' );
			// (T432333) Surface http status code assigned and returned by the orchestrator
			// This http status code maps with the inner zerror zid according to the mappings
			// in `function-schemata/test_data/errors/http_status_mappings.yaml`
			$orchestratorHttpStatusCode = $responseData['wikilambda_function_call']['orchestratorHttpStatusCode'] ??
				HttpStatus::BAD_REQUEST;
			throw new WikifunctionCallException(
				'apierror-abstractwiki_run_fragment-returned-zerror',
				$orchestratorHttpStatusCode,
				$zerror,
				[ $zerror->{'Z5K1'} ?? 'No error code provided' ],
				// A failed response says how fresh it is too, e.g. that it used a
				// cached Wikidata entity, which may be why it failed (T441561)
				self::getFreshnessMetadata( $responseEnvelope )
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

		// The orchestrator may emit Z89K1 in canonical form ("foo") or normal form
		// ({ Z1K1: "Z6", Z6K1: "foo" }); canonicalise so downstream always sees a string (T426297).
		$htmlFragment->{ ZTypeRegistry::Z_HTML_FRAGMENT_VALUE } = ZObjectUtils::canonicalize(
			$htmlFragment->{ ZTypeRegistry::Z_HTML_FRAGMENT_VALUE }
		);

		if ( !is_string( $htmlFragment->{ ZTypeRegistry::Z_HTML_FRAGMENT_VALUE } ) ) {
			throw new WikifunctionCallException(
				'apierror-abstractwiki_run_fragment-bad-response',
				HttpStatus::BAD_REQUEST
			);
		}

		return [
			'htmlFragment' => (array)$htmlFragment,
			'metadata' => self::getFreshnessMetadata( $responseEnvelope ),
		];
	}

	/**
	 * Picks the freshness metadata out of a Z22/Response envelope's metadata map,
	 * so that it can be stored with the rendered fragment and shown to editors. (T441561)
	 *
	 * Values are canonicalised, and kept only when they have the expected shape:
	 * * 'functionCallCachedOn' and 'functionCallFreshResult': ISO 8601 timestamp strings
	 * * 'cachedWikidataEntities': a canonical typed list of strings, e.g.
	 *   [ 'Z6', 'Q42', 'L1-F2' ], the same form used by Wikifunctions UI code.
	 *
	 * E.g.: [
	 *   'functionCallFreshResult' => '2026-10-23T10:00:00Z',
	 *   'cachedWikidataEntities' => [ 'Z6', 'Q42' ]
	 * ]
	 *
	 * @param stdClass $responseEnvelope
	 * @return array<string,string|string[]> Empty if the response has no freshness metadata
	 */
	private static function getFreshnessMetadata( stdClass $responseEnvelope ): array {
		$freshnessMetadata = [];
		foreach ( self::FRESHNESS_METADATA_KEYS as $key ) {
			$value = ZObjectUtils::getMetaDataValue( $responseEnvelope, $key );
			if ( $value === null ) {
				continue;
			}
			// Should already be canonical, but canonicalize to be sure: the orchestrator builds these values
			// in normal form, and other values of this response have arrived in normal form (T426297).
			$value = ZObjectUtils::canonicalize( $value );

			$isWellFormed = $key === 'cachedWikidataEntities'
				? ( is_array( $value ) && array_is_list( $value )
					&& count( array_filter( $value, 'is_string' ) ) === count( $value ) )
				: is_string( $value );

			// Malformed metadata is not worth failing the render for; leave it out.
			if ( $isWellFormed ) {
				$freshnessMetadata[ $key ] = $value;
			}
		}
		return $freshnessMetadata;
	}
}
