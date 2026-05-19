<?php

/**
 * WikiLambda Special:ViewAbstract page
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Special;

use MediaWiki\Config\ConfigException;
use MediaWiki\Content\Renderer\ContentRenderer;
use MediaWiki\Exception\ErrorPageError;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentUtils;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore;
use MediaWiki\Extension\WikiLambda\AWStorage\AWSection;
use MediaWiki\Extension\WikiLambda\Language\WikifunctionsLanguageFactory;
use MediaWiki\Extension\WikiLambda\WikidataEntityLookup;
use MediaWiki\Html\Html;
use MediaWiki\Language\LanguageNameUtils;
use MediaWiki\MainConfigNames;
use MediaWiki\SpecialPage\UnlistedSpecialPage;
use Wikimedia\HtmlArmor\HtmlArmor;

class SpecialPreviewAbstract extends UnlistedSpecialPage {

	public function __construct(
		private readonly ContentRenderer $contentRenderer,
		private readonly LanguageNameUtils $languageNameUtils,
		private readonly WikifunctionsLanguageFactory $languageFactory,
		private readonly AWArticleStore $articleStore,
		private readonly WikidataEntityLookup $entityLookup
	) {
		parent::__construct( 'PreviewAbstract' );
	}

	/** @inheritDoc */
	public function getRestriction(): string {
		return 'read';
	}

	/**
	 * @inheritDoc
	 */
	protected function getGroupName() {
		// Triggers use of message specialpages-group-abstractwiki
		return 'abstractwiki';
	}

	/**
	 * @inheritDoc
	 */
	public function getDescription() {
		return $this->msg( 'wikilambda-abstract-special-preview' );
	}

	/**
	 * @inheritDoc
	 *
	 * @throws ConfigException
	 */
	public function execute( $subPage ) {
		// Throw ErrorPageError if Abstract or AbstractClient mode are not enabled
		if ( !(
			// TODO disable in abstract for now
			// $this->getConfig()->get( 'WikiLambdaEnableAbstractMode' ) ||
			$this->getConfig()->get( 'WikiLambdaEnableAbstractClientMode' )
		) ) {
			$this->displayNotAvailableError();
		}

		// Throw PermissionsError if user doesn't have the necessary rights
		if ( !$this->userCanExecute( $this->getUser() ) ) {
			$this->displayRestrictionError();
		}

		$request = $this->getRequest();
		$output = $this->getOutput();

		// Start setting headers
		$this->setHeaders();

		// If there's no subpage info
		// TODO: Do we want to enable the base SpecialPage to show a list of
		// available articles? E.g. a field allows the reader to select a language
		// from the available languages list. On selection, the page loads a
		// paginated list of topics that are ready for the language. Each
		// item shows the topic label, maybe a "generated on YYYY-mm-dd H:m:s"
		// and its linked to go to Special:PreviewAbstract/lang/qid
		if ( !$subPage || !is_string( $subPage ) ) {
			$this->showErrorBox(
				$this->msg( 'wikilambda-abstract-special-preview-missing-params-title' )->escaped(),
				$this->msg( 'wikilambda-abstract-special-preview-missing-params-body' )->escaped()
			);
			return;
		}

		$subPageSplit = [];
		if ( !preg_match( '~^([^/]+)/(.+)$~', $subPage, $subPageSplit ) ) {
			// Fallback to 'en' if request doesn't specify a language.
			$targetLang = 'en';
			$targetQid = $subPage;
		} else {
			$targetLang = $subPageSplit[1];
			$targetQid = $subPageSplit[2];
		}

		// Allow the user to over-ride the content language if explicitly requested
		$targetLang = $request->getRawVal( 'uselang' ) ?? $targetLang;
		$contextLang = $this->getLanguage();

		// WikifunctionsLanguageFactory::isKnownLanguageCode verifies that the requested
		// language code is present in the bcp-47 => zid language mappings.
		if ( !$this->languageFactory->isKnownLanguageCode( $targetLang ) ) {
			$this->showErrorBox(
				$this->msg( 'wikilambda-abstract-special-preview-bad-lang-title' )->escaped(),
				$this->msg( 'wikilambda-abstract-special-preview-bad-lang-body', $targetLang )->escaped()
			);
			return;
		}

		// Finally we have the WikifunctionsLanguage we want to render the preview in:
		$language = $this->languageFactory->getLanguage( $targetLang );

		// Validate that the input topic Qid has the right shape
		if ( !AbstractContentUtils::isValidWikidataItemReference( $targetQid ) ) {
			$this->showErrorBox(
				$this->msg( 'wikilambda-abstract-special-preview-bad-qid-title' )->escaped(),
				$this->msg( 'wikilambda-abstract-special-preview-bad-qid-body', $targetQid )->escaped()
			);
			return;
		}

		// We can now safely resolve the targetQid and get its label for given language
		$targetTitle = $this->entityLookup->resolveAbstractLabel( $targetQid, $language->getCode() );

		// TODO internationalize quotes and parenthesis
		$fullTitle = $targetTitle ? "\"$targetTitle\" ($targetQid)" : $targetQid;

		$sitename = $this->getConfig()->get( MainConfigNames::Sitename );
		$htmlTitle = ( $targetTitle ? "$targetTitle ($targetQid)" : $targetQid ) . ' - ' . $sitename;

		$output->setPageTitle( $targetTitle ?? $targetQid );
		$output->setHTMLTitle( $htmlTitle );

		// Check that topicQid is in the allow list
		$allowedTopics = $this->getConfig()->has( 'WikiLambdaAbstractWikiAllowedTopics' ) ?
			$this->getConfig()->get( 'WikiLambdaAbstractWikiAllowedTopics' ) :
			[];
		if ( !in_array( $targetQid, $allowedTopics ) ) {
			$this->showWarningBox(
				$this->msg( 'wikilambda-abstract-special-preview-unsupported-qid-title' )->escaped(),
				$this->msg( 'wikilambda-abstract-special-preview-unsupported-qid-body', $fullTitle )->parse()
			);
			return;
		}

		// Check that language is in the allow list
		$allowedLangs = $this->getConfig()->has( 'WikiLambdaAbstractWikiAllowedLangs' ) ?
			$this->getConfig()->get( 'WikiLambdaAbstractWikiAllowedLangs' ) :
			[];

		if ( !in_array( $language->getCode(), $allowedLangs ) ) {
			// The name of the requested language code in the user's language
			$langName = $this->languageNameUtils->getLanguageName( $language->getCode(), $contextLang->getCode() );
			$this->showWarningBox(
				$this->msg( 'wikilambda-abstract-special-preview-unsupported-lang-title' )->escaped(),
				$this->msg( 'wikilambda-abstract-special-preview-unsupported-lang-body', $langName )->parse()
			);
			return;
		}

		// If it's listed for pre-rendering it should have stored metadata
		$awMetadata = $this->articleStore->getArticleMetadata( $targetQid );

		// The article has not been pre-generated yet, either because
		// it's not listed in the qid allow list, or because it hasn't
		// gone through its first pre-generation round yet.
		if ( !$awMetadata ) {
			// The name of the requested language code in the user's language
			$langName = $this->languageNameUtils->getLanguageName( $language->getCode(), $contextLang->getCode() );
			$this->showWarningBox(
				$this->msg( 'wikilambda-abstract-special-preview-not-ready-title' )->escaped(),
				$this->msg( 'wikilambda-abstract-special-preview-not-ready-body', $fullTitle, $langName )->parse()
			);
			return;
		}

		$articleHtml = '';

		$userdatetime = $contextLang->userTimeAndDate( $awMetadata->getLastUpdated(), $this->getUser() );
		$this->showNoticeBox(
			$this->msg( 'wikilambda-abstract-special-preview-provenance-banner', $userdatetime )->escaped()
		);

		$sectionQids = $awMetadata->getSectionQids();
		foreach ( $sectionQids as $sectionIndex => $sectionQid ) {
			// Resolve the section title only if not the Lede paragraph
			$sectionTitle = ( $sectionQid !== AbstractWikiContent::ABSTRACTCONTENT_SECTION_LEDE ) ?
				$this->entityLookup->resolveAbstractLabel( $sectionQid, $language->getCode() ) :
				null;

			// Get from the store
			$awSection = $this->articleStore->getSection( $targetQid, $sectionQid, $language->getCode() );

			// Transform into Html the retrieved section or an empty one (with the right section title)
			$sectionHtml = $awSection === null ?
				AWSection::emptyWikiSection( $sectionIndex, $sectionTitle, $sectionQid, $userdatetime ) :
				$awSection->asWikiSection( $sectionIndex, $sectionTitle );

			$articleHtml .= HtmlArmor::getHtml( $sectionHtml );
		}

		// (T345453) Have the standard copyright stuff show up.
		$output->setCopyright( true );

		// Set content html
		$output->addHTML( $articleHtml );
	}

	/**
	 * @param string $body
	 */
	private function showNoticeBox( $body ): void {
		$output = $this->getOutput();
		$output->addModuleStyles( 'mediawiki.codex.messagebox.styles' );
		$output->addHTML( Html::noticeBox( $body ) );
	}

	/**
	 * @param string $title
	 * @param string $body
	 */
	private function showWarningBox( $title, $body ): void {
		$output = $this->getOutput();
		$output->addModuleStyles( 'mediawiki.codex.messagebox.styles' );
		$output->addHTML( Html::warningBox(
			Html::rawElement( 'h3', [], $title ) . Html::rawElement( 'p', [], $body )
		) );
	}

	/**
	 * @param string $title
	 * @param string $body
	 */
	private function showErrorBox( $title, $body ): void {
		$output = $this->getOutput();
		$output->addModuleStyles( 'mediawiki.codex.messagebox.styles' );
		$output->addHTML( Html::errorBox(
			Html::rawElement( 'h3', [], $title ) . Html::rawElement( 'p', [], $body )
		) );
	}

	/**
	 * Output an error message telling the user that this Special page is not enabled.
	 *
	 * @throws ErrorPageError
	 */
	private function displayNotAvailableError(): never {
		$titleMessage = $this->msg( 'wikilambda-abstract-special-preview-not-enabled-title' );
		$errorMessage = $this->msg( 'wikilambda-abstract-special-preview-not-enabled' );
		throw new ErrorPageError( $titleMessage, $errorMessage );
	}

	/**
	 * (T355441) Unlike regular Special pages, we actively want search engines to
	 * index our content and follow our links.
	 *
	 * @inheritDoc
	 */
	protected function getRobotPolicy() {
		return 'index,follow';
	}
}
