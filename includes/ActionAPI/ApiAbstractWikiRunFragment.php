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
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiRequest;
use MediaWiki\Extension\WikiLambda\AWStorage\AWFragmentStore;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\Language\WikifunctionsLanguage;
use MediaWiki\Extension\WikiLambda\Language\WikifunctionsLanguageFactory;
use MediaWiki\Extension\WikiLambda\WikifunctionCallException;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Logger\LoggerFactory;
use Psr\Log\LoggerInterface;
use Wikimedia\ParamValidator\ParamValidator;

class ApiAbstractWikiRunFragment extends ApiBase {

	private LoggerInterface $logger;

	public function __construct(
		ApiMain $mainModule,
		string $moduleName,
		private readonly WikifunctionsLanguageFactory $wfLanguageFactory,
		private readonly AWFragmentStore $fragmentStore,
		private readonly AbstractWikiRequest $abstractWikiRequest
	) {
		parent::__construct( $mainModule, $moduleName, 'abstractwiki_run_fragment_' );
		// Non-injected items
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaAbstract' );
	}

	/**
	 * Gets the latest available HTML fragment rendered from the given
	 * Abstract Content fragment and its arguments.
	 *
	 * Implements Stale-While-Revalidate caching strategy:
	 * * Returns cached HTML fragment for today,
	 * * If fresh fragment is not available in the cache, it queues
	 *   a job to regenerate the fragment with today's date and returns
	 *   whatever is available.
	 *
	 * Implements synchronous or asynchronous behavior depending on the
	 * async flag:
	 * * If called with async=true, the request is expected to respond
	 *   immediately with whatever it has available in the cache. In the
	 *   case that there is no stale content, it returns a pending response
	 *   while the job to regenerate the value is queued.
	 * * If called with async=false, the request is expected to respond
	 *   with the rendered value. In the case in which there is no fresh
	 *   nor stale values cached, it will perform a synchronous call to
	 *   wikifunctions_function_call and wait for its response.
	 *
	 * A successful response will contain a 'success' flag set to true,
	 * and the sanitized rendered fragment as 'value':
	 * [
	 *   'success' => true,
	 *   'value' => '<em>sanitized fragment</em>'
	 * ]
	 *
	 * A pending response will contain a 'success' flag set to true,
	 * and a 'pending' flag, also set to true:
	 * [
	 *   'success' => true,
	 *   'pending' => true
	 * ]
	 *
	 * A failed response will contain a 'success' flag set to false,
	 * the error information under the 'value' key:
	 * [
	 *   'success' => false,
	 *   'value' => [
	 *     'httpStatus' => 400,
	 *     'code' => 'wikilambda-zerror',
	 *     'data' => [
	 *        'msg' => 'some-error-message',
	 *        'params' => [],
	 *        'zerror' => [ ... ],
	 *        'zerrorType' => 'Z500'
	 *     ]
	 *   ]
	 * ]
	 *
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
		$languageZid = $params[ 'language' ];
		$fragmentStr = $params[ 'fragment' ];
		$async = filter_var( $params[ 'async' ], FILTER_VALIDATE_BOOLEAN );

		// Check fragment validity
		$fragment = json_decode( $fragmentStr, true );
		if ( $fragment === null || !is_array( $fragment ) ) {
			$this->dieWithError(
				[ 'apierror-abstractwiki_run_fragment-bad-fragment' ],
				null, null, HttpStatus::BAD_REQUEST
			);
		}

		$language = $this->wfLanguageFactory->getLanguageFromZid( $languageZid );

		$result = $this->getLatestFragmentAndRevalidate( $fragment, $qid, $language, $date, $async );

		// Build WikifunctionCallException from the serialized cached error
		// for convenience when building and throwing ApiUsageException:
		if ( $result[ 'success' ] === false ) {
			$e = WikifunctionCallException::fromArray( $result[ 'value' ] );
			$errorData = [
				'msg' => $e->getMessageKey(),
				'zerror' => $e->getZError(),
				'zerrorType' => $e->getZErrorType()
			];

			$this->dieWithError(
				/* message */ $e->getMessageObject(),
				/* code */ $e->getErrorCode(),
				/* data */ $errorData,
				/* status */ $e->getHttpStatusCode()
			);
		}

		// Set successful responses (pending or finalized):
		$pageResult = $this->getResult();
		$pageResult->addValue( [], $this->getModuleName(), $result );
	}

	/**
	 * Fetch the AWFragment from AWFragmentStore, and return it if available.
	 * If missing, return pending fragment if called with async=true, or
	 * make a synchronous call to render and sanitize the fragment and
	 * return whatever results of that call.
	 *
	 * @param array $fragment
	 * @param string $qid
	 * @param WikifunctionsLanguage $language
	 * @param string $date
	 * @param bool $async
	 * @return array
	 */
	private function getLatestFragmentAndRevalidate(
		array $fragment,
		string $qid,
		WikifunctionsLanguage $language,
		string $date,
		bool $async
	): array {
		// Get stored fragment (if any)
		$awFragment = $this->fragmentStore->getRenderedAWFragment(
			$fragment,
			$qid,
			$language,
			$date,
		);

		// Stale or fresh, return the payload and be done
		if ( !$awFragment->isMissing() ) {
			return $awFragment->getValue();
		}

		// Missing fragment:
		// if async=true, return pending value
		if ( $async ) {
			return [
				'success' => true,
				'pending' => true
			];
		}

		// else, synchronously run and return value
		return $this->abstractWikiRequest->fetchRenderedAWFragment(
			$fragment,
			$qid,
			$language->getZid(),
			$date,
			$awFragment->getKey()
		);
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
			],
			'async' => [
				ParamValidator::PARAM_TYPE => 'boolean',
				ParamValidator::PARAM_REQUIRED => false,
				ParamValidator::PARAM_DEFAULT => false
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
