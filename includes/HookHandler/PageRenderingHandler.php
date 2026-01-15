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

use MediaWiki\Config\Config;
use MediaWiki\Context\IContextSource;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Html\Html;
use MediaWiki\Language\LanguageFactory;
use MediaWiki\Language\LanguageNameUtils;
use MediaWiki\Linker\LinkRenderer;
use MediaWiki\Linker\LinkTarget;
use MediaWiki\Output\OutputPage;
use MediaWiki\Page\Article;
use MediaWiki\Parser\Parser;
use MediaWiki\Parser\PPFrame;
use MediaWiki\Skin\Skin;
use MediaWiki\Title\Title;
use MediaWiki\User\Options\UserOptionsLookup;
use Wikimedia\HtmlArmor\HtmlArmor;

class PageRenderingHandler implements
	\MediaWiki\Skin\Hook\SkinTemplateNavigation__UniversalHook,
	\MediaWiki\Hook\WebRequestPathInfoRouterHook,
	\MediaWiki\Output\Hook\BeforePageDisplayHook,
	\MediaWiki\Page\Hook\BeforeDisplayNoArticleTextHook,
	\MediaWiki\Hook\GetMagicVariableIDsHook,
	\MediaWiki\Parser\Hook\ParserFirstCallInitHook,
	\MediaWiki\Parser\Hook\ParserGetVariableValueSwitchHook,
	\MediaWiki\Specials\Hook\SpecialStatsAddExtraHook
{
	private Config $config;
	private UserOptionsLookup $userOptionsLookup;
	private LanguageNameUtils $languageNameUtils;
	private LanguageFactory $languageFactory;
	private ZObjectStore $zObjectStore;

	public function __construct(
		Config $config,
		UserOptionsLookup $userOptionsLookup,
		LanguageNameUtils $languageNameUtils,
		LanguageFactory $languageFactory,
		ZObjectStore $zObjectStore
	) {
		$this->config = $config;
		$this->userOptionsLookup = $userOptionsLookup;
		$this->languageNameUtils = $languageNameUtils;
		$this->languageFactory = $languageFactory;
		$this->zObjectStore = $zObjectStore;
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/SkinTemplateNavigation::Universal
	 *
	 * @inheritDoc
	 */
	public function onSkinTemplateNavigation__Universal( $skinTemplate, &$links ): void {
		// We only do this in repo mode
		if ( !$this->config->get( 'WikiLambdaEnableRepoMode' ) ) {
			return;
		}

		// For any page in repo mode: Add a language control, for users to navigate to another language.
		// TODO (T362235): This only works for browsers with Javascript. The button is invisible
		// until the ext.wikilambda.languageselector module creates the Vue component to replace
		// it; instead, render this Codex component properly server-side somehow.
		$ourButton = [ 'wikifunctions-language' => [
			'button' => true,
			'id' => 'ext-wikilambda-language-selector',
			'text' => '',
			'active' => false,
			'link-class' => [ 'wikifunctions-trigger' ],
			'href' => '#'
		] ];
		$links['user-interface-preferences'] = $ourButton + $links['user-interface-preferences'];

		// The rest of this function is about rewriting skin links on ZObject pages
		$targetTitle = $skinTemplate->getRelevantTitle();

		if ( !$targetTitle || !$targetTitle->hasContentModel( CONTENT_MODEL_ZOBJECT ) ) {
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

		// (T374309) If the user is registered and has a language preference set, use that as the fallback
		if ( $skinTemplate->getUser()->isRegistered() ) {
			$lang = $this->userOptionsLookup->getOption( $skinTemplate->getUser(), 'language' );
		}

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

		// (T360229) Build GET parameters using an array and `wfArrayToCgi`, rather than hacking inline
		$generalParams = [ 'uselang' => $lang ];

		// Rewrite history link to have ?uselang in it
		$links['views']['history']['href'] = '/wiki/' . $zid
			. '?' . wfArrayToCgi( $generalParams + [ 'action' => 'history' ] );

		// Rewrite edit link to have ?uselang in it, but only if it exists (e.g. not for logged-out users)
		if ( array_key_exists( 'edit', $links['views'] ) ) {
			$editParams = $generalParams + [ 'action' => 'edit' ];

			// If editing old revision, we want the edit button to route us to the oldid
			$oldid = $skinTemplate->getRequest()->getRawVal( 'oldid' );
			if ( $oldid ) {
				$editParams['oldid'] = $oldid;
			}

			$links['views']['edit']['href'] = '/wiki/' . $zid
				. '?' . wfArrayToCgi( $editParams );
		}

		// Rewrite the 'main' namespace link to the Special page
		// We have to set under 'namespaces' and 'associated-pages' due to a migration in SkinTemplate.
		$contentCanonicalHref = '/view/' . $lang . '/' . $zid;
		$links['namespaces']['main']['href'] = $contentCanonicalHref;
		$links['associated-pages']['main']['href'] = $contentCanonicalHref;

		// Re-write the 'view' link as well
		$links['views']['view']['href'] = $contentCanonicalHref;

		// Rewrite the 'talk' namespace link to have ?uselang in it

		$talkParams = $generalParams;

		// Do some special magic if the href already has a query string, usually as it's a red link
		if ( strpos( $links['namespaces']['talk']['href'] ?? '', '?' ) ) {
			// We slice out the zeroth input, as it's the path
			$talkHrefArray = array_slice( wfCgiToArray( $links['namespaces']['talk']['href'] ?? '' ), 1 );
			$talkParams = $generalParams + $talkHrefArray;
		}
		$talkRewrittenHref = '/wiki/Talk:' . $zid . '?' . wfArrayToCgi( $talkParams );

		// Again, we have to set it twice due to the migration in SkinTemplate
		$links['namespaces']['talk']['href'] = $talkRewrittenHref;
		$links['associated-pages']['talk']['href'] = $talkRewrittenHref;
	}

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
		// We only do this in repo mode
		if ( !$this->config->get( 'WikiLambdaEnableRepoMode' ) ) {
			return;
		}

		// (T343483) We only do this work on special pages, like Special:Watchlist; we don't want to mess with the
		// wikitext content, partially because Parsoid-rendered HTML is incompatible with this hook.
		$context = RequestContext::getMain();
		if ( !$context->hasTitle() ) {
			return;
		}

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
		// HACK (T358789): Our hook doesn't tell us properly that the target is an action, so we have to pull it from
		// the href — we could get $query from HtmlPageLinkRendererBefore, but then we don't have access to the href
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
		$label = $this->zObjectStore->fetchZObjectLabel(
			$zid,
			$currentPageContentLanguageCode,
			true
		);

		// Just in case the database has no entry (e.g. the table is a millisecond behind or so), load the full object.
		if ( $label === null ) {
			$targetZObject = $this->zObjectStore->fetchZObjectByTitle( $targetTitle );
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
		// We only do this in repo mode
		if ( !$this->config->get( 'WikiLambdaEnableRepoMode' ) ) {
			return;
		}

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
		// We only do this in repo mode
		if ( !$this->config->get( 'WikiLambdaEnableRepoMode' ) ) {
			return;
		}

		// Save language name in global variables, needed for language selector module
		$userLang = $out->getLanguage();
		$userLangName = $this->languageNameUtils->getLanguageName( $userLang->getCode() );
		$out->addJsConfigVars( 'wgUserLanguageName', $userLangName );

		// Add language selector module to all pages
		$out->addModules( 'ext.wikilambda.languageselector' );
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/BeforeDisplayNoArticleText
	 *
	 * @param Article $article
	 * @return bool
	 */
	public function onBeforeDisplayNoArticleText( $article ): bool {
		// We only do this in repo mode
		if ( !$this->config->get( 'WikiLambdaEnableRepoMode' ) ) {
			return true;
		}

		$title = $article->getTitle();
		$zid = $title->getBaseText();

		// ignore if the article is not a z object
		if (
			!$title->inNamespace( NS_MAIN )
			|| !ZObjectUtils::isValidZObjectReference( $zid )
		) {
			return true;
		}

		$context = $article->getContext();

		$this->showMissingObject( $context );

		return false;
	}

	/**
	 * T342965: Show a message on object pages that don't have a result.
	 * @param IContextSource $context
	 *
	 * @return void
	 */
	private function showMissingObject( $context ): void {
		$text = wfMessage( 'wikilambda-noobject' )->setContext( $context )->plain();

		$dir = $context->getLanguage()->getDir();
		$lang = $context->getLanguage()->getHtmlCode();

		$outputPage = $context->getOutput();
		$outputPage->addWikiTextAsInterface( Html::rawElement( 'div', [
			'class' => "noarticletext mw-content-$dir",
			'dir' => $dir,
			'lang' => $lang,
		], "\n$text\n" ) );
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/GetMagicVariableIDs
	 *
	 * @param string[] &$variableIDs
	 * @return void
	 */
	public function onGetMagicVariableIDs( &$variableIDs ): void {
		$variableIDs[] = 'magic_count_all';
		$variableIDs[] = 'magic_count_functions';
		$variableIDs[] = 'magic_count_implementations';
		$variableIDs[] = 'magic_count_testers';
		$variableIDs[] = 'magic_count_types';
		$variableIDs[] = 'magic_count_languages';
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/ParserGetVariableValueSwitch
	 *
	 * @param Parser $parser
	 * @param array &$variableCache
	 * @param string $magicWordId
	 * @param ?string &$ret
	 * @param PPFrame|false $frame
	 * @return bool|void
	 */
	public function onParserGetVariableValueSwitch( $parser, &$variableCache, $magicWordId, &$ret, $frame ) {
		// We only do this in repo mode
		if ( !$this->config->get( 'WikiLambdaEnableRepoMode' ) ) {
			return true;
		}

		$matchedType = match ( $magicWordId ) {
			'magic_count_all' => ZTypeRegistry::Z_OBJECT,
			'magic_count_functions' => ZTypeRegistry::Z_FUNCTION,
			'magic_count_implementations' => ZTypeRegistry::Z_IMPLEMENTATION,
			'magic_count_testers' => ZTypeRegistry::Z_TESTER,
			'magic_count_types' => ZTypeRegistry::Z_TYPE,
			'magic_count_languages' => ZTypeRegistry::Z_LANGUAGE,
			default => null,
		};

		if ( $matchedType === null ) {
			// Unknown magic word, do nothing
			return;
		}

		$ret = $this->zObjectStore->getCountOfTypeInstances( $matchedType );

		// Speed-optimisation: cache the value for calls to the same variable in the same request
		$variableCache[$magicWordId] = $ret;

		// Permit future callbacks to run for this hook (e.g. other extensions' code).
		return true;
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/SpecialStatsAddExtra
	 *
	 * @param array &$extraStats
	 * @param IContextSource $context
	 */
	public function onSpecialStatsAddExtra( &$extraStats, $context ) {
		// We only do this in repo mode
		if ( !$this->config->get( 'WikiLambdaEnableRepoMode' ) ) {
			return;
		}

		$contentLanguage = \MediaWiki\MediaWikiServices::getInstance()->getContentLanguage();

		$extraStats['wikilambda-statistics-header'] = [
			'wikilambda-statistics-label-allobjects' => $contentLanguage->formatNum(
				$this->zObjectStore->getCountOfTypeInstances( ZTypeRegistry::Z_OBJECT )
			),
			'wikilambda-statistics-label-types' => $contentLanguage->formatNum(
				$this->zObjectStore->getCountOfTypeInstances( ZTypeRegistry::Z_TYPE )
			),
			'wikilambda-statistics-label-languages' => $contentLanguage->formatNum(
				$this->zObjectStore->getCountOfTypeInstances( ZTypeRegistry::Z_LANGUAGE )
			),
			'wikilambda-statistics-label-functions' => $contentLanguage->formatNum(
				$this->zObjectStore->getCountOfTypeInstances( ZTypeRegistry::Z_FUNCTION )
			),
			'wikilambda-statistics-label-implementations' => $contentLanguage->formatNum(
				$this->zObjectStore->getCountOfTypeInstances( ZTypeRegistry::Z_IMPLEMENTATION )
			),
			'wikilambda-statistics-label-testers' => $contentLanguage->formatNum(
				$this->zObjectStore->getCountOfTypeInstances( ZTypeRegistry::Z_TESTER )
			),
		];
	}

	/** @inheritDoc */
	public function onParserFirstCallInit( $parser ) {
		// We only do this in repo mode
		if ( !$this->config->get( 'WikiLambdaEnableRepoMode' ) ) {
			return;
		}
		// Provide {{#wikifunctionlabel:Z1234|en}} that will render a link to the ZObject with its label
		$parser->setFunctionHook( 'wikifunctionlabel', [ $this, 'parserFunctionWikifunctionLabel' ] );
		$parser->setFunctionHook( 'wikifunctionlabeldesc', [ $this, 'parserFunctionWikifunctionLabelAndDescription' ] );
	}

	/**
	 * Renders the output of our repo-mode parser function to show the label of a ZObject.
	 *
	 * Example:
	 *   {{#wikifunctionlabel:Z1234|en}}
	 * ->
	 *   [[Z1234|English label of Z1234 (Z1234)]]
	 *
	 * @param Parser $parser
	 * @param string $zid ZID of the ZObject to link to, defaults to 'Z1'
	 * @param string $langCode Language code to use for the label, defaults to and will fall back to English
	 * @return string
	 */
	public function parserFunctionWikifunctionLabel( $parser, $zid = 'Z1', $langCode = 'en' ): string {
		return $this->renderParserFunctionWikifunction( $parser, $zid, $langCode, false );
	}

	/**
	 * Renders the output of our repo-mode parser function to show the label and description of a ZObject.
	 *
	 * Example:
	 *   {{#wikifunctionlabeldesc:Z1234|en}}
	 * ->
	 *   [[Z1234|English label of Z1234 (Z1234): English description of Z1234]]
	 *
	 * @param Parser $parser
	 * @param string $zid ZID of the ZObject to link to, defaults to 'Z1'
	 * @param string $langCode Language code to use for the label, defaults to and will fall back to English
	 * @return string
	 */
	public function parserFunctionWikifunctionLabelAndDescription( $parser, $zid = 'Z1', $langCode = 'en' ): string {
		return $this->renderParserFunctionWikifunction( $parser, $zid, $langCode, true );
	}

	/**
	 * Renders the output of our repo-mode parser functions
	 *
	 * @param Parser $parser
	 * @param string $zid ZID of the ZObject to link to, defaults to 'Z1'
	 * @param string $langCode Language code to use for the label, defaults to and will fall back to English
	 * @param bool $includeDescription Whether to include the description in the output
	 * @return string
	 */
	private function renderParserFunctionWikifunction(
		$parser, string $zid = 'Z1', string $langCode = 'en', bool $includeDescription = false
	): string {
		if ( !ZObjectUtils::isValidZObjectReference( $zid ) ) {
			// If the ZID is not valid, return just the supplied false-ZID as plain text, escaped.
			return htmlspecialchars( $zid );
		}

		// Start the response with a link to the ZObject.
		$output = '[[' . $zid . '|';

		$label = $this->zObjectStore->fetchZObjectLabel( $zid, $langCode, true );
		if ( $label === null ) {
			// If we don't have a label, we can't link to it, so just show the 'Unlabelled' ZID
			$label = $parser->msg( 'wikilambda-repoparserfunction-unlabelled' )->text();
		}
		$output .= $label;

		$output .= $parser->msg( 'word-separator' )->text()
			. $parser->msg( 'parentheses' )->params(
				'<span dir="ltr" class="ext-wikilambda-inline-zid">' . $zid . '</span>'
			)->text();

		if ( $includeDescription ) {
			// This is an expensive operation; flag it as such.
			$parser->incrementExpensiveFunctionCount();

			$zobject = $this->zObjectStore->fetchZObject( $zid );

			if ( $zobject === null || !( $zobject instanceof ZObjectContent ) || !$zobject->isValid() ) {
				// If we can't load the ZObject, just return the label and ZID
				$description = $parser->msg( 'wikilambda-repoparserfunction-unknown' )->text();
			} else {
				$language = $this->languageFactory->getLanguage( $langCode );

				$description = $zobject->getZObject()->getDescription( $language, true );

				if ( !$description ) {
					// If we don't have a description, use the default one
					$description = $parser->msg( 'wikilambda-repoparserfunction-undescribed' )->text();
				}
			}

			$output .= $parser->msg( 'colon-separator' )->text()
				. '<span class="ext-wikilambda-inline-description">'
				. trim( strip_tags( $parser->recursiveTagParseFully( $description ) ) )
				. '</span>';

		}

		$output .= ']]';

		return $output;
	}
}
