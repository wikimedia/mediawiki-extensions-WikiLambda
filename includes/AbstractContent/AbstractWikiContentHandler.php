<?php
/**
 * WikiLambda content handler for Abstract Wiki content objects
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\AbstractContent;

use InvalidArgumentException;
use MediaWiki\Config\Config;
use MediaWiki\Content\Content;
use MediaWiki\Content\ContentHandler;
use MediaWiki\Content\ContentSerializationException;
use MediaWiki\Content\Renderer\ContentParseParams;
use MediaWiki\Content\ValidationParams;
use MediaWiki\Context\IContextSource;
use MediaWiki\Context\RequestContext;
use MediaWiki\Diff\TextSlotDiffRenderer;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore;
use MediaWiki\Extension\WikiLambda\PageTitle\PageTitleBuilder;
use MediaWiki\Extension\WikiLambda\UIUtils;
use MediaWiki\Extension\WikiLambda\WikidataEntityLookup;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Html\Html;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\Parser\ParserOutput;
use MediaWiki\Permissions\Authority;
use MediaWiki\Revision\RevisionLookup;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Revision\RevisionStore;
use MediaWiki\Revision\SlotRecord;
use MediaWiki\Revision\SlotRenderingProvider;
use MediaWiki\Title\Title;
use MediaWiki\WikiMap\WikiMap;
use StatusValue;

class AbstractWikiContentHandler extends ContentHandler {

	// private const ABSTRACTCONTENT_TYPE_WIKIPEDIA = 'Q50081413';
	// private const ABSTRACTCONTENT_TYPE_DRAFT = 'Q560361';
	// // XXX: There is not yet a QID for Wiktionary content pages; this is used here as a placeholder
	// private const ABSTRACTCONTENT_TYPE_WIKTIONARY = 'Q15138389';

	/**
	 * @param string $modelId
	 * @param Config $config
	 * @param AWArticleStore $articleStore
	 * @param WikidataEntityLookup $entityLookup
	 * @param RevisionLookup $revisionLookup
	 */
	public function __construct(
		$modelId,
		private readonly Config $config,
		private readonly AWArticleStore $articleStore,
		private readonly WikidataEntityLookup $entityLookup,
		private readonly RevisionLookup $revisionLookup
	) {
		if ( $modelId !== CONTENT_MODEL_ABSTRACT ) {
			throw new InvalidArgumentException( __CLASS__ . " initialised for invalid content model" );
		}

		// Triggers use of message content-model-abstractcontent
		parent::__construct( CONTENT_MODEL_ABSTRACT, [ CONTENT_FORMAT_TEXT ] );
	}

	/**
	 * @param Title $title Page to check
	 * @return bool
	 */
	public function canBeUsedOn( Title $title ) {
		if ( !WikiLambdaServices::getMode()->isAbstract() ) {
			return false;
		}

		$enabledNamespace = $this->config->get( 'WikiLambdaAbstractNamespaces' );
		if ( array_key_exists( $title->getNamespace(), $enabledNamespace ) ) {
			return true;
		}

		return false;
	}

	/**
	 * @return AbstractWikiContent
	 */
	public function makeEmptyContent() {
		return AbstractWikiContent::makeEmptyContent();
	}

	/**
	 * @param string $data
	 * @param Title|null $title
	 * @param string|null $modelId
	 * @param string|null $format
	 * @return AbstractWikiContent
	 */
	public static function makeContent( $data, ?Title $title = null, $modelId = null, $format = null ) {
		// @phan-suppress-next-line PhanTypeMismatchReturnSuperType
		return parent::makeContent( $data, $title, $modelId, $format );
	}

	/**
	 * @return string
	 */
	protected function getContentClass() {
		return AbstractWikiContent::class;
	}

	/**
	 * @param Content $content
	 * @param string|null $format
	 * @return string
	 */
	public function serializeContent( Content $content, $format = null ) {
		$this->checkFormat( $format );

		if ( !( $content instanceof AbstractWikiContent ) ) {
			// Throw?
			return '';
		}

		return $content->getText();
	}

	/**
	 * @param string $text
	 * @param string|null $format
	 * @return AbstractWikiContent
	 * @throws ContentSerializationException if input causes an error
	 */
	public function unserializeContent( $text, $format = null ) {
		$class = $this->getContentClass();
		try {
			return new $class( $text );
		} catch ( InvalidArgumentException $error ) {
			// (T381115) If the passed user input isn't valid, we're expected to throw this particular MW error
			throw new ContentSerializationException( $error->getMessage() );
		}
	}

	/**
	 * @inheritDoc
	 */
	public function validateSave( Content $content, ValidationParams $validationParams ) {
		/** @var AbstractWikiContent $content */
		'@phan-var AbstractWikiContent $content';

		$title = Title::newFromPageIdentity( $validationParams->getPageIdentity() );

		if ( !$content->isValidForTitle( $title ) ) {
			return $content->getStatus();
		}

		$qid = $content->getTopicQid();
		// Check if the QID is null or a null Wikidata item reference (Q0)
		if ( $qid === null || AbstractContentUtils::isNullWikidataItemReference( $qid ) ) {
			return StatusValue::newFatal( 'wikilambda-abstract-error-bad-qid', $qid ?? '' );
		}
		// Check if the QID exists on Wikidata
		// If WikibaseClient is not loaded, we skip this check and let the save proceed.
		if ( $this->entityLookup->wikidataItemExists( $qid ) === false ) {
			return StatusValue::newFatal( 'wikilambda-abstract-error-nonexistent-qid', $qid );
		}

		return StatusValue::newGood();
	}

	/**
	 * @inheritDoc
	 */
	public function getSecondaryDataUpdates(
		Title $title,
		Content $content,
		$role,
		SlotRenderingProvider $slotOutput
	) {
		$updates = parent::getSecondaryDataUpdates( $title, $content, $role, $slotOutput );
		if ( $content instanceof AbstractWikiContent ) {
			$updates[] = new AbstractContentDataUpdate(
				$title, $content, $this->articleStore, $this->revisionLookup
			);
			// (T390557) Record which Functions this Abstract article calls into the shared cross-wiki usage table.
			$updates[] = new AbstractWikiUsageUpdate( $title, $content );
		}

		return $updates;
	}

	/**
	 * @inheritDoc
	 */
	public function getDeletionUpdates( Title $title, $role ) {
		$updates = parent::getDeletionUpdates( $title, $role );

		$updates[] = new AbstractContentDataRemoval( $title, $this->articleStore );

		// (T390557) Clear this article's rows from the shared usage table.
		$updates[] = new AbstractWikiUsageRemoval( WikiMap::getCurrentWikiId(), $title->getArticleID() );

		return $updates;
	}

	/**
	 * @inheritDoc
	 */
	public function supportsDirectEditing() {
		return true;
	}

	/**
	 * @inheritDoc
	 */
	public function supportsRedirects() {
		return true;
	}

	/**
	 * @inheritDoc
	 */
	public function getActionOverrides() {
		return [
			'edit' => [
				'class' => AbstractContentEditAction::class,
				'services' => [
					'RevisionStore',
					'ContentHandlerFactory'
				]
			],
			'history' => AbstractContentHistoryAction::class
		];
	}

	/**
	 * Do not render HTML on edit
	 *
	 * @return bool
	 */
	public function generateHTMLOnEdit(): bool {
		return false;
	}

	/**
	 * Set the HTML and add the appropriate styles.
	 *
	 * @inheritDoc
	 * @param Content $content
	 * @param ContentParseParams $cpoParams
	 * @param ParserOutput &$parserOutput The output object to fill (reference).
	 */
	protected function fillParserOutput(
		Content $content,
		ContentParseParams $cpoParams,
		ParserOutput &$parserOutput
	) {
		$userLang = RequestContext::getMain()->getLanguage();
		$logger = LoggerFactory::getInstance( 'WikiLambdaAbstract' );

		// Ensure the stored content is a valid AbstractWikiContent
		if ( !( $content instanceof AbstractWikiContent ) || !$content->isValid() ) {
			$parserOutput->setContentHolderText(
				Html::element(
					'div',
					[
						'class' => [ 'ext-wikilambda-view-invalidcontent', 'warning' ],
					],
					wfMessage( 'wikilambda-abstract-invalidcontent' )->inLanguage( $userLang )->text()
				)
			);
			// Exit early, as the rest of the code relies on the stored content being ours.
			return;
		}

		// Don't do further work if the requester doesn't want the HTML version generated.
		if ( !$cpoParams->getGenerateHtml() ) {
			$parserOutput->setContentHolderText( '' );
			return;
		}

		// TODO (T362245): Re-work our code to use PageReferences rather than Titles
		$pageIdentity = $cpoParams->getPage();
		$title = Title::castFromPageReference( $pageIdentity );
		'@phan-var Title $title';

		// Set display title to show Wikibase label if available
		$qid = $title->getBaseText();
		$langCode = $userLang->getCode();
		$label = $this->entityLookup->resolveAbstractLabel( $qid, $langCode );
		if ( $label !== null ) {
			$parserOutput->setDisplayTitle(
				PageTitleBuilder::createAbstractViewPageTitle(
					$label,
					$langCode,
					$userLang->getDir(),
					$qid,
				)
			);
		}

		// (T426833) Set the browser <title> directly on the OutputPage ("Label (QID) -
		// {{SITENAME}}" or "QID - {{SITENAME}}"), mirroring ZObjectContentHandler (T360169),
		// so the "/wiki/Q42" and "?title=…" views match the Special:ViewAbstract, edit and
		// history variants. Set unconditionally so the no-label case drops the namespace too.
		RequestContext::getMain()->getOutput()->setHTMLTitle(
			PageTitleBuilder::createAbstractViewPageHtmlTitle( $label, $qid, $langCode )
		);

		// Set config variables
		$wikilambdaConfig = [
			'abstractContent' => true,
			'content' => $content->getText(),
			'createNewPage' => false,
			'title' => $title->getBaseText(),
			'page' => $title->getPrefixedDBkey(),
			'zlang' => $userLang->getCode(),
			'viewmode' => true
		];
		$parserOutput->setJsConfigVar( 'wgWikiLambda', $wikilambdaConfig );

		// Load styles and Vue app modules
		$parserOutput->addModuleStyles( [ 'ext.wikilambda.viewpage.styles' ] );
		$parserOutput->addModules( [ 'ext.wikilambda.app' ] );

		// Build HTML fragments to load Vue app
		$loadingMessage = wfMessage( 'wikilambda-loading' )->inLanguage( $userLang )->text();
		$parserOutput->setContentHolderText(
			// Placeholder div for the Vue template with Codex progress indicator.
			Html::rawElement(
				'div',
				[ 'id' => 'ext-wikilambda-app' ],
				UIUtils::createCodexProgressIndicator( $loadingMessage )
			)
			// Fallback message for users without JavaScript.
			. Html::rawElement(
				'noscript',
				[],
				wfMessage( 'wikilambda-nojs' )->inLanguage( $userLang )->parse()
			)
		);
	}

	/**
	 * @inheritDoc
	 */
	public function createDifferenceEngine(
		IContextSource $context,
		$oldContentRevisionId = 0,
		$newContentRevisionId = 0,
		$recentChangesId = 0,
		$refreshCache = false,
		$unhide = false
	) {
		return new AbstractContentDifferenceEngine(
			$context, $oldContentRevisionId, $newContentRevisionId, $recentChangesId, $refreshCache, $unhide
		);
	}

	/**
	 * @inheritDoc
	 *
	 * Access level widened to public for use in AbstractContentDifferenceEngine
	 */
	public function getSlotDiffRendererWithOptions( IContextSource $context, $options = [] ) {
		// NOTE: We intentionally avoid injecting ContentHandlerFactory here.
		// Accessing MediaWikiServices during early service construction can
		// trigger premature initialization of ContentHandlerFactory, which may
		// prevent other extensions (e.g. Wikibase) from registering their
		// content models correctly.
		$slotDiffRenderer = MediaWikiServices::getInstance()
			->getContentHandlerFactory()
			->getContentHandler( CONTENT_MODEL_TEXT )
			->getSlotDiffRenderer( $context );
		'@phan-var TextSlotDiffRenderer $slotDiffRenderer';
		return $slotDiffRenderer;
	}

	/**
	 * Return the AbstractWikiContent object for a title and revisionId
	 * or the latest revision if revisionId is null.
	 *
	 * Returns false if the revision is not found, the content model of the
	 * retrieved revision doesn't match AbstractContent model, or the given
	 * performer may not see the (deleted/suppressed) revision.
	 *
	 * When a performer is supplied the content is read for that user's audience
	 * (RevisionDelete/suppression honoured); when it is null the content is read
	 * at the public audience, so a deleted/suppressed revision is excluded. The
	 * only null-performer caller is the public article-store rebuild.
	 *
	 * TODO: Once the security fix is deployed, make the visibility audience
	 * explicit — an $audience parameter mirroring RevisionRecord::getContent() —
	 * rather than inferring it from whether a performer is passed. Deferred to
	 * keep this patch minimal; do it under regular code review.
	 *
	 * @param RevisionStore $revisionStore
	 * @param Title $title
	 * @param int|null $revisionId
	 * @param Authority|null $performer
	 * @return AbstractWikiContent|false
	 */
	public function getAbstractContentForTitle(
		RevisionStore $revisionStore,
		Title $title,
		?int $revisionId = null,
		?Authority $performer = null
	) {
		// Get requested or current revision
		$revision = $revisionId ?
			$revisionStore->getRevisionByTitle( $title, $revisionId, 0 ) :
			$revisionStore->getKnownLatestRevision( $title );

		// Check revision exists
		if ( !$revision ) {
			return false;
		}

		// Check content model
		$contentModel = $revision->getMainContentModel();
		if ( $contentModel !== CONTENT_MODEL_ABSTRACT ) {
			return false;
		}

		// Honour deletion/suppression. With a performer, use their audience; without
		// one, fail closed at the public audience (the only no-performer caller is the
		// public article-store rebuild, which must not bake in hidden content).
		$audience = $performer ? RevisionRecord::FOR_THIS_USER : RevisionRecord::FOR_PUBLIC;
		$content = $revision->getContent( SlotRecord::MAIN, $audience, $performer );
		if ( $content === null ) {
			return false;
		}
		'@phan-var AbstractWikiContent $content';
		return $content;
	}
}
