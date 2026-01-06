<?php
/**
 * WikiLambda Abstract content page trait for view, edit and create pages
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
use MediaWiki\Title\Title;

trait AbstractContentPageTrait {

	/**
	 * Generate the Abstract Wiki content payload for view, edit and creation pages.
	 * Pass content payload through js config vars.
	 *
	 * @param OutputPage $output
	 * @param IContextSource $context
	 * @param string|false $subpage Optional param for specifying subpage
	 * @param array $configOverrides
	 * @return array
	 */
	public function generateAbstractContentPayload(
		OutputPage $output,
		IContextSource $context,
		$subpage = false,
		array $configOverrides = []
	): array {
		// Get user language -- we don't have language zid, we should query WF for that
		$userLang = $context->getLanguage();
		$userLangCode = $userLang->getCode();

		// Get qid, if any, either in subpage or as the url parameter 'qid'
		$request = $context->getRequest();
		$pageTitle = $subpage ?: $request->getVal( 'qid' );

		// Get namespace and qid from title, or set to default values
		$namespaces = $context->getConfig()->get( 'WikiLambdaAbstractNamespaces' );
		$primaryNamespace = (int)array_keys( $namespaces )[0];
		[ $namespace, $qid ] = $this->extractNamespaceAndQid( $pageTitle, $primaryNamespace );
		$title = Title::newFromText( $qid, $namespace );

		$createNewPage = true;
		$jsonContent = false;

		if ( $title && $title->exists() ) {
			// Content exists: retrieve latest revision
			$createNewPage = false;
			$jsonContent = $this->getAbstractContentForTitle( $title );
		} else {
			// Content does not exist: generate empty content object
			$contentHandler = MediaWikiServices::getInstance()
				->getContentHandlerFactory()
				->getContentHandler( CONTENT_MODEL_ABSTRACT );
			'@phan-var \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContentHandler $contentHandler';
			$jsonContent = $contentHandler->makeEmptyContent()->getText();
		}

		// Only add no-JS notice for edit/create modes, not view mode (content handler handles it)
		$isViewMode = ( $configOverrides['viewmode'] ?? false ) === true;
		if ( !$isViewMode ) {
			// Fallback no-JS notice.
			$noJsMsg = $context->msg( 'wikilambda-nojs' )->inLanguage( $userLang )->parse();
			$output->addHtml( Html::rawElement( 'noscript', [], $noJsMsg ) );

			// Vue app element with Codex progress indicator
			$loadingMessage = $context->msg( 'wikilambda-loading' )->inLanguage( $userLang )->text();
			$progressIndicator = UIUtils::createCodexProgressIndicator( $loadingMessage );
			$output->addHtml( Html::rawElement( 'div', [ 'id' => 'ext-wikilambda-app' ], $progressIndicator ) );
		}

		// Set up base config variables
		$configBase = [
			'abstractContent' => true,
			'content' => $jsonContent,
			'createNewPage' => $createNewPage,
			'title' => $qid,
			'zlang' => $userLangCode,
			'viewmode' => false
		];

		// Set config overrides and set wgWikiLambda config variables
		$configVars = array_merge( $configBase, $configOverrides );
		$output->addJsConfigVars( 'wgWikiLambda', $configVars );

		return $configVars;
	}

	/**
	 * @param ?string $pageTitle
	 * @param int $primaryNamespace
	 * @return array
	 */
	protected function extractNamespaceAndQid( ?string $pageTitle, int $primaryNamespace = NS_MAIN ): array {
		// Exit with primary namespace and empty qid if title is null or empty
		if ( $pageTitle === null || trim( $pageTitle ) === '' ) {
			return [ $primaryNamespace, '' ];
		}

		$title = Title::newFromText( $pageTitle );

		// Exit with primary namespace and empty qid if title is invalid
		if ( !$title ) {
			return [ $primaryNamespace, '' ];
		}

		$namespace = $title->getNamespace();
		$qid = $title->getText();

		// If no namespace is explicitly provided, use primary
		if ( $namespace === NS_MAIN ) {
			return [ $primaryNamespace, $qid ];
		}

		return [ $namespace, $qid ];
	}

	/**
	 * Return the AbstractWikiContent JSON encoded as a string
	 *
	 * @param Title $title
	 * @return string|bool
	 */
	private function getAbstractContentForTitle( Title $title ) {
		$revisionStore = MediaWikiServices::getInstance()->getRevisionStore();
		$revision = $revisionStore->getKnownCurrentRevision( $title );
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
