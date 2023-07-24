<?php

namespace MediaWiki\Extension\WikiLambda\HookHandler;

use HtmlArmor;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Hook\SkinTemplateNavigation__UniversalHook;
use MediaWiki\Hook\WebRequestPathInfoRouterHook;
use MediaWiki\Linker\Hook\HtmlPageLinkRendererEndHook;
use MediaWiki\Linker\LinkRenderer;
use MediaWiki\Linker\LinkTarget;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\Title\Title;
use RequestContext;

class PageRenderingHandler implements
	HtmlPageLinkRendererEndHook,
	SkinTemplateNavigation__UniversalHook,
	WebRequestPathInfoRouterHook
{

	// phpcs:disable MediaWiki.NamingConventions.LowerCamelFunctionsName.FunctionName

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/SkinTemplateNavigation::Universal
	 *
	 * @inheritDoc
	 */
	public function onSkinTemplateNavigation__Universal( $skinTemplate, &$links ): void {
		$targetTitle = $skinTemplate->getRelevantTitle();
		if ( !$targetTitle->hasContentModel( CONTENT_MODEL_ZOBJECT ) ) {
			// Nothing to do, exit.
			return;
		}

		// Don't show a "View source" link, it's meaningless for our content type
		unset( $links['views']['viewsource'] );

		// Don't show a "Variants" selector even though we're futzing with lang, we have our own control
		$links['variants'] = [];

		// Work out our ZID
		$zid = $targetTitle->getText();
		// Default language if not specified in the URL
		$lang = 'en';

		// Special handling if we're on our special view page
		$title = $skinTemplate->getTitle();
		if ( $title->isSpecial( 'ViewObject' ) ) {
			preg_match( "/^([^\/]+)\/([^\/]+)\/(.*)$/", $title->getText(), $matches );
			if ( $matches ) {
				// We're on Special:ViewObject with the ZID and language set in the URL, so use them
				$lang = $matches['2'];
				$zid = $matches['3'];
			}
		}

		// Allow the user to over-ride the content language if explicitly requested
		$lang = $skinTemplate->getRequest()->getRawVal( 'uselang' ) ?? $lang;

		// Add "selected" class to read tab
		$links['views']['view']['class'] = 'selected';

		// Rewrite history link to have ?uselang in it
		$links['views']['history']['href'] = '/wiki/' . $zid . '?action=history&uselang=' . $lang;
		// Rewrite history link to have ?uselang in it, but only if it exists (e.g. not for logged-out users)
		if ( array_key_exists( 'edit', $links['views'] ) ) {
			$links['views']['edit']['href'] = '/wiki/' . $zid . '?action=edit&uselang=' . $lang;
		}

		// Rewrite the 'main' namespace link to the Special page
		// We have to set under 'namespaces' and 'associated-pages' due to a migration.
		$contentCanonicalHref = '/view/' . $lang . '/' . $zid;
		$links['namespaces']['main']['href'] = $contentCanonicalHref;
		$links['associated-pages']['main']['href'] = $contentCanonicalHref;

		// Re-write the 'view' link as well
		$links['views']['view']['href'] = $contentCanonicalHref;

		// Rewrite the 'talk' namespace link to have ?uselang in it
		// Again, we have to set it twice
		if ( strpos( $links['namespaces']['talk']['class'] ?? '', '?' ) ) {
			$talkRewrittenHref = '/wiki/Talk:' . $zid . '?uselang=' . $lang;
		} else {
			// @phan-suppress-next-next-line PhanTypeArraySuspiciousNull, PhanTypeInvalidDimOffset
			// @phan-suppress-next-line PhanTypeSuspiciousStringExpression
			$talkRewrittenHref = $links['namespaces']['talk']['href'] . '&uselang=' . $lang;
		}

		$links['namespaces']['talk']['href'] = $talkRewrittenHref;
		$links['associated-pages']['talk']['href'] = $talkRewrittenHref;

		// Add a language control to the page, for users to change the content language
		$ourButton = [ 'wikifunctions-language' => [
			'button' => true,
			'icon' => 'wikimedia-language',
			'id' => 'ext-wikilambda-pagelanguagebutton',
			'text' => MediaWikiServices::getInstance()->getLanguageNameUtils()->getLanguageName( $lang ),
			'active' => false,
			'link-class' => [ 'wikifunctions-trigger' ],
			// Add a nonsense destination for non-JS users
			'href' => '#'
		] ];
		$links['user-interface-preferences'] = $ourButton + $links['user-interface-preferences'];
	}

	// phpcs:enable MediaWiki.NamingConventions.LowerCamelFunctionsName.FunctionName

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/HtmlPageLinkRendererEnd
	 *
	 * @param LinkRenderer $linkRenderer
	 * @param LinkTarget $linkTarget
	 * @param bool $isKnown
	 * @param string|HtmlArmor &$text
	 * @param string[] &$attribs
	 * @param string &$ret
	 * @return bool|void
	 */
	public function onHtmlPageLinkRendererEnd(
		$linkRenderer, $linkTarget, $isKnown, &$text, &$attribs, &$ret
	) {
		$context = RequestContext::getMain();
		$out = $context->getOutput();

		// Do nothing if any of these apply:
		if (
			// … there's no title in the main context
			!$context->hasTitle()
			// … there's no title set for the output page
			|| !$out->getTitle()
			// … the request is via the API (except for test runs)
			|| ( defined( 'MW_API' ) && MW_API !== 'TEST' )
			// … the target isn't known
			|| !$isKnown
		) {
			return;
		}

		// Convert the slimline LinkTarget into a full-fat Title so we can ask deeper questions
		$targetTitle = Title::newFromLinkTarget( $linkTarget );

		// Do nothing if any of these apply:
		if (
			// … the target isn't one of ours
			!$targetTitle->inNamespace( NS_MAIN ) || !$targetTitle->hasContentModel( CONTENT_MODEL_ZOBJECT )
			// … the label is already over-ridden (e.g. for "prev" and "cur" and revision links on history pages)
			|| ( $text !== null && $targetTitle->getFullText() !== HtmlArmor::getHtml( $text ) )
		) {
			return;
		}

		$zObjectStore = WikiLambdaServices::getZObjectStore();

		// Rather than (rather expensively) fetching the whole object from the ZObjectStore, see if the labels are in
		// the labels table already, which is very much faster:
		$zLangRegistry = ZLangRegistry::singleton();
		$zid = $targetTitle->getBaseText();

		// TODO: Inject
		$config = MediaWikiServices::getInstance()->getMainConfig();

		// Re-write our path to include the content language
		// TODO (T338190): Do we need to make an exception for 'en' so there's a primary page?
		// (We don't want there to be linguistic primacy, but if we really have to…)
		$currentPageContentLanguageCode = $context->getLanguage()->getCode();
		$attribs['href'] = '/view/' . $currentPageContentLanguageCode . '/' . $attribs['title'];

		$logger = LoggerFactory::getInstance( 'WikiLambda' );
		$logger->warning( 'Called currentPageContentLanguageCode {attribs}', [
			'attribs' => var_export( $attribs, true ),
		] );

		$label = $zObjectStore->fetchZObjectLabel(
			$zid,
			$currentPageContentLanguageCode,
			true
		);

		// Just in case the database has no entry (e.g. the table is a millisecond behind or so), load the full object.
		if ( $label === null ) {
			$targetZObject = $zObjectStore->fetchZObjectByTitle( $targetTitle );
			// Do nothing if somehow after all that it's not loadable.
			if ( !$targetZObject || !( $targetZObject instanceof ZObjectContent ) || !$targetZObject->isValid() ) {
				return;
			}

			// At this point, we know they're linking to a ZObject page, so show a label, falling back
			// to English even if that's not in the language's fall-back chain.
			$label = $targetZObject->getLabels()
				->buildStringForLanguage( $context->getLanguage() )
				->fallbackWithEnglish()
				->placeholderForTitle()
				->getString() ?? '';
		}

		// (T342212) Wrap our ZID in an LTR-enforced <span> so it works OK in RTL environments
		$bidiWrappedZid = '<span dir="ltr">' . $zid . '</span>';

		// Finally, set the label of the link to the *un*escaped user-supplied label, see
		// https://www.mediawiki.org/wiki/Manual:Hooks/HtmlPageLinkRendererEnd
		//
		// &$text: the contents that the <a> tag should have; either a *plain, unescaped string* or a HtmlArmor object.
		//
		$text = new HtmlArmor(
			htmlspecialchars( $label )
				. $context->msg( 'word-separator' )->escaped()
				. $context->msg( 'parentheses', [ $bidiWrappedZid ] )
		);
	}

	/**
	 * @inheritDoc
	 */
	public function onWebRequestPathInfoRouter( $router ) {
		$router->addStrict(
			'/view/$2/$1',
			[ 'title' => 'Special:ViewObject/$2/$1' ]
		);
	}
}
