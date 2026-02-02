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

use MediaWiki\Context\IContextSource;
use MediaWiki\Extension\WikiLambda\UIUtils;
use MediaWiki\Html\Html;
use MediaWiki\MediaWikiServices;
use MediaWiki\Output\OutputPage;
use MediaWiki\Page\Article;
use MediaWiki\Title\Title;

trait AbstractContentEditPageTrait {

	/**
	 * Generate the Abstract Wiki content payload for edit and creation pages.
	 * Pass content payload through js config vars.
	 *
	 * @param IContextSource $context
	 * @param OutputPage $output
	 * @param Title $title
	 */
	public function generateAbstractContentPayload(
		IContextSource $context,
		OutputPage $output,
		Title $title
	): void {
		// Get user language
		// TODO: find a way to get the language zid for the user
		// lang code and pass it to the app via JS config vars.
		$userLang = $context->getLanguage();
		$userLangCode = $userLang->getCode();

		$createNewPage = true;
		$jsonContent = false;

		// Get oldid, if any, either in subpage or as the url parameter 'qid'
		$request = $context->getRequest();
		$latestRevId = $title->getLatestRevID();
		$targetRevisionId = $request->getInt( 'oldid' ) ?: null;

		if ( $title->exists() ) {
			// Content exists: retrieve given or latest revision
			$createNewPage = false;
			$jsonContent = $this->getAbstractContentForTitle( $title, $targetRevisionId );
			// FIXME if jsonContent is false, then title and oldid don't match
		} else {
			// Content does not exist: generate empty content object
			$contentHandler = MediaWikiServices::getInstance()
				->getContentHandlerFactory()
				->getContentHandler( CONTENT_MODEL_ABSTRACT );
			'@phan-var \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContentHandler $contentHandler';
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

	/**
	 * Return the AbstractWikiContent JSON encoded as a string
	 *
	 * @param Title $title
	 * @param int|null $revisionId
	 * @return string|bool
	 */
	private function getAbstractContentForTitle( Title $title, ?int $revisionId ) {
		// TODO inject revision store
		$revisionStore = MediaWikiServices::getInstance()->getRevisionStore();
		if ( $revisionId ) {
			$revision = $revisionStore->getRevisionByTitle( $title, $revisionId, 0 );
		} else {
			$revision = $revisionStore->getKnownCurrentRevision( $title );
		}

		if ( !$revision ) {
			return false;
		}

		// Check content model
		$contentModel = $revision->getMainContentModel();
		if ( $contentModel !== CONTENT_MODEL_ABSTRACT ) {
			return false;
		}

		$content = $revision->getMainContentRaw();
		'@phan-var AbstractWikiContent $content';
		return $content->getText();
	}
}
