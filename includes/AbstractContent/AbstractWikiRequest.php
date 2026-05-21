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
use MediaWiki\Extension\WikiLambda\ParserFunction\WikifunctionsPFragmentRenderer;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikifunctionCallException;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\Logger\LoggerFactory;
use Psr\Log\LoggerInterface;
use RuntimeException;

class AbstractWikiRequest {

	private LoggerInterface $logger;

	public function __construct(
		private readonly Config $config,
		private readonly HttpRequestFactory $httpRequestFactory,
		private readonly AWFragmentStore $fragmentStore,
		private readonly WikifunctionsPFragmentRenderer $fragmentRenderer
	) {
		// Non-injected items
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaAbstract' );
	}

	/**
	 * Re-generates an Abstract Wikipedia fragment by requesting it remotely from
	 * Wikifunctions (repo), sanitises it, and stores it in the AWFragmentStore.
	 *
	 * Returns an associative array containing the cached value, either a
	 * successfully rendered and sanitised fragment, or a failed one.
	 *
	 * Callers:
	 * * Jobs/CacheAbstractContentFragmentJob
	 * * ActionAPIs/ApiAbstractWikiRunFragment
	 *
	 * @param array $fragment
	 * @param string $topicQid
	 * @param string $languageZid
	 * @param string $date
	 * @param string $fragmentKey
	 * @return array
	 */
	public function fetchRenderedAWFragment(
		array $fragment,
		string $topicQid,
		string $languageZid,
		string $date,
		string $fragmentKey
	): array {
		$renderedValue = [];

		// 1. Build the Z825 function call with the fragment as composition implementation
		$functionCall = $this->buildRenderAWFragmentCall(
			$fragment,
			$topicQid,
			$languageZid,
			$date
		);

		try {
			// 2. Run fragment function call, should return a Z89/Html fragment object
			$htmlFragment = $this->callRenderFunctionCall( $functionCall );

			// 2.1. If successful, render the Z89K1/Html fragment value
			$sanitizedHtml = $this->fragmentRenderer->render(
				$htmlFragment[ ZTypeRegistry::Z_HTML_FRAGMENT_VALUE ]
			);

			// ... and prepare rendered and sanitized response to be stored
			$renderedValue[ 'success' ] = true;
			$renderedValue[ 'value' ] = $sanitizedHtml;

		} catch ( WikifunctionCallException $e ) {
			// 2.2. If failure, log and prepare the error payload to be stored
			$renderedValue[ 'success' ] = false;
			$renderedValue[ 'value' ] = $e->toArray();

			// First, check if it's a user-triggered error. If so, debug-log with the extra data
			// but don't make noise; use the default TTL for a request.
			if ( $e->getHttpStatusCode() === HttpStatus::BAD_REQUEST ) {
				$logContext = [];
				if ( $e->hasZError() ) {
					$logContext[ 'zerror' ] = $e->getZError();
				}
				$this->logger->debug(
					__METHOD__ . ': AbstractWikiRequest::callRenderFunctionCall failed: {error}',
					[
						'error' => $e->getMessage(),
						'fragmentKey' => $fragmentKey
					] + $logContext
				);
			} else {
				// Possible error cases that are "our fault" and should be logged noisily:
				// - HttpStatus::NOT_IMPLEMENTED (server not configured)
				// - HttpStatus::INTERNAL_SERVER_ERROR
				// Possible error cases that might be load issues, but log anyway for now:
				// - HttpStatus::SERVICE_UNAVAILABLE
				// - HttpStatus::FORBIDDEN
				// - HttpStatus::TOO_MANY_REQUESTS (not currently emitted below)
				if (
					$e->getHttpStatusCode() === HttpStatus::NOT_IMPLEMENTED ||
					$e->getHttpStatusCode() === HttpStatus::INTERNAL_SERVER_ERROR ||
					$e->getHttpStatusCode() === HttpStatus::SERVICE_UNAVAILABLE ||
					$e->getHttpStatusCode() === HttpStatus::FORBIDDEN ||
					$e->getHttpStatusCode() === HttpStatus::TOO_MANY_REQUESTS
				) {
					$this->logger->warning(
						__METHOD__ . ': AbstractWikiRequest::callRenderFunctionCall got a server issue: {error}',
						[
							'error' => $e->getMessage(),
							'exception' => $e,
							'fragmentKey' => $fragmentKey,
						]
					);
				} else {
					// Something's gone wrong as an unpected error state, log as an error:
					$this->logger->error(
						__METHOD__ . ': AbstractWikiRequest::callRenderFunctionCall got unhandled error: {error}',
						[
							'error' => $e->getMessage(),
							'exception' => $e,
							'fragmentKey' => $fragmentKey,
						]
					);
				}
			}
		}

		// 4. Set the fragment in the AWFragmentStore
		$this->fragmentStore->setRenderedAWFragment(
			$topicQid,
			$languageZid,
			$date,
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
	 * @param string $date
	 * @return array
	 */
	private function buildRenderAWFragmentCall(
		array $fragment,
		string $qid,
		string $language,
		string $date
	): array {
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
	 * @param array $functionCall
	 * @return array HTML fragment (Z89) response object
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
				$zerror,
				[ $zerror->{'Z5K1'} ?? 'No error code provided' ]
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

		return (array)$htmlFragment;
	}
}
