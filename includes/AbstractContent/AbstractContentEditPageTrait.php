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

		// Get oldid, if any, from the url parameter 'oldid'
		$targetRevisionId = $context->getRequest()->getInt( 'oldid' ) ?: null;

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
