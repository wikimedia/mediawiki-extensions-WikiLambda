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
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore;
use MediaWiki\Hook\InitializeArticleMaybeRedirectHook;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\Output\OutputPage;
use MediaWiki\Page\Article;
use MediaWiki\Page\Hook\Article__MissingArticleConditionsHook;
use MediaWiki\Page\Hook\BeforeDisplayNoArticleTextHook;
use MediaWiki\Page\Hook\ShowMissingArticleHook;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\Request\WebRequest;
use MediaWiki\Skin\Hook\SkinAddFooterLinksHook;
use MediaWiki\Skin\Skin;
use MediaWiki\SpecialPage\SpecialPageFactory;
use MediaWiki\Title\Title;
use MediaWiki\Title\TitleFactory;
use Psr\Log\LoggerInterface;
use Throwable;

class AbstractPageRenderingHandler implements
	ShowMissingArticleHook,
	Article__MissingArticleConditionsHook,
	BeforeDisplayNoArticleTextHook,
	InitializeArticleMaybeRedirectHook,
	SkinAddFooterLinksHook
{

	private LoggerInterface $logger;
	private ?array $optedInCache = null;

	private const AW_OPTEDIN_PROVIDER_ID = 'AbstractWikiOptedInArticles';

	public function __construct(
		private readonly Config $config,
		private readonly SpecialPageFactory $specialPageFactory,
		private readonly TitleFactory $titleFactory,
		private readonly AWArticleStore $articleStore
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
	 * Resolve a CommunityConfiguration-managed list of opted in articles
	 * provided by AbstractWikiOptedInArticles. The schema provides a list
	 * of items, each item containing a list of titles (where the first is the
	 * primary one) and their corresponding qid.
	 *
	 * The returned map should contain titles as the key, so that the different
	 * methods can cheaply consult the qid or redirect listed for the requested
	 * title.
	 *
	 * @see \MediaWiki\Extension\WikiLambda\Config\AbstractWikiOptedInArticlesSchema
	 *
	 * @return array
	 */
	private function provideOptedIn(): array {
		if ( $this->optedInCache !== null ) {
			return $this->optedInCache;
		}

		$this->optedInCache = [];

		if ( !ExtensionRegistry::getInstance()->isLoaded( 'CommunityConfiguration' ) ) {
			return $this->optedInCache;
		}

		try {
			$provider = MediaWikiServices::getInstance()
				->getService( 'CommunityConfiguration.ProviderFactory' )
				->newProvider( self::AW_OPTEDIN_PROVIDER_ID );
			$status = $provider->loadValidConfiguration();

			if ( $status->isOK() ) {
				$value = $status->getValue();
				$items = $value->OptedInArticles ?? [];

				foreach ( $items as $item ) {
					$titles = $item->title ?? [];

					if ( count( $titles ) === 0 || $titles[0] === null || trim( $titles[0] ) === '' ) {
						// This should not happen, log error and continue, we want to ignore
						// this item, but we also want to notice that there's a malformed item
						$this->logger->error(
							__METHOD__ . ': CommunityConfiguration provider {id} contains malformed item', [
								'id' => self::AW_OPTEDIN_PROVIDER_ID,
								'qid' => $item->qid,
								'title' => json_encode( $item->title )
							]
						);
						continue;
					}

					foreach ( $titles as $index => $title ) {
						$this->optedInCache[ $title ] = [
							'qid' => $item->qid,
							'redirect' => $index === 0 ? false : $titles[0]
						];
					}
				}
				return $this->optedInCache;
			}
		} catch ( Throwable $e ) {
			$this->logger->warning(
				__METHOD__ . ': CommunityConfiguration lookup for {id} failed: {msg}',
				[ 'id' => self::AW_OPTEDIN_PROVIDER_ID, 'msg' => $e->getMessage() ]
			);
		}

		return $this->optedInCache;
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
		$optedIn = $this->provideOptedIn();

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
		$optedIn = $this->provideOptedIn();
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

		// TODO: We are checking twice, can we set this finding somewhere? Where?
		$optedIn = $this->provideOptedIn();
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
		$optedIn = $this->provideOptedIn();

		if ( array_key_exists( $titleText, $optedIn ) ) {
			// return false to not display the footer "no text" footer
			return false;
		}

		return true;
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

			$topicQid = '';

			if ( $title->isSpecialPage() ) {
				// For Special Page (Special:PreviewAbstract), extract the topicQid from the subpage
				$parts = explode( '/', $title->getSubpageText() );
				$topicQid = end( $parts );
			} else {
				// For Article, extract the topicQid from the optedIn list
				$titleText = $title->getPrefixedText();
				$optedIn = $this->provideOptedIn();
				$topicQid = $optedIn[ $titleText ][ 'qid' ] ?? '';
			}

			if ( trim( $topicQid ) === '' || !AbstractContentUtils::isValidWikidataItemReference( $topicQid ) ) {
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
}
