<?php
/**
 * WikiLambda Abstract content page trait for edit and create pages.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\AbstractContent;

use MediaWiki\Content\ContentHandlerFactory;
use MediaWiki\Context\IContextSource;
use MediaWiki\Extension\WikiLambda\UIUtils;
use MediaWiki\Html\Html;
use MediaWiki\Output\OutputPage;
use MediaWiki\Page\Article;
use MediaWiki\Revision\RevisionStore;
use MediaWiki\Title\Title;

trait AbstractContentEditPageTrait {

	/**
	 * Generate the Abstract Wiki content payload for edit and creation pages.
	 * Pass content payload through js config vars.
	 *
	 * @param IContextSource $context
	 * @param RevisionStore $revisionStore
	 * @param ContentHandlerFactory $contentHandlerFactory
	 * @param OutputPage $output
	 * @param Title $title
	 */
	public function generateAbstractContentPayload(
		IContextSource $context,
		RevisionStore $revisionStore,
		ContentHandlerFactory $contentHandlerFactory,
		OutputPage $output,
		Title $title
	): void {
		$contentHandler = $contentHandlerFactory->getContentHandler( CONTENT_MODEL_ABSTRACT );
		'@phan-var AbstractWikiContentHandler $contentHandler';

		// Get user language
		// TODO: find a way to get the language zid for the user
		// lang code and pass it to the app via JS config vars.
		$userLang = $context->getLanguage();
		$userLangCode = $userLang->getCode();

		$createNewPage = true;
		$jsonContent = false;

		// Resolve which revision MediaWiki is asking us to display.
		//
		// On a diff URL (?diff=Y&oldid=X) 'oldid' is the older/left side and
		// 'diff' is the newer/right side; MediaWiki renders the right side
		// below the diff. The ZObject SPA used to pick the wrong revision in
		// the parallel view path by reading 'oldid' directly (T426297-ish);
		// today this trait only fires on edit/create actions, but mirror the
		// resolution so a stray ?action=edit&diff=…&oldid=… URL doesn't
		// silently load the pre-diff content. Only numeric 'diff' values are
		// honoured here: the symbolic forms (cur/0/prev/next) only make sense
		// in DifferenceEngine and collapse to "the latest revision", which
		// we represent as no explicit revision request.
		$request = $context->getRequest();
		$diffParam = $request->getRawVal( 'diff' );
		if ( $diffParam !== null ) {
			$targetRevisionId = ( ctype_digit( $diffParam ) && $diffParam !== '0' )
				? (int)$diffParam
				: null;
		} else {
			$targetRevisionId = $request->getInt( 'oldid' ) ?: null;
		}

		if ( $title->exists() ) {
			// Content exists: retrieve given or latest revision
			$createNewPage = false;
			$awContent = $contentHandler->getAbstractContentForTitle(
				$revisionStore,
				$title,
				$targetRevisionId
			);
			// FIXME if jsonContent is false, then title and oldid don't match
			$jsonContent = $awContent ? $awContent->getText() : false;
		} else {
			// Content does not exist: generate empty content object
			$jsonContent = $contentHandler->makeEmptyContent()->getText();
		}

		// (T364318) Add the revision navigation bar if seeing an oldid
		if ( $targetRevisionId !== null ) {
			$output->setRevisionId( $targetRevisionId );
			$article = Article::newFromTitle( $title, $context );
			$article->setOldSubtitle( $targetRevisionId );
		}

		// Fallback no-JS notice.
		$noJsMsg = $context->msg( 'wikilambda-nojs' )->inLanguage( $userLang )->parse();
		$output->addHtml( Html::rawElement( 'noscript', [], $noJsMsg ) );

		// Vue app element with Codex progress indicator
		$loadingMessage = $context->msg( 'wikilambda-loading' )->inLanguage( $userLang )->text();
		$progressIndicator = UIUtils::createCodexProgressIndicator( $loadingMessage );
		$output->addHtml( Html::rawElement( 'div', [ 'id' => 'ext-wikilambda-app' ], $progressIndicator ) );

		// Set up config variables
		$configVars = [
			'abstractContent' => true,
			'content' => $jsonContent,
			'createNewPage' => $createNewPage,
			'title' => $title->getText(),
			'zlang' => $userLangCode,
			'viewmode' => false
		];
		$output->addJsConfigVars( 'wgWikiLambda', $configVars );
	}
}
