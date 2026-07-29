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
use MediaWiki\Content\IContentHandlerFactory;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContentHandler;
use MediaWiki\Extension\WikiLambda\AWStorage\AWFragmentStore;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\Language\WikifunctionsLanguageFactory;
use MediaWiki\Extension\WikiLambda\WikifunctionCallException;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Revision\RevisionStore;
use MediaWiki\Title\TitleFactory;
use Psr\Log\LoggerInterface;
use Wikimedia\ParamValidator\ParamValidator;

class ApiAbstractWikiFetchSection extends ApiBase {

	private LoggerInterface $logger;

	public function __construct(
		ApiMain $mainModule,
		string $moduleName,
		private readonly WikifunctionsLanguageFactory $wfLanguageFactory,
		private readonly AWFragmentStore $fragmentStore,
		private readonly IContentHandlerFactory $contentHandlerFactory,
		private readonly RevisionStore $revisionStore,
		private readonly TitleFactory $titleFactory
	) {
		parent::__construct( $mainModule, $moduleName, 'abstractwiki_fetch_section_' );
		// Non-injected items
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaAbstract' );
	}

	/**
	 * Gets the array of fragments that compose a given article section rendered
	 * for a given language.
	 * The fragments are in their present state, which can be successful, failed
	 * or pending.
	 *
	 * @see ApiBase::execute()
	 * @inheritDoc
	 */
	public function execute() {
		// Abstract Wiki not enabled: exit with HTTP 501
		if ( !WikiLambdaServices::getMode()->isAbstract() ) {
			$this->dieWithError(
				[ 'apierror-abstractwiki_fetch_section-not-enabled' ],
				null, null, HttpStatus::NOT_IMPLEMENTED
			);
		}

		$params = $this->extractRequestParams();

		$topicQid = $params[ 'topic' ];
		$sectionQid = $params[ 'section' ];
		$languageZid = $params[ 'language' ];
		$date = $params[ 'date' ];
		$fragmentsStr = $params[ 'fragments' ];

		// Get Wikifunctions language mapping for given language Zid
		$language = $this->wfLanguageFactory->getLanguageFromZid( $languageZid );
		$unsavedFragments = true;

		// Get the array of fragments whose rendered output we will fetch:
		//
		// * If there's no list of fragments sent in the request body, we run all the
		//   persisted fragments from the given section. This action can be freely
		//   done during read page and with a lower autority.
		//
		// * If there's a specified list of fragments in the output, we will fetch those,
		//   assuming they are being edited so their content is not the persisted one.
		//   If that's the case, we should check for the user's edit rights, so that
		//   we can avoid massive run of arbitrary fragments from non-logged in users

		if ( $fragmentsStr === null ) {
			// No fragments passed in the request: fetch all fragments from the section
			$unsavedFragments = false;
			$fragments = $this->getStoredSectionFragments( $topicQid, $sectionQid );
		} else {
			// Fragments passed in the request: we check permissions and validate
			$fragments = json_decode( $fragmentsStr, true );

			// Make sure authority has the right edit permissions
			$this->checkUserRightsAny( 'wikilambda-abstract-run-unsaved-fragment' );

			if ( !is_array( $fragments ) || !array_is_list( $fragments ) ) {
				$this->dieWithError(
					[ 'apierror-abstractwiki_fetch_section-bad-fragments' ],
					null, null, HttpStatus::BAD_REQUEST
				);
			}
		}

		$this->getResult()->addValue( [ $this->getModuleName() ], $sectionQid, [] );

		// 4. For each fragment...
		foreach ( $fragments as $fragment ) {
			// 4.1 Lightly validate each fragment, make sure at least that
			// the type agrees with the function signatures (is an array)
			if ( !is_array( $fragment ) ) {
				$e = new WikifunctionCallException( 'apierror-abstractwiki_fetch_section-bad-fragments' );
				$fragmentResult = [
					'success' => false,
					'value' => $e->toArray()
				];
				$this->getResult()->addValue( [ $this->getModuleName(), $sectionQid ], null, $fragmentResult );
				continue;
			}

			// 4.2 Get the fragment from the store, which might be fresh, stale, or pending:
			$awFragment = $this->fragmentStore->getRenderedAWFragment(
				$fragment,
				$topicQid,
				$language,
				$date
			);

			// 4.2. Add fragment (in any state) to the response array for the section
			$fragmentResult = $awFragment->isMissing() ? [
				'success' => true,
				'pending' => true,
				'value' => AWFragmentStore::createPendingFragmentBlock( $language->getCode() )
			] : $awFragment->getValue();

			$this->getResult()->addValue( [ $this->getModuleName(), $sectionQid ], null, $fragmentResult );
		}
	}

	/**
	 * Retrieves the list of fragments stored in the given section as per its latest revision.
	 *
	 * @param string $topicQid
	 * @param string $sectionQid
	 * @return array
	 */
	private function getStoredSectionFragments( string $topicQid, string $sectionQid ): array {
		// 1. Get the AW content
		$contentHandler = $this->contentHandlerFactory->getContentHandler( CONTENT_MODEL_ABSTRACT );
		'@phan-var AbstractWikiContentHandler $contentHandler';

		// Get AbstractContent primary namespace ID
		$namespaces = $this->getConfig()->get( 'WikiLambdaAbstractNamespaces' );
		$awNamespace = is_array( $namespaces ) && ( count( $namespaces ) > 0 )
		? intval( array_keys( $namespaces )[0] )
		: NS_MAIN;

		$title = $this->titleFactory->newFromText( $topicQid, $awNamespace );
		if ( !$title || !$title->exists() ) {
			$this->dieWithError(
				[ 'apierror-abstractwiki_fetch_section-bad-topic' ],
				null, null, HttpStatus::BAD_REQUEST
			);
		}

		$awContent = $contentHandler->getAbstractContentForTitle(
			$this->revisionStore, $title, null, $this->getAuthority()
		);
		if ( $awContent === false || !$awContent->isValid() ) {
			$this->dieWithError(
				[ 'apierror-abstractwiki_fetch_section-bad-content' ],
				null, null, HttpStatus::BAD_REQUEST
			);
		}

		// 2. Get the section for this content
		$section = $awContent->getSectionByQid( $sectionQid );
		if ( $section === null ) {
			$this->dieWithError(
				[ 'apierror-abstractwiki_fetch_section-bad-section' ],
				null, null, HttpStatus::BAD_REQUEST
			);
		}

		// 3. Return the array of fragments; remove benjamin item
		return array_slice( $section['fragments'], 1 );
	}

	/**
	 * @see ApiBase::isInternal()
	 * @inheritDoc
	 * @codeCoverageIgnore
	 */
	public function isInternal() {
		return true;
	}

	/**
	 * Fetching a section's persisted fragments is an idempotent read and can be
	 * served as a cacheable GET. Only the unsaved-fragment render path needs
	 * POST, for its large JSON payload and the CSRF token from needsToken().
	 *
	 * @see ApiBase::mustBePosted()
	 * @inheritDoc
	 */
	public function mustBePosted() {
		return $this->isUnsavedFragmentsRequest();
	}

	/**
	 * The persisted-fragment read needs no token, but the unsaved-fragment
	 * render path runs arbitrary fragments under an elevated right, so it is
	 * guarded with a CSRF token to stop it being triggered cross-site.
	 *
	 * @see ApiBase::needsToken()
	 * @inheritDoc
	 */
	public function needsToken() {
		return $this->isUnsavedFragmentsRequest() ? 'csrf' : false;
	}

	/**
	 * Whether the request carries an explicit list of (unsaved) fragments to
	 * render, as opposed to fetching the section's persisted fragments.
	 *
	 * Reads the raw request rather than extractRequestParams() so it is safe to
	 * call from needsToken()/mustBePosted(), which run before parameter
	 * validation.
	 *
	 * @return bool
	 */
	private function isUnsavedFragmentsRequest(): bool {
		return $this->getRequest()->getCheck( $this->encodeParamName( 'fragments' ) );
	}

	/**
	 * @see ApiBase::getAllowedParams()
	 * @inheritDoc
	 * @codeCoverageIgnore
	 */
	protected function getAllowedParams(): array {
		return [
			'topic' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_REQUIRED => true,
			],
			'section' => [
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
			'fragments' => [
				ParamValidator::PARAM_TYPE => 'text',
				ParamValidator::PARAM_REQUIRED => false,
			],
		];
	}

	/**
	 * Generates URL-encoded example call to run an abstract fragment
	 *
	 * @param string $topic
	 * @param string $section
	 * @param string $language
	 * @param string $date
	 * @param null|string $fragments
	 * @return string URL-encoded contents
	 * @codeCoverageIgnore
	 */
	private function buildExampleCallFor( $topic, $section, $language, $date, $fragments = null ): string {
		$url = 'action=abstractwiki_fetch_section&'
			. 'abstractwiki_fetch_section_topic=' . $topic . '&'
			. 'abstractwiki_fetch_section_section=' . $section . '&'
			. 'abstractwiki_fetch_section_language=' . $language . '&'
			. 'abstractwiki_fetch_section_date=' . $date;

		if ( $fragments !== null ) {
			$url .= '&abstractwiki_fetch_section_fragments=' . $fragments;
		}

		return $url;
	}

	/**
	 * @see ApiBase::getExamplesMessages()
	 * @return array
	 * @codeCoverageIgnore
	 */
	protected function getExamplesMessages(): array {
		$fragmentList = urlencode( json_encode( [
			json_decode( ZObjectUtils::readTestFile( 'abstract/fragment-literal-html.json' ) ),
			json_decode( ZObjectUtils::readTestFile( 'abstract/fragment-with-args.json' ) )
		] ) );

		return [
			// Fetch an Abstract Wiki lede section for a given topic, language and date
			$this->buildExampleCallFor( 'Q319', 'Q8776414', 'Z1002', '26-7-2023' )
				=> 'apihelp-abstractwiki_fetch_section-example-lede',

			// Fetch a non-saved array of fragments
			$this->buildExampleCallFor( 'Q319', 'Q8776414', 'Z1002', '26-7-2023', $fragmentList )
				=> 'apihelp-abstractwiki_fetch_section-example-unsaved',
		];
	}
}
