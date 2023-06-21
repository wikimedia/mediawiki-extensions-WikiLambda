<?php

namespace MediaWiki\Extension\WikiLambda\HookHandler;

use HtmlArmor;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Hook\WebRequestPathInfoRouterHook;
use MediaWiki\Linker\Hook\HtmlPageLinkRendererEndHook;
use MediaWiki\Linker\LinkRenderer;
use MediaWiki\Linker\LinkTarget;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\Title\Title;
use RequestContext;

class PageRenderingHandler implements HtmlPageLinkRendererEndHook, WebRequestPathInfoRouterHook {

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
		$attribs['href'] = '/wiki/' . $currentPageContentLanguageCode . '/' . $attribs['title'];

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
				->getString();
		}

		// Finally, set the label of the link to the *un*escaped user-supplied label, see
		// https://www.mediawiki.org/wiki/Manual:Hooks/HtmlPageLinkRendererEnd
		//
		// &$text: the contents that the <a> tag should have; either a *plain, unescaped string* or a HtmlArmor object.
		//
		$text = $context->msg( 'wikilambda-zobject-title', [ $label, $zid ] )->text();
	}

	/**
	 * @inheritDoc
	 */
	public function onWebRequestPathInfoRouter( $router ) {
		$router->add(
			'/wiki/$2/$1',
			[],
			// Use a callback in case we've wrongly matched a sub-page or special page
			[ 'callback' => [ __CLASS__, 'onWebRequestPathInfoRouterCallback' ] ]
		);
	}

	/**
	 * @inheritDoc
	 */
	public static function onWebRequestPathInfoRouterCallback( array &$matches, array $data ): void {
		// Only do this if there's no colon in the first part, as that's a namespace/etc. page and not a language
		if ( !strpos( $data['$2'], ':' ) ) {
			$matches['title'] = $data['$1'];
			$matches['uselang'] = $data['$2'];
		} else {
			// Otherwise, stitch the user's requested path back together.
			$matches['title'] = $data['$2'] . '/' . $data['$1'];
		}
	}

}
