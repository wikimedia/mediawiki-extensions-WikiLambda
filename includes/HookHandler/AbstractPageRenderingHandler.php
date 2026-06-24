<?php
/**
 * WikiLambda handler for rendering an Abstract Wikipedia powered page in a client Wiki
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\HookHandler;

use MediaWiki\Config\Config;
use MediaWiki\Context\DerivativeContext;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentUtils;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiConfigProvider;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore;
use MediaWiki\Hook\InitializeArticleMaybeRedirectHook;
use MediaWiki\Hook\SidebarBeforeOutputHook;
use MediaWiki\Hook\TitleIsAlwaysKnownHook;
use MediaWiki\Html\Html;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\Output\OutputPage;
use MediaWiki\Page\Article;
use MediaWiki\Page\Hook\Article__MissingArticleConditionsHook;
use MediaWiki\Page\Hook\BeforeDisplayNoArticleTextHook;
use MediaWiki\Page\Hook\ShowMissingArticleHook;
use MediaWiki\Parser\ParserOutputFlags;
use MediaWiki\Request\WebRequest;
use MediaWiki\Skin\Hook\SkinAddFooterLinksHook;
use MediaWiki\Skin\Hook\SkinTemplateNavigation__UniversalHook;
use MediaWiki\Skin\Skin;
use MediaWiki\SpecialPage\SpecialPageFactory;
use MediaWiki\Title\Title;
use MediaWiki\Title\TitleFactory;
use Psr\Log\LoggerInterface;

class AbstractPageRenderingHandler implements
	ShowMissingArticleHook,
	Article__MissingArticleConditionsHook,
	BeforeDisplayNoArticleTextHook,
	InitializeArticleMaybeRedirectHook,
	SkinAddFooterLinksHook,
	SkinTemplateNavigation__UniversalHook,
	SidebarBeforeOutputHook,
	TitleIsAlwaysKnownHook
{

	private LoggerInterface $logger;
	private ?array $optedInCache = null;

	private const AW_OPTEDIN_PROVIDER_ID = 'AbstractWikiOptedInArticles';

	public function __construct(
		private readonly Config $config,
		private readonly SpecialPageFactory $specialPageFactory,
		private readonly TitleFactory $titleFactory,
		private readonly AWArticleStore $articleStore,
		private readonly AbstractWikiConfigProvider $awConfigProvider
	) {
		// Non-injected items
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaAbstractClient' );
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
		return $this->config->get( 'WikiLambdaEnableAbstractClientMode' ) &&
			$this->config->get( 'WikiLambdaEnableAbstractClientModeIntegration' );
	}

	/**
	 * Extract the Abstract Wikipedia topic QID for an Abstract Content surface from its Title:
	 * the final path segment of a Special:PreviewAbstract subpage (…/<lang>/<qid> or …/<qid>),
	 * or the opted-in QID of an integrated local article. Returns null if neither yields a
	 * well-formed Wikidata item reference.
	 *
	 * @param Title $title
	 * @return ?string
	 */
	private function getTopicQidFromTitle( Title $title ): ?string {
		if ( $title->isSpecial( 'PreviewAbstract' ) ) {
			$parts = explode( '/', $title->getSubpageText() );
			$topicQid = end( $parts );
		} else {
			$optedIn = $this->awConfigProvider->provideOptedIn();
			$topicQid = $optedIn[ $title->getPrefixedText() ][ 'qid' ] ?? '';
		}

		return AbstractContentUtils::isValidWikidataItemReference( $topicQid ) ? $topicQid : null;
	}

	/**
	 * Determine if the current view is one on which tabs should be shown.
	 *
	 * @param Title $title
	 * @return bool
	 */
	private function isViewOnWhichToShowTabs( Title $title ): bool {
		if ( $title->isSpecial( 'PreviewAbstract' ) ) {
			if ( !$this->config->get( 'WikiLambdaEnableAbstractClientMode' ) ) {
				return false;
			}
		} elseif ( !$this->integrationEnabled() ) {
			return false;
		}
		return true;
	}

	/**
	 * Treat an opted-in integrated Abstract Wikipedia article as a known page, so that wiki links
	 * to it (e.g. [[Douglas Adams]]) and the subject tab on its talk page render blue rather than
	 * as redlinks — even though no local revision exists. Its content is synthesised from the
	 * remote topic by onShowMissingArticle(), so "known but not existing" is the correct state:
	 * the page reads as present, while action=edit still offers local creation.
	 *
	 * This hook fires for every title whose known-ness is tested (notably once per link via
	 * LinkBatch), so the body must stay cheap: integrationEnabled() is two config reads and
	 * provideOptedIn() is process-cached, leaving an O(1) array lookup on the hot path.
	 *
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/TitleIsAlwaysKnown
	 *
	 * @param Title $title
	 * @param bool|null &$isKnown Set to true to force the title to be considered known
	 */
	public function onTitleIsAlwaysKnown( $title, &$isKnown ): void {
		// Respect a decision already made by core or another handler.
		if ( $isKnown !== null || !$this->integrationEnabled() ) {
			return;
		}

		// Integrated content only lives in the main namespace; this guard also cheaply rejects the
		// Talk:/File:/Template: etc. links that make up much of a page's link set before consulting
		// the opted-in map.
		if ( !$title->inNamespace( NS_MAIN ) ) {
			return;
		}

		if ( array_key_exists( $title->getPrefixedText(), $this->awConfigProvider->provideOptedIn() ) ) {
			$isKnown = true;
		}
	}

	/**
	 * Called when generating the output for a non-existent page.
	 *
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/ShowMissingArticle
	 * @param Article $article
	 */
	public function onShowMissingArticle( $article ): void {
		if ( !$this->integrationEnabled() ) {
			// True or no return to continue
			return;
		}

		$title = $article->getTitle();

		// TODO: is NS_MAIN enough as a filter? Do we want to only limit AW articles
		// to titles without prefix?
		if ( $title->getNamespace() !== NS_MAIN ) {
			return;
		}

		$output = $article->getContext()->getOutput();

		// We need to see if this page has opted-in AW content in the local wiki (CommunityConfiguration)
		// If so, we need to render the Special:Preview page content
		$titleText = $title->getBaseText();
		$optedIn = $this->awConfigProvider->provideOptedIn();

		if ( !array_key_exists( $titleText, $optedIn ) ) {
			// TODO Opt-in is descoped
			return;
		}

		$optedInArticle = $optedIn[ $titleText ];
		$topicQid = $optedInArticle[ 'qid' ];

		// Handle redirect on source:
		$redirect = $optedInArticle[ 'redirect' ];
		if ( $redirect !== false ) {
			$targetTitle = $this->titleFactory->newFromText( $redirect );

			// Pass redirect source as session parameter?
			$request = $article->getContext()->getRequest();
			$request->getSession()->set( 'awRedirectedFrom', $title->getPrefixedDBkey() );
			$targetUrl = $targetTitle->getFullURL();

			$output->redirect( $targetUrl );
			return;
		}

		// (T422707) Note: external-indexability metadata (canonical URL, indexable robots policy,
		// hreflang alternates, 200 status) is emitted in onBeforeDisplayNoArticleText(), not here.
		// Article::showMissingArticle() applies the nonexistent-page robots policy and 404 status
		// *after* this hook but *before* that one, so anything set here would be overwritten.

		// Build another output page to capture the special page HTML
		$specialContext = new DerivativeContext( $article->getContext() );
		$specialOutput = new OutputPage( $specialContext );
		$specialContext->setOutput( $specialOutput );

		// Build, setup context and execute special page; output will be in $specialOutput
		$specialPage = $this->specialPageFactory->getPage( 'PreviewAbstract' );
		$specialPage->setContext( $specialContext );
		$specialPage->execute( $topicQid );

		// Get the captured HTML and add it to the real output
		$output->addModuleStyles( [ 'ext.wikilambda.viewpage.styles' ] );
		$output->addHTML( $specialOutput->getHTML() );
	}

	/**
	 * Determine whether an opted-in secondary title is a redirect to an opted-in primary one.
	 *
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/InitializeArticleMaybeRedirect
	 *
	 * @param Title $title Title object for the current page
	 * @param WebRequest $request
	 * @param bool &$ignoreRedirect When set to true, the title will not redirect.
	 * @param Title|string &$target Set to an URL to do a HTTP redirect, or a Title to
	 *   use that title instead of the original, without doing a HTTP redirect.
	 * @param Article &$article The Article object that belongs to $title. Passed as a reference
	 *   for legacy reasons, but should not be changed.
	 * @return bool|void True or no return value to continue or false to abort
	 */
	public function onInitializeArticleMaybeRedirect(
		$title,
		$request,
		&$ignoreRedirect,
		&$target,
		&$article
	) {
		if ( !$this->integrationEnabled() ) {
			// True or no return to continue
			return;
		}

		// Exit if this page doesn't contain AW content
		$optedIn = $this->awConfigProvider->provideOptedIn();
		if ( !array_key_exists( $title->getBaseText(), $optedIn ) ) {
			// True or no return to continue
			return;
		}

		// Handle redirect:
		// Find redirect source from the session
		$redirectSource = $request->getSession()->get( 'awRedirectedFrom' );
		if ( $redirectSource ) {
			$request->getSession()->remove( 'awRedirectedFrom' );
			$sourceTitle = $this->titleFactory->newFromText( $redirectSource );
			if ( $sourceTitle ) {
				$article->setRedirectedFrom( $sourceTitle );
			}
		}
	}

	/**
	 * When an article has been deleted but is an AW article opt-in (so, displaying
	 * AW-generated content), we don't want to show the deletion history warning box.
	 *
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/Article::MissingArticleConditions
	 *
	 * @param array &$conds Array of query conditions (all of which have to be met;
	 *   conditions will AND in the final query)
	 * @param string[] $logTypes Array of log types being queried
	 * @return bool|void True or no return value to continue or false to abort
	 */
	public function onArticle__MissingArticleConditions( &$conds, $logTypes ) {
		if ( !$this->integrationEnabled() ) {
			// True or no return to continue
			return;
		}

		$context = RequestContext::getMain();
		$title = $context->getTitle();
		if ( !$title ) {
			return;
		}

		$optedIn = $this->awConfigProvider->provideOptedIn();
		if ( !array_key_exists( $title->getBaseText(), $optedIn ) ) {
			return;
		}

		$dbr = MediaWikiServices::getInstance()->getConnectionProvider()->getReplicaDatabase();
		foreach ( $logTypes as $logType ) {
			if ( $logType === 'delete' ) {
				$conds[] = $dbr->expr( 'log_action', '!=', 'delete' );
			}
		}
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/BeforeDisplayNoArticleText
	 * TODO (T411705): Add this for AbstractContent pages too, once we have an edit page for them
	 *
	 * @param Article $article
	 * @return bool
	 */
	public function onBeforeDisplayNoArticleText( $article ): bool {
		// If integration is disabled, return true and let other hooks do their thing
		if ( !$this->integrationEnabled() ) {
			return true;
		}

		// For AbstractClient mode:
		// See if this page is opt-in for an AW article, and remove page footer
		$titleText = $article->getTitle()->getBaseText();
		$optedIn = $this->awConfigProvider->provideOptedIn();

		if ( !array_key_exists( $titleText, $optedIn ) ) {
			return true;
		}

		// (T422707) Emit external-indexability metadata on the integrated article's real output so
		// crawlers index this local surface rather than the cross-wiki source. This must happen
		// here, not in onShowMissingArticle(): Article::showMissingArticle() applies the
		// nonexistent-page robots policy (noindex,nofollow) and 404 status *after* the
		// ShowMissingArticle hook but *before* this one, so anything set earlier is overwritten.
		// Redirect sources are HTTP-redirected before rendering a body of their own, so only the
		// canonical primary title carries these signals.
		$optedInArticle = $optedIn[ $titleText ];
		if ( $optedInArticle[ 'redirect' ] === false ) {
			$output = $article->getContext()->getOutput();
			$canonicalUrl = $article->getTitle()->getCanonicalURL();

			// The integrated article is a genuine 200 surface, not the bare 404 a missing page
			// would otherwise return; search engines won't index a 404 however its robots meta
			// reads, so override the status core set moments earlier.
			$article->getContext()->getRequest()->response()->statusHeader( 200 );

			// Force an indexable robots policy. noindex is deliberately "sticky" (T16899), so a
			// plain setIndexPolicy( 'index' ) is a no-op after core's noindex; we must clear the
			// NO_INDEX_POLICY flag first, exactly as the now-deprecated OutputPage::setIndexPolicy()
			// did internally, then set index,follow.
			$metadata = $output->getMetadata();
			$metadata->setOutputFlag( ParserOutputFlags::NO_INDEX_POLICY, false );
			$metadata->setIndexPolicy( 'index' );
			$output->setFollowPolicy( 'follow' );

			// Self-referential canonical at the local mainspace URL, resolved via the Title API so
			// it honours $wgArticlePath/$wgCanonicalServer and is properly percent-encoded.
			$output->setCanonicalUrl( $canonicalUrl );

			// An hreflang self-declaration for the rendered language...
			$output->addHeadItem( 'aw-hreflang-self', Html::element( 'link', [
				'rel' => 'alternate',
				'hreflang' => $output->getLanguage()->getHtmlCode(),
				'href' => $canonicalUrl,
			] ) );

			// ...plus an hreflang="mul" alternate pointing at the genuinely-multilingual source
			// topic on Abstract Wikipedia (ISO 639-2 "multiple languages", honoured by major search
			// engines). Built via the 'abstract' interwiki prefix to match the cross-wiki
			// tab/sidebar links and survive any relocation of the repo wiki.
			$output->addHeadItem( 'aw-hreflang-mul', Html::element( 'link', [
				'rel' => 'alternate',
				'hreflang' => 'mul',
				'href' => Title::makeTitle( NS_MAIN, $optedInArticle[ 'qid' ], '', 'abstract' )->getFullURL(),
			] ) );
		}

		// return false to not display the "no text" footer
		return false;
	}

	/**
	 * This hook is called when generating the code used to display the footer.
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/SkinAddFooterLinks
	 *
	 * @param Skin $skin
	 * @param string $key the current key for the current group (row) of footer links.
	 *   e.g. `info` or `places`.
	 * @param array &$footerItems an empty array that can be populated with new links.
	 *   keys should be strings and will be used for generating the ID of the footer item
	 *   and value should be an HTML string.
	 * @return bool|void True or no return value to continue or false to abort
	 */
	public function onSkinAddFooterLinks( Skin $skin, string $key, array &$footerItems ) {
		if ( $key === 'info' ) {
			$title = $skin->getTitle();

			// If not AbstractClient mode and not the Special:PreviewAbstract, exit early
			if (
				!$this->config->get( 'WikiLambdaEnableAbstractClientMode' ) &&
				!$title->isSpecial( 'PreviewAbstract' )
			) {
				// True or no return to continue
				return;
			}

			$topicQid = $this->getTopicQidFromTitle( $title );
			if ( $topicQid === null ) {
				// No topic Qid; either missing from the url or this article isn't in the optedIn list
				return;
			}

			$awMetadata = $this->articleStore->getArticleMetadata( $topicQid );
			if ( $awMetadata === null ) {
				// No available metadata, exit early
				return;
			}

			// Use lastRendered metadata key to get the last time it passed through the render script
			$lastRenderedTS = $awMetadata->getPayload()[ 'lastRendered' ] ?? null;
			if ( $lastRenderedTS ) {
				$language = $skin->getLanguage();
				$d = $language->userDate( $lastRenderedTS, $skin->getUser() );
				$t = $language->userTime( $lastRenderedTS, $skin->getUser() );
				$footerItems[ 'lastmod' ] = $skin->msg( 'wikilambda-abstract-lastupdatedat', $t, $d )->parse();
			}

			$footerItems[ 'renderedwith' ] = $skin->msg( 'wikilambda-abstract-renderedwith' )->parse();
		}
	}

	/**
	 * Synthesise article-like content-action tabs on Abstract Content surfaces, pointing the
	 * editing-related ones at the source article on Abstract Wikipedia.
	 *
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/SkinTemplateNavigation::Universal
	 *
	 * @param \MediaWiki\Skin\SkinTemplate $skinTemplate
	 * @param array &$links
	 */
	public function onSkinTemplateNavigation__Universal( $skinTemplate, &$links ): void {
		$title = $skinTemplate->getTitle();

		// Don't do anything if …
		if (
			// … there's no Title for this view (e.g. Special:Search)
			!$title ||
			// … the title is a real page that exists (as we won't take over)
			$title->exists() ||
			// … we wouldn't show tabs here
			!$this->isViewOnWhichToShowTabs( $title )
		) {
			return;
		}

		$topicQid = $this->getTopicQidFromTitle( $title );
		// This will only return null if the title is a Special:PreviewAbstract page with no QID in the URL, or an
		if ( $topicQid === null ) {
			return;
		}

		$langParams = [ 'uselang' => $skinTemplate->getLanguage()->getCode() ];

		// Cross-wiki link target of the Abstract Wikipedia page for a topic, its bare QID. This is
		// built via the 'abstract' interwiki prefix (a per-wiki interwiki-table entry) rather than
		// hard-coded URLs, to survive any future relocation of the repo wiki, and support tests.
		$awSubject = Title::makeTitle( NS_MAIN, $topicQid, '', 'abstract' );

		// Drop the actions that are meaningless for a read-only cross-wiki render. They should
		// not appear at all, rather than appearing disabled.
		unset(
			$links['views']['viewsource'],
			$links['actions']['delete'],
			$links['actions']['protect'],
			$links['actions']['unprotect'],
			$links['actions']['move'],
			$links['actions']['watch'],
			$links['actions']['unwatch']
		);

		// Ensure a local Read tab exists: Special pages have no content tabs of their own, while
		// an integrated article already has one pointing at the local page (which we leave alone).
		if ( !isset( $links['views']['view'] ) ) {
			$links['views']['view'] = [
				'class' => 'selected',
				'text' => $skinTemplate->msg( 'view' )->text(),
				'href' => $title->getLocalURL( $langParams ),
			];
		}

		// Off-wiki Edit and History tabs. Distinct keys from the native 'edit' tab, so a local
		// "Create local article" tab (added separately) can coexist on integrated pages.
		$links['views']['edit-abstract'] = [
			'class' => '',
			'text' => $skinTemplate->msg( 'wikilambda-abstract-tab-edit' )->text(),
			'href' => $awSubject->getFullURL( [ 'action' => 'edit' ] + $langParams ),
		];
		$links['views']['history-abstract'] = [
			'class' => '',
			'text' => $skinTemplate->msg( 'wikilambda-abstract-tab-history' )->text(),
			'href' => $awSubject->getFullURL( [ 'action' => 'history' ] + $langParams ),
		];

		// Add a local discussion page link
		$localTalkTitle = $title->getTalkPageIfDefined();
		if ( $localTalkTitle ) {
			$links['associated-pages']['talk'] = [
				'class' => ( $localTalkTitle->exists() ? '' : 'new' ),
				'text' => $skinTemplate->msg( 'talk' )->text(),
				'href' => $localTalkTitle->getLocalURL( $langParams ),
			];
		}

		// On an integrated local article (never the preview special page, which has no local
		// article of its own), relabel the skin's native create tab so it reads as creating a
		// *local* article rather than the generic "Create", keeping its local edit target.
		if ( !$title->isSpecial( 'PreviewAbstract' ) && isset( $links['views']['edit'] ) ) {
			$links['views']['edit']['text'] =
				$skinTemplate->msg( 'wikilambda-abstract-tab-createlocal' )->text();
		}
	}

	/**
	 * Point the "What links here" Tools-sidebar entry at the source article on Abstract Wikipedia.
	 *
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/SidebarBeforeOutput
	 *
	 * @param Skin $skin
	 * @param array &$sidebar
	 */
	public function onSidebarBeforeOutput( $skin, &$sidebar ): void {
		$title = $skin->getTitle();
		if ( !$title ) {
			return;
		}

		if ( !$this->isViewOnWhichToShowTabs( $title ) ) {
			return;
		}

		$topicQid = $this->getTopicQidFromTitle( $title );
		if ( $topicQid === null ) {
			return;
		}

		$awWhatLinksHere = Title::makeTitle( NS_SPECIAL, 'WhatLinksHere/' . $topicQid, '', 'abstract' );

		// Override the skin's local entry; "what links here" locally is meaningless for content
		// whose links live on Abstract Wikipedia.
		$sidebar['TOOLBOX']['whatlinkshere'] = [
			'text' => $skin->msg( 'whatlinkshere' )->text(),
			'href' => $awWhatLinksHere->getFullURL(),
			'id' => 't-whatlinkshere',
		];
	}
}
