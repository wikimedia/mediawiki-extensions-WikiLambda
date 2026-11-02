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
use MediaWiki\Extension\WikiLambda\AWStorage\AWFragmentStore;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\Language\WikifunctionsLanguage;
use MediaWiki\Extension\WikiLambda\Language\WikifunctionsLanguageFactory;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Permissions\PermissionStatus;
use Wikimedia\ParamValidator\ParamValidator;
use Wikimedia\Timestamp\ConvertibleTimestamp;
use Wikimedia\Timestamp\TimestampFormat as TS;

class ApiAbstractWikiRunFragment extends ApiBase {

	public function __construct(
		ApiMain $mainModule,
		string $moduleName,
		private readonly WikifunctionsLanguageFactory $wfLanguageFactory,
		private readonly AWFragmentStore $fragmentStore,
		private readonly AbstractWikiRequest $abstractWikiRequest
	) {
		parent::__construct( $mainModule, $moduleName, 'abstractwiki_run_fragment_' );
	}

	/**
	 * Gets the latest available HTML fragment rendered from the given
	 * Abstract Content fragment and its arguments.
	 *
	 * Implements Stale-While-Revalidate caching strategy:
	 * * Returns cached HTML fragment for today,
	 * * If fresh fragment is not available in the cache, it queues
	 *   a job to regenerate the fragment for today's date and returns
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
	 * With fresh=true, it instead ignores the async flag and the cache and immediately
	 * performs a synchronous call to wikifunctions_function_call. (T442987)
	 *
	 * A successful fragment will contain a 'success' flag set to true,
	 * and the sanitized rendered fragment as 'value'. It may also contain
	 * the render's freshness metadata as 'metadata' (T441561):
	 * [
	 *   'success' => true,
	 *   'value' => '<em>sanitized fragment</em>',
	 *   'metadata' => [ 'functionCallFreshResult' => '2026-10-23T10:00:00Z' ]
	 * ]
	 *
	 * A fragment, successful or failed, that was read from the AWFragmentStore
	 * rather than rendered for this request also has 'fromFragmentStore' set
	 * to true (T441583).
	 *
	 * A pending fragment will contain a 'success' flag set to true,
	 * and a 'pending' flag, also set to true:
	 * [
	 *   'success' => true,
	 *   'pending' => true
	 * ]
	 *
	 * A failed fragment will contain a 'success' flag set to false,
	 * the error information under the 'value' key:
	 * [
	 *   'success' => false,
	 *   'value' => [
	 *     'msg' => 'apierror-abstractwiki_run_fragment-returned-zerror',
	 *     'params' => [ 'Z500' ]
	 *     'httpStatusCode' => 400,
	 *     'zerror' => [ ... ],
	 *   ]
	 * ]
	 *
	 * Note that a successfully retrieved fragment that contains a failure
	 * will be returned as a successful HTTP request (200). A failed request
	 * due to API-related reasons (not enabled, bad request, etc.) will exit
	 * with an ApiUsageException.
	 *
	 * @inheritDoc
	 */
	public function execute() {
		// Abstract Wiki not enabled: exit with HTTP 501
		if ( !WikiLambdaServices::getMode()->isAbstract() ) {
			$this->dieWithError(
				[ 'apierror-abstractwiki_run_fragment-not-enabled' ],
				null, null, HttpStatus::NOT_IMPLEMENTED
			);
		}

		$params = $this->extractRequestParams();

		$qid = $params[ 'qid' ];
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

		$result = $params[ 'fresh' ] ?
			$this->getFreshFragment( $fragment, $qid, $language ) :
			$this->getLatestFragmentAndRevalidate( $fragment, $qid, $language, $async );

		// Set response (fragment might be pending, successful or failed):
		$pageResult = $this->getResult();
		$pageResult->addValue( [], $this->getModuleName(), $result );
	}

	/**
	 * Fetch the AWFragment from AWFragmentStore, and return it if available.
	 * If missing, return pending fragment if called with async=true, or
	 * make a synchronous call to render and sanitize the fragment and
	 * return whatever results of that call.
	 *
	 * The synchronous call needs the wikilambda-abstract-run-unsaved-fragment
	 * right, because it runs a fragment that the caller supplies. The other two
	 * paths do not need it: see the comment on the check below.
	 *
	 * @param array $fragment
	 * @param string $qid
	 * @param WikifunctionsLanguage $language
	 * @param bool $async
	 * @return array
	 */
	private function getLatestFragmentAndRevalidate(
		array $fragment,
		string $qid,
		WikifunctionsLanguage $language,
		bool $async
	): array {
		// Today's datetime, needed for the fragmentStore getter and for the regenerate request
		$datetime = ConvertibleTimestamp::now( TS::MW );

		// Get stored fragment (if any)
		$awFragment = $this->fragmentStore->getRenderedAWFragment(
			$fragment,
			$qid,
			$language,
			$datetime,
			/* revalidate= */ $async
		);

		// Stale or fresh, return the payload and be done. Say that it came from
		// the store, for the editor's provenance popover (T441583).
		if ( !$awFragment->isMissing() ) {
			return $awFragment->getValue() + [ 'fromFragmentStore' => true ];
		}

		// Missing fragment:
		// if async=true, return pending value
		if ( $async ) {
			return [
				'success' => true,
				'pending' => true
			];
		}

		// else, synchronously run and return value.
		//
		// Only this branch runs the caller's fragment here and now, so only this branch
		// needs the right. A stored fragment above sends nothing, and the async branch
		// above queues a job, which a page view does as well, so both stay available to
		// every reader. Any code inside the fragment is refused at the other end, where
		// the unsaved-code check runs on the function call we send.
		$this->checkUserRightsAny( 'wikilambda-abstract-run-unsaved-fragment' );

		return $this->abstractWikiRequest->fetchRenderedAWFragment(
			$fragment,
			$qid,
			$language->getZid(),
			$datetime,
			$awFragment->getKey()
		);
	}

	/**
	 * Render the fragment again here and now, asking Wikifunctions for a fresh result,
	 * bypassing its caches, and skipping the AWFragmentStore. The new render replaces the
	 * stored one. (T442987)
	 *
	 * The user needs the wikilambda-abstract-request-fresh-result right, which is
	 * rate-limited. As with any synchronous render, it also needs the
	 * wikilambda-abstract-run-unsaved-fragment right, because it runs a fragment that the
	 * caller supplies. A fresh request is always synchronous.
	 *
	 * @param array $fragment
	 * @param string $qid
	 * @param WikifunctionsLanguage $language
	 * @return array
	 */
	private function getFreshFragment(
		array $fragment,
		string $qid,
		WikifunctionsLanguage $language
	): array {
		if ( !$this->getConfig()->get( 'WikiLambdaAbstractEnableFreshResult' ) ) {
			$this->dieWithError(
				[ 'apierror-abstractwiki_run_fragment-fresh-not-enabled' ],
				null, null, HttpStatus::NOT_IMPLEMENTED
			);
		}

		$this->checkUserRightsAny( 'wikilambda-abstract-run-unsaved-fragment' );

		// Checks the right, and counts this request towards its rate limit
		$status = PermissionStatus::newEmpty();
		if ( !$this->getAuthority()->authorizeAction( 'wikilambda-abstract-request-fresh-result', $status ) ) {
			$this->dieStatus( $status );
		}

		// The same key as the store's, without reading the store
		$fragmentKey = AbstractContentUtils::makeCacheKeyForAbstractFragment( $fragment );

		return $this->abstractWikiRequest->fetchRenderedAWFragment(
			$fragment,
			$qid,
			$language->getZid(),
			ConvertibleTimestamp::now( TS::MW ),
			$fragmentKey,
			/* freshResult= */ true
		);
	}

	/**
	 * A fresh render costs work on Wikifunctions and Wikidata, so only that mode must be
	 * posted, with a CSRF token, so that it cannot be triggered cross-site. Reading or
	 * rendering a fragment as usual stays a cacheable GET. (T442987)
	 *
	 * @inheritDoc
	 */
	public function mustBePosted() {
		return $this->isFreshRequest();
	}

	/**
	 * @see mustBePosted()
	 * @inheritDoc
	 */
	public function needsToken() {
		return $this->isFreshRequest() ? 'csrf' : false;
	}

	/**
	 * Whether the request asks for a fresh render.
	 *
	 * Reads the raw request rather than extractRequestParams() so it is safe to
	 * call from needsToken()/mustBePosted(), which run before parameter
	 * validation. A boolean API parameter is true whenever it is present.
	 *
	 * @return bool
	 */
	private function isFreshRequest(): bool {
		return $this->getRequest()->getCheck( $this->encodeParamName( 'fresh' ) );
	}

	/**
	 * @inheritDoc
	 * @codeCoverageIgnore
	 */
	public function isInternal() {
		return true;
	}

	/**
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
			'fragment' => [
				ParamValidator::PARAM_TYPE => 'text',
				ParamValidator::PARAM_REQUIRED => true,
			],
			'async' => [
				ParamValidator::PARAM_TYPE => 'boolean',
				ParamValidator::PARAM_REQUIRED => false,
				ParamValidator::PARAM_DEFAULT => false
			],
			'fresh' => [
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
	 * @param string $fragmentFile
	 * @return string URL-encoded contents
	 * @codeCoverageIgnore
	 */
	private function buildExampleCallFor( $qid, $language, $fragmentFile ): string {
		$fragment = ZObjectUtils::readTestFile( 'abstract/' . $fragmentFile );
		return 'action=abstractwiki_run_fragment&'
			. 'abstractwiki_run_fragment_qid=' . $qid . '&'
			. 'abstractwiki_run_fragment_language=' . $language . '&'
			. 'abstractwiki_run_fragment_fragment=' . urlencode( $fragment );
	}

	/**
	 * @inheritDoc
	 * @codeCoverageIgnore
	 */
	protected function getExamplesMessages(): array {
		return [
			// Run an Abstract Wiki content fragment that contains a simple literal HTML
			$this->buildExampleCallFor( 'Q319', 'Z1002', 'fragment-literal-html.json' )
				=> 'apihelp-abstractwiki_run_fragment-example-literal-html',

			// Run an Abstract Wiki content fragment that contains a composition with arguments
			$this->buildExampleCallFor( 'Q319', 'Z1002', 'fragment-with-args.json' )
				=> 'apihelp-abstractwiki_run_fragment-example-composition'
		];
	}
}
