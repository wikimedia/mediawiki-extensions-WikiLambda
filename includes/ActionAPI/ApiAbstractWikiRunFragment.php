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
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiRequest;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiRequestException;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\Jobs\CacheAbstractContentFragmentJob;
use MediaWiki\Extension\WikiLambda\ParserFunction\WikifunctionsPFragmentSanitiserTokenHandler;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\JobQueue\JobQueueGroup;
use MediaWiki\Logger\LoggerFactory;
use Psr\Log\LoggerInterface;
use Wikimedia\ObjectCache\BagOStuff;
use Wikimedia\ParamValidator\ParamValidator;

class ApiAbstractWikiRunFragment extends ApiBase {

	public const ABSTRACT_FRAGMENT_CACHE_KEY_PREFIX = 'WikiLambdaAbstractFragment';

	private JobQueueGroup $jobQueueGroup;
	private AbstractWikiRequest $abstractWikiRequest;
	private BagOStuff $objectCache;
	private LoggerInterface $logger;

	public function __construct(
		ApiMain $mainModule,
		string $moduleName,
		JobQueueGroup $jobQueueGroup,
		AbstractWikiRequest $abstractWikiRequest
	) {
		parent::__construct( $mainModule, $moduleName, 'abstractwiki_run_fragment_' );

		$this->jobQueueGroup = $jobQueueGroup;
		$this->abstractWikiRequest = $abstractWikiRequest;

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

		try {
			$htmlFragment = $this->getLatestFragmentAndRevalidate( $fragment, $qid, $language, $date );
		} catch ( AbstractWikiRequestException $e ) {
			$this->dieWithError( [ $e->getErrorMessageKey() ], null, null, $e->getHttpStatusCode() );
		}

		// Everything went well: build response
		$result = [
			'success' => true,
			'data' => $htmlFragment
		];

		$pageResult = $this->getResult();
		$pageResult->addValue( [], $this->getModuleName(), $result );
	}

	/**
	 * Gets the latest available HTML fragment rendered from the given
	 * Abstract Content fragment and its arguments.
	 *
	 * Implements Stale-While-Revalidate caching strategy:
	 * * Returns cached HTML fragment for today,
	 * * If not available, returns cached stale HTML fragment, asynchronously
	 *   revalidates and refreshes the cache (fresh and stale) with the new value.
	 * * If cache doesn't even have a stale fragment, syncrhonously renders
	 *   and returns the sanitized fragment.
	 *
	 * @param array $fragment
	 * @param string $qid
	 * @param string $language
	 * @param string $date
	 * @return string
	 * @throws AbstractWikiRequestException
	 */
	private function getLatestFragmentAndRevalidate(
		array $fragment,
		string $qid,
		string $language,
		string $date
	): string {
		// 1. Check in the cache for a fresh fragment
		$cacheKeyFresh = $this->objectCache->makeKey(
			self::ABSTRACT_FRAGMENT_CACHE_KEY_PREFIX,
			$qid,
			$language,
			$date,
			AbstractContentUtils::makeCacheKeyForAbstractFragment( $fragment )
		);

		$freshValue = $this->objectCache->get( $cacheKeyFresh );

		// Fresh fragment is cached: return value
		if ( $freshValue !== false ) {
			return $freshValue;
		}

		// Build function call for the input fragment and arguments.
		// At this point we know we are running the call for today's value.
		$functionCall = $this->buildFragmentFunctionCall( $fragment, $qid, $language, $date );

		// 2. Check in the cache for a stale fragment (cache key without date)
		$cacheKeyStale = $this->objectCache->makeKey(
			self::ABSTRACT_FRAGMENT_CACHE_KEY_PREFIX,
			$qid,
			$language,
			AbstractContentUtils::makeCacheKeyForAbstractFragment( $fragment )
		);

		$staleValue = $this->objectCache->get( $cacheKeyStale );

		// Stale fragment is cached: trigger async refresh job and return latest value
		if ( $staleValue !== false ) {
			$revalidateFragmentJob = new CacheAbstractContentFragmentJob( [
				'qid' => $qid,
				'language' => $language,
				'date' => $date,
				'functionCall' => $functionCall,
				'cacheKeyFresh' => $cacheKeyFresh,
				'cacheKeyStale' => $cacheKeyStale
			] );
			$this->jobQueueGroup->lazyPush( $revalidateFragmentJob );
			return $staleValue;
		}

		// 3. Nothing is cached: We regenerate the fragment synchronously

		// Run fragment function call:
		// * should return a Z89/Html fragment object
		// * can throw AbstractWikiRequestException, which are handled by self::execute()
		$htmlFragment = $this->abstractWikiRequest->renderFragment( $functionCall );

		// Sanitize the Z89K1/Html fragment value
		$sanitizedHtml = WikifunctionsPFragmentSanitiserTokenHandler::sanitiseHtmlFragment(
			$this->logger,
			$htmlFragment[ ZTypeRegistry::Z_HTML_FRAGMENT_VALUE ]
		);

		// Cache the response with both the fresh and the stale keys
		$this->abstractWikiRequest->cacheFreshAndStale( $sanitizedHtml, $cacheKeyFresh, $cacheKeyStale );

		return $sanitizedHtml;
	}

	/**
	 * Builds function call to virtual function Z825/Run Abstract Fragment
	 *
	 * @param array $fragment
	 * @param string $qid
	 * @param string $language
	 * @param string $date
	 * @return array
	 */
	private function buildFragmentFunctionCall( array $fragment, string $qid, string $language, string $date ): array {
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
	 * Gets the function definition for Z825/Run Abstract Fragment from
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
