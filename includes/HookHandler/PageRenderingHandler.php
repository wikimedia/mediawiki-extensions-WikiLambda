<?php
/**
 * WikiLambda handler for hooks which alter page rendering
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\HookHandler;

use HtmlArmor;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Hook\SkinTemplateNavigation__UniversalHook;
use MediaWiki\Hook\WebRequestPathInfoRouterHook;
use MediaWiki\Linker\Hook\HtmlPageLinkRendererEndHook;
use MediaWiki\Linker\LinkRenderer;
use MediaWiki\Linker\LinkTarget;
use MediaWiki\MediaWikiServices;
use MediaWiki\Output\Hook\BeforePageDisplayHook;
use MediaWiki\Output\OutputPage;
use MediaWiki\Title\Title;
use Skin;

class PageRenderingHandler implements
	HtmlPageLinkRendererEndHook,
	SkinTemplateNavigation__UniversalHook,
	WebRequestPathInfoRouterHook,
	BeforePageDisplayHook
{

	// phpcs:disable MediaWiki.NamingConventions.LowerCamelFunctionsName.FunctionName

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/SkinTemplateNavigation::Universal
	 *
	 * @inheritDoc
	 */
	public function onSkinTemplateNavigation__Universal( $skinTemplate, &$links ): void {
		$targetTitle = $skinTemplate->getRelevantTitle();

		// For any page: Add a language control, for users to navigate to another language.
		// TODO: this only works for browsers with Javascript. The button is invisible until
		// the ext.wikilambda.languageselector module creates the Vue component to replace it.
		$ourButton = [ 'wikifunctions-language' => [
			'button' => true,
			'id' => 'ext-wikilambda-pagelanguagebutton',
			'text' => '',
			'active' => false,
			'link-class' => [ 'wikifunctions-trigger' ],
			'href' => '#'
		] ];
		$links['user-interface-preferences'] = $ourButton + $links['user-interface-preferences'];

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

		// Add "selected" class to read tab, if we're viewing the page
		if (
			$skinTemplate->getContext()->getActionName() === 'view'
		) {
			$links['views']['view']['class'] = 'selected';
		}

		// Rewrite history link to have ?uselang in it
		$links['views']['history']['href'] = '/wiki/' . $zid . '?action=history&uselang=' . $lang;
		// Rewrite history link to have ?uselang in it, but only if it exists (e.g. not for logged-out users)
		if ( array_key_exists( 'edit', $links['views'] ) ) {
			$links['views']['edit']['href'] = '/wiki/' . $zid . '?action=edit&uselang=' . $lang;
			// If editing old revision, we want the edit button to route us to the oldid
			$oldid = $skinTemplate->getRequest()->getRawVal( 'oldid' );
			if ( $oldid ) {
				$links['views']['edit']['href'] .= '&oldid=' . $oldid;
			}
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
		if ( strpos( $links['namespaces']['talk']['href'] ?? '', '?' ) ) {
			// @phan-suppress-next-next-line PhanTypeArraySuspiciousNull, PhanTypeInvalidDimOffset
			// @phan-suppress-next-line PhanTypeSuspiciousStringExpression
			$talkRewrittenHref = $links['namespaces']['talk']['href'] . '&uselang=' . $lang;
		} else {
			$talkRewrittenHref = '/wiki/Talk:' . $zid . '?uselang=' . $lang;
		}

		$links['namespaces']['talk']['href'] = $talkRewrittenHref;
		$links['associated-pages']['talk']['href'] = $talkRewrittenHref;
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
		// Convert the slimline LinkTarget into a full-fat Title so we can ask deeper questions
		$targetTitle = Title::newFromLinkTarget( $linkTarget );
		$zid = $targetTitle->getBaseText();

		// Do nothing if the target isn't one of ours
		if (
			!$targetTitle->inNamespace( NS_MAIN )
			|| !$targetTitle->hasContentModel( CONTENT_MODEL_ZOBJECT )
			|| !ZObjectUtils::isValidZObjectReference( $zid )
		) {
			return;
		}

		$context = RequestContext::getMain();
		$currentPageContentLanguageCode = $context->getLanguage()->getCode();
		// (T357702) If we don't know the language code, fall back to Z1002/'en'
		$langRegistry = ZLangRegistry::singleton();
		if ( !$langRegistry->isLanguageKnownGivenCode( $currentPageContentLanguageCode ) ) {
			$currentPageContentLanguageCode = 'en';
		}

		// Re-write our path to include the content language ($attribs['href']) where appropriate
		// HACK: Our hook doesn't tell us properly that the target is an action, so we have to pull it from the href
		// … we could get $query from using HtmlPageLinkRendererBefore, but then we don't have access to the href
		$queryPos = strpos( $attribs['href'], '?' );
		$query = $queryPos ? wfCgiToArray( substr( $attribs['href'], $queryPos + 1 ) ) : [];

		$action = $query['action'] ?? 'view';
		if ( $action !== 'view' ) {
			$attribs['href'] = '/wiki/' . $zid . '?action=' . $action . '&uselang='
				. $currentPageContentLanguageCode . '&';
		} elseif ( !isset( $query[ 'diff'] ) && !isset( $query['oldid'] ) ) {
			$attribs['href'] = '/view/' . $currentPageContentLanguageCode . '/' . $zid . '?';
		} else {
			$attribs['href'] = '/wiki/' . $zid . '?uselang=' . $currentPageContentLanguageCode . '&';
		}

		unset( $query['action'] );
		unset( $query['title'] );

		foreach ( $query as $key => $value ) {
			$attribs['href'] .= $key . '=' . $value . '&';
		}
		$attribs['href'] = substr( $attribs['href'], 0, -1 );

		// **After this point, the only changes we're making are to the label ($text)**

		// (T342212) Wrap our ZID in an LTR-enforced <span> so it works OK in RTL environments
		$bidiWrappedZid = '<span dir="ltr">' . $zid . '</span>';

		// Special handling for unknown (red) links; we want to add the wrapped ZID but don't want to try to fetch
		// the label, which will fail
		if ( !$isKnown && $text === $zid ) {
			$text = new HtmlArmor( $bidiWrappedZid );
			return;
		}

		// We don't re-write the label if the label is already set (e.g. for "prev" and "cur" and revision links on
		// history pages, or inline links like [[Z1|this]]); we do however continue for
		if ( $text !== null && $targetTitle->getFullText() !== HtmlArmor::getHtml( $text ) ) {
			return;
		}

		// Rather than (rather expensively) fetching the whole object from the ZObjectStore, see if the labels are in
		// the labels table already, which is very much faster:
		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$label = $zObjectStore->fetchZObjectLabel(
			$zid,
			$currentPageContentLanguageCode,
			true
		);

		// Just in case the database has no entry (e.g. the table is a millisecond behind or so), load the full object.
		if ( $label === null ) {
			$targetZObject = $zObjectStore->fetchZObjectByTitle( $targetTitle );
			// Do nothing if somehow after all that it's not loadable
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

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/BeforePageDisplay
	 *
	 * @param OutputPage $out
	 * @param Skin $skin
	 * @return void
	 */
	public function onBeforePageDisplay( $out, $skin ): void {
		// Save language name in global variables, needed for language selector module
		$languageNameUtils = MediaWikiServices::getInstance()->getLanguageNameUtils();
		$userLang = $out->getLanguage();
		$userLangName = $languageNameUtils->getLanguageName( $userLang->getCode() );
		$out->addJsConfigVars( 'wgUserLanguageName', $userLangName );

		// Add language selector module to all pages
		$out->addModules( 'ext.wikilambda.languageselector' );
	}
}
