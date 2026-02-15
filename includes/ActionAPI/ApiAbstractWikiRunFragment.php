<?php
/**
 * WikiLambda Abstract Wiki run fragment API
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ActionAPI;

use MediaWiki\Api\ApiBase;
use MediaWiki\Api\ApiMain;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentUtils;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\ParserFunction\WikifunctionsPFragmentSanitiserTokenHandler;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\Logger\LoggerFactory;
use Psr\Log\LoggerInterface;
use Wikimedia\ObjectCache\BagOStuff;
use Wikimedia\ParamValidator\ParamValidator;

class ApiAbstractWikiRunFragment extends ApiBase {

	public const ABSTRACT_FRAGMENT_CACHE_KEY_PREFIX = 'WikiLambdaAbstractFragment';

	private HttpRequestFactory $httpRequestFactory;
	private BagOStuff $objectCache;
	private LoggerInterface $logger;

	public function __construct(
		ApiMain $mainModule,
		string $moduleName,
		HttpRequestFactory $httpRequestFactory
	) {
		parent::__construct( $mainModule, $moduleName, 'abstractwiki_run_fragment_' );
		$this->httpRequestFactory = $httpRequestFactory;
		$this->objectCache = WikiLambdaServices::getZObjectStash();
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaAbstract' );
	}

	/**
	 * @see ApiBase::execute()
	 * @inheritDoc
	 */
	public function execute() {
		// Abstract Wiki not enabled: exit with HTTP 501
		if ( !$this->getConfig()->get( 'WikiLambdaEnableAbstractMode' ) ) {
			$this->dieWithError(
				[ 'apierror-abstractwiki_run_fragment-not-enabled' ],
				null, null, HttpStatus::NOT_IMPLEMENTED
			);
		}

		// Get input parameters
		$params = $this->extractRequestParams();

		$qid = $params[ 'qid' ];
		$date = $params[ 'date' ];
		$language = $params[ 'language' ];
		$fragmentStr = $params[ 'fragment' ];

		// Check fragment validity
		$fragment = json_decode( $fragmentStr, true );
		if ( $fragment === null || !is_array( $fragment ) ) {
			$this->dieWithError(
				[ 'apierror-abstractwiki_run_fragment-bad-fragment' ],
				null, null, HttpStatus::BAD_REQUEST
			);
		}

		// Build function call for the input fragment and arguments
		$functionCall = $this->buildFragmentFunctionCall( $fragment, $qid, $language, $date );

		$fragmentCacheKey = $this->objectCache->makeKey(
			self::ABSTRACT_FRAGMENT_CACHE_KEY_PREFIX,
			AbstractContentUtils::makeCacheKeyFromZObject( $functionCall )
		);

		$htmlFragment = $this->objectCache->getWithSetCallback(
			$fragmentCacheKey,
			$this->objectCache::TTL_MONTH,
			// If cache miss, run callback
			function () use ( $functionCall ) {
				// Run fragment function call, should return a Z89/Html fragment object
				$htmlFragment = $this->remoteCall( $functionCall );

				// Sanitize the Z89K1/Html fragment value
				$sanitizedHtml = WikifunctionsPFragmentSanitiserTokenHandler::sanitiseHtmlFragment(
					$this->logger,
					$htmlFragment[ ZTypeRegistry::Z_HTML_FRAGMENT_VALUE ]
				);

				// Success! The returned sanitized html fragment will
				// be stored in the cache.
				return $sanitizedHtml;
			}
		);

		// Everything went well: build output object
		$result = [
			'success' => true,
			'data' => $htmlFragment
		];

		$pageResult = $this->getResult();
		$pageResult->addValue( [], $this->getModuleName(), $result );
	}

	/**
	 * Build function call to virtual function Z825/Run Abstract Fragment
	 *
	 * @param array $fragment
	 * @param string $qid
	 * @param string $language
	 * @param string $date
	 * @return array
	 */
	private function buildFragmentFunctionCall( $fragment, $qid, $language, $date ): array {
		// We get the function definition from schemata because:
		// * it will be available in the Abstract repo
		// * we don't need the user-contributed labels
		// * we can avoid making a remote fetch from wikifunctions
		$function = $this->getFunctionDefinition();

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
	 * Perform remote call to Wikifunctions' wikilambda_function_call Action API
	 *
	 * @param array $functionCall
	 * @return array sanitized HTML fragment (Z89) response object
	 */
	private function remoteCall( $functionCall ) {
		// Base API URL from config
		$targetUrl = $this->getConfig()->get( 'WikiLambdaClientTargetAPI' );
		if ( !$targetUrl ) {
			// Missing configuration, abstractwiki-not-implemented error
			$this->dieWithError(
				[ 'apierror-abstractwiki_run_fragment-not-enabled' ],
				null, null, HttpStatus::NOT_IMPLEMENTED
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
			$this->dieWithError(
				[ 'apierror-abstractwiki_run_fragment-bad-response' ],
				null, null, HttpStatus::BAD_REQUEST
			);
		}

		// Decode response
		$responseData = json_decode( $request->getContent(), true );

		if ( !is_array( $responseData ) ) {
			$this->dieWithError(
				[ 'apierror-abstractwiki_run_fragment-bad-response' ],
				null, null, HttpStatus::BAD_REQUEST
			);
		}

		// Give phan some assistance on what we expect the response to look like
		'@phan-var array{wikilambda_function_call?: array{data?: string}} $responseData';

		$responseEnvelopeStr = $responseData[ 'wikilambda_function_call' ][ 'data' ] ?? '';
		$responseEnvelope = json_decode( $responseEnvelopeStr, true );

		if ( !is_array( $responseEnvelope ) ) {
			$this->dieWithError(
				[ 'apierror-abstractwiki_run_fragment-bad-response' ],
				null, null, HttpStatus::BAD_REQUEST
			);
		}

		// Give phan some assistance on what we expect the envelope to look like
		'@phan-var array{Z22K1:array<string,string|array>,Z22K2:array<string,string|array>} $responseEnvelope';

		$htmlFragment = $responseEnvelope[ ZTypeRegistry::Z_RESPONSEENVELOPE_VALUE ];

		// We make sure that the result is a Z89/HTML fragment
		if ( !is_array( $htmlFragment ) || !array_key_exists( ZTypeRegistry::Z_HTML_FRAGMENT_VALUE, $htmlFragment ) ) {
			$this->dieWithError(
				[ 'apierror-abstractwiki_run_fragment-bad-response' ],
				null, null, HttpStatus::BAD_REQUEST
				);
		}

		return $htmlFragment;
	}

	/**
	 * Get the function definition for Z825/Run Abstract Fragment from
	 * the function schemata data definitions directory.
	 *
	 * @return array
	 */
	private function getFunctionDefinition(): array {
		$functionPath = dirname( __DIR__ ) . '/../function-schemata/data/definitions/';
		$functionFile = ZTypeRegistry::Z_RUN_ABSTRACT_FRAGMENT . '.json';
		$functionDefinitionStr = file_get_contents( $functionPath . $functionFile );

		if ( !$functionDefinitionStr ) {
			$this->dieWithError(
				[ 'apierror-abstractwiki_run_fragment-not-enabled' ],
				null, null, HttpStatus::NOT_IMPLEMENTED
			);
		}

		$functionDefinition = json_decode( $functionDefinitionStr, true );
		if ( !is_array( $functionDefinition ) ) {
			$this->dieWithError(
				[ 'apierror-abstractwiki_run_fragment-not-enabled' ],
				null, null, HttpStatus::NOT_IMPLEMENTED
			);
		}

		// @phan-suppress-next-line PhanTypeArraySuspiciousNullable We control this via a static file
		return $functionDefinition[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ];
	}

	/**
	 * @see ApiBase::isInternal()
	 * @inheritDoc
	 */
	public function isInternal() {
		return true;
	}

	/**
	 * @see ApiBase::getAllowedParams()
	 * @inheritDoc
	 * @codeCoverageIgnore
	 */
	protected function getAllowedParams(): array {
		return [
			'qid' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_REQUIRED => true,
			],
			'language' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_REQUIRED => true,
			],
			'date' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_REQUIRED => true,
			],
			'fragment' => [
				ParamValidator::PARAM_TYPE => 'text',
				ParamValidator::PARAM_REQUIRED => true,
			]
		];
	}

	/**
	 * Generates URL-encoded example call to run an abstract fragment
	 *
	 * @param string $qid
	 * @param string $language
	 * @param string $date
	 * @param string $fragmentFile
	 * @return string URL-encoded contents
	 * @codeCoverageIgnore
	 */
	private function buildExampleCallFor( $qid, $language, $date, $fragmentFile ): string {
		$fragment = ZObjectUtils::readTestFile( 'abstract/' . $fragmentFile );
		return 'action=abstractwiki_run_fragment&'
			. 'abstractwiki_run_fragment_qid=' . $qid . '&'
			. 'abstractwiki_run_fragment_language=' . $language . '&'
			. 'abstractwiki_run_fragment_date=' . $date . '&'
			. 'abstractwiki_run_fragment_fragment=' . urlencode( $fragment );
	}

	/**
	 * @see ApiBase::getExamplesMessages()
	 * @return array
	 * @codeCoverageIgnore
	 */
	protected function getExamplesMessages(): array {
		return [
			// Run an Abstract Wiki content fragment that contains a simple literal HTML
			$this->buildExampleCallFor( 'Q319', 'Z1002', '26-7-2023', 'fragment-literal-html.json' )
				=> 'apihelp-abstractwiki_run_fragment-example-literal-html',

			// Run an Abstract Wiki content fragment that contains a composition with arguments
			$this->buildExampleCallFor( 'Q319', 'Z1002', '26-7-2023', 'fragment-with-args.json' )
				=> 'apihelp-abstractwiki_run_fragment-example-composition'
		];
	}
}
