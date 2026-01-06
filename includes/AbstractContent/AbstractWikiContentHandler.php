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
use MediaWiki\Content\ContentHandlerFactory;
use MediaWiki\Content\Renderer\ContentParseParams;
use MediaWiki\Context\IContextSource;
use MediaWiki\Context\RequestContext;
use MediaWiki\Exception\MWContentSerializationException;
use MediaWiki\Html\Html;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Parser\ParserOutput;
use MediaWiki\Revision\SlotRenderingProvider;
use MediaWiki\Title\Title;
use TextSlotDiffRenderer;

class AbstractWikiContentHandler extends ContentHandler {

	// private const ABSTRACTCONTENT_TYPE_WIKIPEDIA = 'Q50081413';
	// private const ABSTRACTCONTENT_TYPE_DRAFT = 'Q560361';
	// // XXX: There is not yet a QID for Wiktionary content pages; this is used here as a placeholder
	// private const ABSTRACTCONTENT_TYPE_WIKTIONARY = 'Q15138389';

	/**
	 * @param string $modelId
	 * @param Config $config
	 * @param ContentHandlerFactory $contentHandlerFactory
	 */
	public function __construct(
		$modelId,
		private readonly Config $config,
		private readonly ContentHandlerFactory $contentHandlerFactory
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
		if ( !$this->config->get( 'WikiLambdaEnableAbstractMode' ) ) {
			return false;
		}

		$enabledNamespace = $this->config->get( 'WikiLambdaAbstractNamespaces' );

		if ( in_array( $title->getNamespace(), $enabledNamespace, true ) ) {
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
	 * @throws MWContentSerializationException if input causes an error
	 */
	public function unserializeContent( $text, $format = null ) {
		$class = $this->getContentClass();
		try {
			return new $class( $text );
		} catch ( InvalidArgumentException $error ) {
			// (T381115) If the passed user input isn't valid, we're expected to throw this particular MW error
			throw new MWContentSerializationException( $error->getMessage() );
		}
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
		return parent::getSecondaryDataUpdates( $title, $content, $role, $slotOutput );
	}

	/**
	 * @inheritDoc
	 */
	public function getDeletionUpdates( Title $title, $role ) {
		return parent::getDeletionUpdates( $title, $role );
	}

	/**
	 * @inheritDoc
	 */
	public function supportsDirectEditing() {
		return false;
	}

	/**
	 * @inheritDoc
	 */
	public function getActionOverrides() {
		return [
			'edit' => AbstractContentEditAction::class,
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
		$logger = LoggerFactory::getInstance( 'WikiLambda' );

		// Ensure the stored content is an AbstractWikiContent
		if ( !( $content instanceof AbstractWikiContent ) ) {
			$parserOutput->setContentHolderText(
				Html::element(
					'div',
					[
						'class' => [ 'ext-wikilambda-view-invalidcontent', 'warning' ],
					],
					wfMessage( 'wikilambda-invalidabstractcontent' )->inLanguage( $userLang )->text()
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

		// TODO (T411693): Provide the read page code

		$parserOutput->setContentHolderText(
			// Placeholder div for the Vue template.
			Html::element( 'div', [ 'id' => 'ext-wikilambda-app' ] )
			// Fallback div for the warning.
			. Html::rawElement(
				'div',
				[
					'class' => [ 'ext-wikilambda-view-nojsfallback', 'client-nojs' ],
				],
				Html::element(
					'div',
					[
						'class' => [ 'ext-wikilambda-view-nojswarning', 'warning' ],
					],
					wfMessage( 'wikilambda-viewmode-nojs' )->inLanguage( $userLang )->text()
				)
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
		$slotDiffRenderer = $this->contentHandlerFactory
			->getContentHandler( CONTENT_MODEL_TEXT )
			->getSlotDiffRenderer( $context );
		'@phan-var TextSlotDiffRenderer $slotDiffRenderer';
		return $slotDiffRenderer;
	}

}
