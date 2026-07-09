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
		// and warning states below. We deliberately do not override the skin's relevant title
		// to coax the footer into rendering: that title also drives the content-action tabs and
		// namespace links, so standing in the main page there mislabelled every tab and leaked
		// a second, broken "View history". The relevant title is left as the genuine surface
		// (the integrated article, or this special page), both of which are isKnown(); the
		// footer's copyright line is enabled for known titles that opt in via setCopyright().
		$output->setCopyright( true );

		$startTime = microtime( true );
		$locale = 'unknown';
		$title = $this->getContext()->getTitle();
		$source = $title !== null && $title->isSpecialPage() ? 'special_page' : 'embedded';

		// With no subpage, show a list of the Abstract Articles available in the
		// viewer's interface language, each linking to its preview, rather than an
		// error. (A future iteration may add a language picker and pagination, as
		// the reader can currently only browse the interface language's articles.)
		if ( !$subPage || !is_string( $subPage ) ) {
			$this->showTopicList( $startTime, $source );
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

			// Was a pre-rendered section available in the store, or did we fall back to a placeholder?
			// Grafana: mediawiki.WikiLambda.aw_preview_section_total{locale=…, source=…, outcome=…}
			// locale and source are the same for all outcomes; only outcome varies
			$sectionCounter = $this->statsFactory->getCounter( 'aw_preview_section_total' )
				->setLabel( 'locale', $locale )
				->setLabel( 'source', $source );
			// Always record total so ratios (ok/total, missing/total) can be calculated in Grafana
			$sectionCounter->setLabel( 'outcome', 'total' )->increment();
			if ( $awSection === null ) {
				$hasMissingSections = true;
				$sectionCounter->setLabel( 'outcome', 'missing' )->increment();
			} else {
				$fragmentStatus = $awSection->getFragmentStatus();
				// Map each section-level outcome to whether this section meets that condition
				$sectionOutcomes = [
					'incomplete' => $fragmentStatus['pending'] > 0,
					'failed'     => $fragmentStatus['failed'] > 0,
					'stale'      => $fragmentStatus['stale'] > 0,
				];

				if ( !array_filter( $sectionOutcomes ) ) {
					// No issues found: record ok so we have a healthy baseline to compare against
					$sectionCounter->setLabel( 'outcome', 'ok' )->increment();
				} else {
					// A section can be incomplete, failed, and stale at the same time;
					// each condition is recorded separately so Grafana can filter independently
					foreach ( $sectionOutcomes as $outcome => $hasIssue ) {
						if ( $hasIssue ) {
							$sectionCounter->setLabel( 'outcome', $outcome )->increment();
						}
					}
				}

				// Fragment-level counts tracked separately so they don't mix with section counts above
				// Grafana: mediawiki.WikiLambda.aw_preview_fragment_total{locale=…, source=…, status=…}
				$fragmentCounter = $this->statsFactory->getCounter( 'aw_preview_fragment_total' )
					->setLabel( 'locale', $locale )
					->setLabel( 'source', $source );
				foreach ( $fragmentStatus as $status => $count ) {
					if ( $count > 0 ) {
						$fragmentCounter->setLabel( 'status', $status )->incrementBy( $count );
					}
				}
			}

			// Transform into Html the retrieved section or an empty one (with the right section title)
			$sectionHtml = $awSection === null ?
				AWSection::emptyWikiSection( $sectionIndex, $sectionTitle, $sectionQid, $userdatetime ) :
				$awSection->asWikiSection( $sectionIndex, $sectionTitle );

			$articleHtml .= HtmlArmor::getHtml( $sectionHtml );
		}

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
	 * Render the landing state shown when no topic Qid is requested: a list of the
	 * Abstract Articles available in the viewer's interface language, each linking to
	 * its preview. When none are available in that language, show which languages do
	 * have content so the reader can switch to one of them.
	 *
	 * The candidate topics come from the WikiLambdaAbstractWikiAllowedTopics allow
	 * list rather than the article store, because the store has no enumeration API
	 * (and its default MainStash backend cannot be enumerated by design); per-topic
	 * readiness and languages come from each topic's stored metadata.
	 *
	 * @param float $startTime
	 * @param string $source
	 */
	private function showTopicList( float $startTime, string $source ): void {
		$langCode = $this->getLanguage()->getCode();
		$output = $this->getOutput();

		$allowedTopics = $this->getConfig()->has( 'WikiLambdaAbstractWikiAllowedTopics' ) ?
			$this->getConfig()->get( 'WikiLambdaAbstractWikiAllowedTopics' ) :
			[];

		$available = [];
		$otherLangs = [];
		foreach ( $allowedTopics as $topicQid ) {
			$metadata = $this->articleStore->getArticleMetadata( $topicQid );
			// A topic with no metadata has not been pre-generated yet; skip it.
			if ( !$metadata ) {
				continue;
			}
			$renderedLangs = $metadata->getRenderedLanguages();
			if ( in_array( $langCode, $renderedLangs, true ) ) {
				$available[] = [
					'qid' => $topicQid,
					'label' => $this->entityLookup->resolveAbstractLabel( $topicQid, $langCode ) ?? $topicQid,
					'lastUpdated' => $metadata->getLastUpdated(),
				];
			} else {
				// Not in this language, but track the languages it does have for the fallback below.
				$otherLangs = array_merge( $otherLangs, $renderedLangs );
			}
		}

		$output->setPageTitle(
			$this->msg( 'wikilambda-abstract-special-preview-list-title' )
				->params( $this->languageLabel( $langCode ) )
				->text()
		);

		$output->addHTML( $available === [] ?
			$this->getTopicListEmptyState( $langCode, $otherLangs ) :
			$this->getTopicListBody( $langCode, $available )
		);

		$this->recordRenderTiming( $startTime, $langCode, $source, 'topic_list' );
	}

	/**
	 * Build the list of Abstract Articles available in the given language, linked to
	 * their previews and ordered by label.
	 *
	 * @param string $langCode
	 * @param array[] $available List of [ 'qid' => string, 'label' => string, 'lastUpdated' => ConvertibleTimestamp ]
	 * @return string
	 */
	private function getTopicListBody( string $langCode, array $available ): string {
		$lang = $this->getLanguage();

		// Order by label, case-insensitively, for a stable presentation.
		usort( $available, static fn ( $a, $b ) => strcasecmp( $a['label'], $b['label'] ) );

		$linkRenderer = $this->getLinkRenderer();
		$items = '';
		foreach ( $available as $topic ) {
			$link = $linkRenderer->makeKnownLink(
				$this->getPageTitle( "$langCode/{$topic['qid']}" ),
				$topic['label']
			);
			$details = $this->msg( 'wikilambda-abstract-special-preview-list-item-details' )
				->params( $topic['qid'], $lang->userDate( $topic['lastUpdated'], $this->getUser() ) )
				->escaped();
			$items .= Html::rawElement( 'li', [], "$link $details" );
		}

		$intro = Html::rawElement( 'p', [],
			$this->msg( 'wikilambda-abstract-special-preview-list-intro' )->escaped()
		);
		return $intro . Html::rawElement( 'ul', [], $items );
	}

	/**
	 * Build the empty landing state: no Abstract Articles in the requested language,
	 * plus links to switch to any language that does have content.
	 *
	 * @param string $langCode
	 * @param string[] $otherLangs Rendered-language codes gathered from topics unavailable in $langCode
	 * @return string
	 */
	private function getTopicListEmptyState( string $langCode, array $otherLangs ): string {
		$html = Html::rawElement( 'p', [],
			$this->msg( 'wikilambda-abstract-special-preview-list-none' )
				->params( $this->languageLabel( $langCode ) )
				->escaped()
		);

		$otherLangs = array_values( array_unique( $otherLangs ) );
		if ( $otherLangs === [] ) {
			return $html;
		}

		// Each language links back to this page with ?uselang=, re-rendering the list
		// in that language (getLanguage() honours uselang), so no extra route is needed.
		$linkRenderer = $this->getLinkRenderer();
		$langLinks = [];
		foreach ( $otherLangs as $code ) {
			$langLinks[] = $linkRenderer->makeKnownLink(
				$this->getPageTitle(),
				$this->languageLabel( $code ),
				[],
				[ 'uselang' => $code ]
			);
		}

		return $html . Html::rawElement( 'p', [],
			$this->msg( 'wikilambda-abstract-special-preview-list-other-langs' )
				->rawParams( $this->getLanguage()->listToText( $langLinks ) )
				->escaped()
		);
	}

	/**
	 * Human-readable name for a language code, falling back to the code itself when
	 * MediaWiki has no name for it (e.g. a well-formed but undefined BCP-47 variant
	 * such as "en-us", for which getLanguageName() returns an empty string).
	 *
	 * @param string $code
	 * @return string
	 */
	private function languageLabel( string $code ): string {
		return $this->languageNameUtils->getLanguageName( $code ) ?: $code;
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
	 * @param string $targetQid
	 * @return string
	 */
	private function getOptInCallToAction( $targetQid ): string {
		// Only show provenance and opt-in/opt-out notices in AbstractClient mode.
		if ( !$this->integrationEnabled() ) {
			return '';
		}

		$primaryTitle = $this->findPrimaryTitle( $targetQid );

		// Whether the viewer may change opt-in status. The actionable "show/stop showing this
		// page to readers" links are only useful to, and only shown to, such users; but the
		// "this Abstract Article powers the article X" notice is public provenance, so gate the
		// call-to-action links on their own rather than bailing out of the whole method (which
		// previously hid the provenance notice from anonymous readers too).
		$canManageOptIn = $this->getUser()->isAllowed( 'wikilambda-abstract-optin' );

		// On the article page itself the "powers the article X" notice is redundant — the reader
		// is already there — so it is only emitted on Special:PreviewAbstract.
		$isSpecialPage = $this->getContext()->getTitle()->isSpecialPage();

		$parts = [];

		// Public provenance: which local article this preview powers.
		if ( $primaryTitle !== null && $isSpecialPage ) {
			$parts[] = $this->msg( 'wikilambda-abstract-special-preview-optedin-notice', $primaryTitle )->parse();
		}

		// Opt-in management call to action, shown only to users who can change opt-in status.
		if ( $canManageOptIn ) {
			if ( $primaryTitle === null ) {
				$parts[] = $this->msg( 'wikilambda-abstract-special-preview-optedout-notice' )->parse();
				$parts[] = $this->msg( 'wikilambda-abstract-special-preview-optin-cta' )->parse();
			} else {
				$parts[] = $this->msg( 'wikilambda-abstract-special-preview-optout-cta' )->parse();
			}
		}

		if ( $parts === [] ) {
			return '';
		}

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
