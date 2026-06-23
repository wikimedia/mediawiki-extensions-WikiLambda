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
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiConfigProvider;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore;
use MediaWiki\Extension\WikiLambda\AWStorage\AWSection;
use MediaWiki\Extension\WikiLambda\Language\WikifunctionsLanguageFactory;
use MediaWiki\Extension\WikiLambda\WikidataEntityLookup;
use MediaWiki\Html\Html;
use MediaWiki\Language\LanguageNameUtils;
use MediaWiki\MainConfigNames;
use MediaWiki\SpecialPage\UnlistedSpecialPage;
use MediaWiki\Title\Title;
use Wikimedia\HtmlArmor\HtmlArmor;
use Wikimedia\Stats\StatsFactory;

class SpecialPreviewAbstract extends UnlistedSpecialPage {

	private StatsFactory $statsFactory;

	public function __construct(
		private readonly ContentRenderer $contentRenderer,
		private readonly LanguageNameUtils $languageNameUtils,
		private readonly WikifunctionsLanguageFactory $languageFactory,
		private readonly AWArticleStore $articleStore,
		private readonly AbstractWikiConfigProvider $awConfigProvider,
		private readonly WikidataEntityLookup $entityLookup,
		StatsFactory $statsFactory
	) {
		parent::__construct( 'PreviewAbstract' );
		$this->statsFactory = $statsFactory->withComponent( 'WikiLambda' );
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
		$output->addModuleStyles( [ 'ext.wikilambda.viewpage.styles' ] );

		// Start setting headers
		$this->setHeaders();

		// (T345453) Show the standard copyright footer on every outcome, including the error
		// and warning states below. The footer only renders its copyright line when the
		// *relevant* title exists (SkinComponentFooter), which a Special page's own NS_SPECIAL
		// title never does; stand in the wiki's main page for now. The success path below
		// refines this to the backing local article where one is configured.
		$output->setCopyright( true );
		$this->getSkin()->setRelevantTitle( Title::newMainPage() );

		$startTime = microtime( true );
		$locale = 'unknown';
		$title = $this->getContext()->getTitle();
		$source = $title !== null && $title->isSpecialPage() ? 'special_page' : 'embedded';

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
			$this->recordRenderTiming( $startTime, $locale, $source, 'missing_params' );
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
		$locale = $targetLang;

		// WikifunctionsLanguageFactory::isKnownLanguageCode verifies that the requested
		// language code is present in the bcp-47 => zid language mappings.
		if ( !$this->languageFactory->isKnownLanguageCode( $targetLang ) ) {
			$this->showErrorBox(
				$this->msg( 'wikilambda-abstract-special-preview-bad-lang-title' )->escaped(),
				$this->msg( 'wikilambda-abstract-special-preview-bad-lang-body', $targetLang )->escaped()
			);
			$this->recordRenderTiming( $startTime, $locale, $source, 'bad_lang' );
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
			$this->recordRenderTiming( $startTime, $locale, $source, 'bad_qid' );
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
			$this->recordRenderTiming( $startTime, $locale, $source, 'unsupported_topic' );
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
			$this->recordRenderTiming( $startTime, $locale, $source, 'unsupported_lang' );
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
			$this->recordRenderTiming( $startTime, $locale, $source, 'not_ready' );
			return;
		}

		$articleHtml = '';

		$userdatetime = $contextLang->userTimeAndDate( $awMetadata->getLastUpdated(), $this->getUser() );
		$userdate = $contextLang->userDate( $awMetadata->getLastUpdated(), $this->getUser() );
		$usertime = $contextLang->userTime( $awMetadata->getLastUpdated(), $this->getUser() );

		$sectionQids = $awMetadata->getSectionQids();
		$hasMissingSections = false;
		foreach ( $sectionQids as $sectionIndex => $sectionQid ) {
			// Resolve the section title only if not the Lede paragraph
			$sectionTitle = ( $sectionQid !== AbstractWikiContent::ABSTRACTCONTENT_SECTION_LEDE ) ?
				$this->entityLookup->resolveAbstractLabel( $sectionQid, $language->getCode() ) :
				null;

			// Get from the store
			$awSection = $this->articleStore->getSection( $targetQid, $sectionQid, $language->getCode() );

			if ( $awSection === null ) {
				$hasMissingSections = true;
			}

			// Was a pre-rendered section available in the store, or did we fall back to a placeholder?
			// Grafana: mediawiki.WikiLambda.aw_preview_section_total{locale=…, source=…, outcome=…}
			$this->statsFactory->getCounter( 'aw_preview_section_total' )
				->setLabel( 'locale', $locale )
				->setLabel( 'source', $source )
				->setLabel( 'outcome', $awSection === null ? 'missing' : 'found' )
				->increment();

			// Transform into Html the retrieved section or an empty one (with the right section title)
			$sectionHtml = $awSection === null ?
				AWSection::emptyWikiSection( $sectionIndex, $sectionTitle, $sectionQid, $userdatetime ) :
				$awSection->asWikiSection( $sectionIndex, $sectionTitle );

			$articleHtml .= HtmlArmor::getHtml( $sectionHtml );
		}

		// (T345453) Refine the relevant title set above to the backing local article where
		// one is configured, so the standard copyright footer attributes the right page.
		$this->getSkin()->setRelevantTitle( $this->getRelevantTitleForPreview( $targetQid ) );

		// Set content html
		$output->addHTML( $articleHtml );

		// Finally show AW provenance banner at the bottom of the article
		$this->showAbstractWikiBox(
			$this->getProvenanceNotice( $usertime, $userdate ) .
			$this->getOptInCallToAction( $targetQid )
		);

		$this->recordRenderTiming( $startTime, $locale, $source, $hasMissingSections ? 'incomplete' : 'complete' );
	}

	/**
	 * @param float $startTime
	 * @param string $locale
	 * @param string $source
	 * @param string $outcome
	 */
	private function recordRenderTiming( float $startTime, string $locale, string $source, string $outcome ): void {
		// How long does serving an AW article preview take, end-to-end?
		// Grafana: mediawiki.WikiLambda.aw_preview_render_seconds{locale=…, source=…, outcome=…}
		$this->statsFactory->getTiming( 'aw_preview_render_seconds' )
			->setLabel( 'locale', $locale )
			->setLabel( 'source', $source )
			->setLabel( 'outcome', $outcome )
			->observeSeconds( microtime( true ) - $startTime );
	}

	/**
	 * @param string $usertime
	 * @param string $userdate
	 * @return string
	 */
	private function getProvenanceNotice( $usertime, $userdate ): string {
		return Html::rawElement( 'p', [],
			$this->msg( 'wikilambda-abstract-special-preview-provenance-banner', $usertime, $userdate )->escaped()
		);
	}

	/**
	 * Whether Abstract Wikipedia content should be integrated into local articles on this wiki.
	 *
	 * Requires both the abstract client mode master switch and the integration sub-flag, so the
	 * latter can act as an independent kill-switch without disabling the rest of client mode.
	 *
	 * @return bool
	 */
	private function integrationEnabled(): bool {
		return $this->getConfig()->get( 'WikiLambdaEnableAbstractClientMode' ) &&
			$this->getConfig()->get( 'WikiLambdaEnableAbstractClientModeIntegration' );
	}

	/**
	 * Find the primary local article title that the given topic Qid is opted in to,
	 * scanning the opt-in configuration. Returns null if the topic is not opted in.
	 *
	 * @param string $targetQid
	 * @return string|null
	 */
	private function findPrimaryTitle( string $targetQid ): ?string {
		foreach ( $this->awConfigProvider->provideOptedIn() as $pageTitle => $pageConfig ) {
			if ( ( $pageConfig[ 'qid' ] === $targetQid ) && ( $pageConfig[ 'redirect' ] === false ) ) {
				return $pageTitle;
			}
		}
		return null;
	}

	/**
	 * The title whose content this preview stands in for, used as the relevant title so
	 * the skin footer's title-exists gate passes (see execute()). This is the opted-in
	 * local article when one is configured and exists, otherwise the wiki's main page.
	 *
	 * @param string $targetQid
	 * @return Title
	 */
	private function getRelevantTitleForPreview( string $targetQid ): Title {
		if ( $this->integrationEnabled() ) {
			$primaryTitle = $this->findPrimaryTitle( $targetQid );
			if ( $primaryTitle !== null ) {
				$title = Title::newFromText( $primaryTitle );
				if ( $title && $title->exists() ) {
					return $title;
				}
			}
		}
		return Title::newMainPage();
	}

	/**
	 * @param string $targetQid
	 * @return string
	 */
	private function getOptInCallToAction( $targetQid ): string {
		// Only show Opt-in or Opt-out Call To Action notices in AbstractClient mode
		if ( !$this->integrationEnabled() ) {
			return '';
		}

		// Only show Opt-in or Opt-out Call To Action if user holds 'wikilambda-abstract-optin' rigth
		if ( !$this->getUser()->isAllowed( 'wikilambda-abstract-optin' ) ) {
			return '';
		}

		$primaryTitle = $this->findPrimaryTitle( $targetQid );

		// If article is not opted in, show notice and cta
		if ( $primaryTitle === null ) {
			return Html::rawElement( 'p', [],
				$this->msg( 'wikilambda-abstract-special-preview-optedout-notice' )->parse()
				. ' ' . $this->msg( 'wikilambda-abstract-special-preview-optin-cta' )->parse()
			);
		}

		// If article is opted in, this can be Special:PreviewAbstract or the article page:
		// * Special:PreviewAbstract page: we show notice about where this page is shown.
		// * Article page: we don't show notice, as we are already there.
		$isSpecialPage = $this->getContext()->getTitle()->isSpecialPage();
		$parts = [];
		if ( $isSpecialPage ) {
			$parts[] = $this->msg( 'wikilambda-abstract-special-preview-optedin-notice', $primaryTitle )->parse();
		}
		$parts[] = $this->msg( 'wikilambda-abstract-special-preview-optout-cta' )->parse();
		return Html::rawElement( 'p', [], implode( ' ', $parts ) );
	}

	/**
	 * @param string $body
	 */
	private function showAbstractWikiBox( $body ): void {
		$output = $this->getOutput();
		$output->addModuleStyles( 'mediawiki.codex.messagebox.styles' );

		$iconUrl = $this->getConfig()->get( 'WikiLambdaAbstractWikiIconUrl' );
		$content = Html::rawElement( 'div', [ 'class' => 'cdx-message__content' ], $body );
		$img = Html::rawElement( 'img', [
			'src' => $iconUrl,
			'width' => '20',
			'height' => '20',
			'aria-hidden' => 'true',
		] );
		$icon = Html::rawElement( 'span', [
			'class' => [ 'cdx-icon', 'cdx-icon--medium', 'cdx-message__icon--vue' ],
		], $img );

		$html = Html::rawElement( 'div', [
			'class' => [
				'cdx-message',
				'cdx-message--block',
				'cdx-message--notice',
				'ext-wikilambda-aw-provenance-banner'
			],
			'aria-live' => 'polite',
		], $icon . $content );

		$output->addHTML( $html );
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
		$errorMessage = $this->msg( 'wikilambda-abstract-special-preview-not-enabled-body' );
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
