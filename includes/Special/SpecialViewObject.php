<?php

/**
 * WikiLambda Special:ViewObject page
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Special;

use InvalidArgumentException;
use MediaWiki\Content\Renderer\ContentRenderer;
use MediaWiki\Extension\WikiLambda\ZObjectEditingPageTrait;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Html\Html;
use MediaWiki\Languages\LanguageFactory;
use MediaWiki\Output\OutputPage;
use MediaWiki\Parser\ParserOptions;
use MediaWiki\SpecialPage\SpecialPage;
use MediaWiki\Title\Title;
use MediaWiki\Utils\UrlUtils;
use RuntimeException;

class SpecialViewObject extends SpecialPage {
	use ZObjectEditingPageTrait;

	private ContentRenderer $contentRenderer;
	private LanguageFactory $languageFactory;
	private UrlUtils $urlUtils;
	private ZObjectStore $zObjectStore;

	public function __construct(
		ContentRenderer $contentRenderer,
		LanguageFactory $languageFactory,
		UrlUtils $urlUtils,
		ZObjectStore $zObjectStore
	) {
		parent::__construct( 'ViewObject', 'view', false );
		$this->contentRenderer = $contentRenderer;
		$this->languageFactory = $languageFactory;
		$this->urlUtils = $urlUtils;
		$this->zObjectStore = $zObjectStore;
	}

	/**
	 * @inheritDoc
	 */
	protected function getGroupName() {
		// Triggers use of message specialpages-group-wikilambda
		return 'wikilambda';
	}

	/**
	 * @inheritDoc
	 */
	public function getDescription() {
		return $this->msg( 'wikilambda-special-viewobject' );
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $subPage ) {
		$outputPage = $this->getOutput();

		if ( !$this->getConfig()->get( 'WikiLambdaEnableRepoMode' ) ) {
			// No usage allowed on client-mode wikis.
			$this->redirectToMain( $outputPage );
			return;
		}

		// Make sure things don't think the page is wikitext, so that e.g. VisualEditor
		// doesn't try to instantiate its tabs
		$outputPage->getTitle()->setContentModel( CONTENT_MODEL_ZOBJECT );

		// If there's no subpage, just exit.
		if ( !$subPage || !is_string( $subPage ) ) {
			$this->redirectToMain( $outputPage );
			return;
		}

		$subPageSplit = [];
		if ( !preg_match( '/([^\/]+)\/(Z\d+)/', $subPage, $subPageSplit ) ) {
			// Fallback to 'en' if request doesn't specify a language.
			$targetLanguage = 'en';
			$targetPageName = $subPage;
		} else {
			$targetLanguage = $subPageSplit[1];
			$targetPageName = $subPageSplit[2];
		}

		// Allow the user to over-ride the content language if explicitly requested
		$targetLanguage = $this->getRequest()->getRawVal( 'uselang' ) ?? $targetLanguage;

		$targetTitle = Title::newFromText( $targetPageName, NS_MAIN );

		if (
			// If the given page isn't a Title
			!( $targetTitle instanceof Title ) || !$targetTitle->exists()
			// … or somehow it's not for a valid ZObject
			|| !ZObjectUtils::isValidZObjectReference( $targetPageName )
		) {
			$this->redirectToMain( $outputPage );
			return;
		}

		// Tell the skin what content specifically we're related to, so edit/history links etc. work.
		$this->getSkin()->setRelevantTitle( $targetTitle );
		// (T343594) Set the title of the page to the target title, so Recent Changes Link works
		$outputPage->setTitle( $targetTitle );

		/**
		 * (T343594) Set the revision ID to the requested one or the latest, so the Permanent Link works
		 *
		 * TODO (T364318): add the revision navigation bar to the page.
		 */
		$latestRevId = $outputPage->getTitle()->getLatestRevID();
		$targetRevision = $this->getRequest()->getInt( 'oldid' ) ?: $latestRevId;
		$outputPage->setRevisionId( $targetRevision );

		// (T345453) Have the standard copyright stuff show up.
		$this->getContext()->getOutput()->setCopyright( true );

		$this->setHeaders();

		try {
			$targetLanguageObject = $this->languageFactory->getLanguage( $targetLanguage );
		} catch ( InvalidArgumentException $e ) {
			// (T343006) Supplied language is invalid; probably a user-error, so just exit.
			$this->redirectToMain( $outputPage );
			return;
		}

		// Set the page language for our own purposes.
		$this->getContext()->setLanguage( $targetLanguageObject );

		$outputPage->addModules( [ 'ext.wikilambda.app', 'mediawiki.special' ] );

		$targetContent = $this->zObjectStore->fetchZObjectByTitle( $targetTitle );
		if ( !$targetContent ) {
			$this->redirectToMain( $outputPage );
		}

		// Request that we render the content in the given target language.
		$parserOptions = ParserOptions::newFromUserAndLang( $this->getUser(), $targetLanguageObject );
		$parserOutput = $this->contentRenderer->getParserOutput(
			$targetContent,
			$targetTitle,
			null,
			$parserOptions
		);

		$outputPage->addParserOutput( $parserOutput, $parserOptions );

		// Add all the see-other links to versions of this page in each of the known languages.
		$languages = $this->zObjectStore->fetchAllZLanguageCodes();
		foreach ( $languages as $bcpcode ) {
			if ( $bcpcode === $targetLanguage ) {
				continue;
			}
			// Add each item individually to help phan understand the taint better, even though it's slower
			$outputPage->addHeadItem(
				'link-alternate-language-' . strtolower( $bcpcode ),
				Html::element(
					'link',
					[
						'rel' => 'alternate',
						'hreflang' => $bcpcode,
						'href' => "/view/$bcpcode/$targetPageName",
					]
				)
			);
		}

		// (T355546) Over-ride the canonical URL to the /view/ form.
		$viewURL = $this->urlUtils->expand( "/view/$targetLanguage/$targetPageName" );
		// $viewURL can be null 'if no valid URL can be constructed', which shouldn't ever happen.
		if ( $viewURL === null ) {
			throw new RuntimeException( 'No valid URL could be constructed for the canonical path' );
		}
		$outputPage->setCanonicalUrl( $viewURL );

		// (T345457) Tell OutputPage that our content is article-related, so we get Special:WhatLinksHere etc.
		// (T343594) The Special:WhatLinksHere weren't shown on view/en/ZXXXX pages,
		// but they were on wiki/ZXXXX pages. Setting the flag here (lower in code) fixes it.
		$outputPage->setArticleFlag( true );
		// TODO (T362241): Make this help page.
		$this->addHelpLink( 'Help:Wikifunctions/Viewing Objects' );

		$this->generateZObjectPayload( $outputPage, $this->getContext(), [
			'createNewPage' => false,
			'zId' => $targetPageName,
			'viewmode' => true,
		] );
	}

	/**
	 * Redirect the user to the Main Page, as their request isn't valid / answerable.
	 *
	 * TODO (T343652): Actually tell the user why they ended up somewhere they might not want?
	 *
	 * @param OutputPage $outputPage
	 */
	private function redirectToMain( OutputPage $outputPage ) {
		// We use inContentLanguage() to get it in English, rather than redirecting to non-existent pages
		// like https://www.wikifunctions.org/wiki/Strona_g%C5%82%C3%B3wna if the user's language is pl.
		$mainPageUrl = '/wiki/' . $outputPage->msg( 'Mainpage' )->inContentLanguage()->text();
		$outputPage->redirect( $mainPageUrl, 303 );
	}

	/**
	 * (T355441) Unlike regular Special pages, we actively want search engines to
	 * index our content and follow our links.
	 *
	 * @inheritDoc
	 */
	protected function getRobotPolicy() {
		return 'index,follow';
	}
}
