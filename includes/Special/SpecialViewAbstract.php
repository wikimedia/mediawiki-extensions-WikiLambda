<?php

/**
 * WikiLambda Special:ViewAbstract page
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Special;

use MediaWiki\Config\ConfigException;
use MediaWiki\Content\Renderer\ContentRenderer;
use MediaWiki\Html\Html;
use MediaWiki\Language\LanguageFactory;
use MediaWiki\Language\LanguageNameUtils;
use MediaWiki\MediaWikiServices;
use MediaWiki\Output\OutputPage;
use MediaWiki\Page\Article;
use MediaWiki\Parser\ParserOptions;
use MediaWiki\SpecialPage\UnlistedSpecialPage;
use MediaWiki\Title\Title;
use MediaWiki\User\User;
use MediaWiki\Utils\UrlUtils;

class SpecialViewAbstract extends UnlistedSpecialPage {
	private ContentRenderer $contentRenderer;
	private LanguageFactory $languageFactory;
	private LanguageNameUtils $languageNameUtils;
	private UrlUtils $urlUtils;

	public function __construct(
		ContentRenderer $contentRenderer,
		LanguageFactory $languageFactory,
		LanguageNameUtils $languageNameUtils,
		UrlUtils $urlUtils,
	) {
		parent::__construct( 'ViewAbstract', 'read' );
		$this->contentRenderer = $contentRenderer;
		$this->languageFactory = $languageFactory;
		$this->languageNameUtils = $languageNameUtils;
		$this->urlUtils = $urlUtils;
	}

	/**
	 * @inheritDoc
	 */
	protected function getGroupName() {
		// Triggers use of message specialpages-group-wikilambda
		return 'abstractwiki';
	}

	/**
	 * @inheritDoc
	 */
	public function getDescription() {
		return $this->msg( 'wikilambda-abstract-special-view' );
	}

	/**
	 * @inheritDoc
	 *
	 * @param User $user
	 * @return bool
	 */
	public function userCanExecute( User $user ) {
		// No usage allowed if not abstract mode
		if ( !$this->getConfig()->get( 'WikiLambdaEnableAbstractMode' ) ) {
			return false;
		}
		return parent::userCanExecute( $user );
	}

	/**
	 * @inheritDoc
	 *
	 * @throws ConfigException
	 */
	public function execute( $subPage ) {
		if ( !$this->userCanExecute( $this->getUser() ) ) {
			$this->displayRestrictionError();
		}

		$request = $this->getRequest();
		$output = $this->getOutput();

		// If abstract not enabled, go back to Main
		if ( !$this->getConfig()->get( 'WikiLambdaEnableAbstractMode' ) ) {
			$this->redirectToMain( $output );
			return;
		}

		// Force Special:ViewAbstract page to behave as view, even when action=edit
		if ( $request->getVal( 'action' ) === 'edit' ) {
			$request->setVal( 'action', 'view' );
		}

		// Make sure the correct content model is set, so that e.g. VisualEditor
		// doesn't try to instantiate its tabs
		$output->getTitle()->setContentModel( CONTENT_MODEL_ABSTRACT );

		// If there's no subpage, just exit.
		if ( !$subPage || !is_string( $subPage ) ) {
			$this->redirectToMain( $output );
			return;
		}

		$subPageSplit = [];
		if ( !preg_match( '~^([^/]+)/(.+)$~', $subPage, $subPageSplit ) ) {
			// Fallback to 'en' if request doesn't specify a language.
			$targetLanguage = 'en';
			$targetPageName = $subPage;
		} else {
			$targetLanguage = $subPageSplit[1];
			$targetPageName = $subPageSplit[2];
		}

		$targetTitle = Title::newFromText( $targetPageName );

		// If the given page doesn't exist, exit
		if ( !( $targetTitle instanceof Title ) || !$targetTitle->exists() ) {
			$this->redirectToMain( $output );
			return;
		}

		// Allow the user to over-ride the content language if explicitly requested
		$targetLanguage = $request->getRawVal( 'uselang' ) ?? $targetLanguage;

		// (T343006) If supplied language is invalid; probably a user-error, so just exit.
		// * isValidCode checks for code wellformedness -- $this->languageNameUtils->isValidCode( $targetLanguage
		// * isKnownLanguageTag checks for code existing in registered language codes (and extraLanguageNames)
		if ( !$this->languageNameUtils->isKnownLanguageTag( $targetLanguage ) ) {
			$this->redirectToMain( $output );
			return;
		}

		// Set the page language for our own purposes.
		$targetLanguageObject = $this->languageFactory->getLanguage( $targetLanguage );
		$this->getContext()->setLanguage( $targetLanguageObject );

		// Tell the skin what content specifically we're related to, so edit/history links etc. work.
		$this->getSkin()->setRelevantTitle( $targetTitle );

		// (T343594) Set the title of the page to the target title, so Recent Changes Link works
		$output->setTitle( $targetTitle );

		// If this is a redirect from Create page, announce it somehow
		// FIXME better text
		if ( $request->getInt( 'created' ) ) {
			$output->addSubtitle(
				Html::noticeBox( 'You were redirected from Special:CreateAbstract page as Qid is already created' )
			);
		}

		// (T343594) Set the revision ID to the requested one or the latest, so the Permanent Link works
		$latestRevId = $output->getTitle()->getLatestRevID();
		$targetRevisionId = $this->getRequest()->getInt( 'oldid' ) ?: $latestRevId;

		// FIXME inject revision store
		$revisionStore = MediaWikiServices::getInstance()->getRevisionStore();
		$targetRevision = $revisionStore->getRevisionById( $targetRevisionId );
		$targetContent = $targetRevision ? $targetRevision->getMainContentRaw() : null;

		// If content does not exist for the requested revision ID, send to Main
		if ( !$targetContent ) {
			$this->redirectToMain( $output );
			return;
		}

		$output->setRevisionId( $targetRevisionId );

		// (T364318) Add the revision navigation bar if seeing an oldid
		if ( $targetRevisionId !== $latestRevId ) {
			$article = Article::newFromTitle( $targetTitle, $this->getContext() );
			$article->setOldSubtitle( $targetRevisionId );
		}

		$this->setHeaders();

		// (T345453) Have the standard copyright stuff show up.
		$output->setCopyright( true );

		// Set page title to the object being viewed
		$output->setPageTitle( $targetTitle->getPrefixedText() );

		// Runs AbstractWikiContentHandler::fillParserOutput
		$parserOptions = ParserOptions::newFromUserAndLang( $this->getUser(), $targetLanguageObject );
		$parserOutput = $this->contentRenderer->getParserOutput(
			$targetContent,
			$targetTitle,
			null,
			$parserOptions
		);
		$output->addParserOutput( $parserOutput, $parserOptions );

		// (T355546) Over-ride the canonical URL to the /view/ form.
		$viewURL = $this->urlUtils->expand( "/view/$targetLanguage/$targetPageName" );
		// $viewURL can be null 'if no valid URL can be constructed', which shouldn't ever happen.
		if ( $viewURL === null ) {
			throw new ConfigException( 'No valid URL could be constructed for the canonical path' );
		}
		$output->setCanonicalUrl( $viewURL );

		// (T345457) Tell OutputPage that our content is article-related, so we get Special:WhatLinksHere etc.
		// (T343594) The Special:WhatLinksHere weren't shown on view/en/ZXXXX pages,
		// but they were on wiki/ZXXXX pages. Setting the flag here (lower in code) fixes it.
		$output->setArticleFlag( true );
		$this->addHelpLink( 'Help:Wikifunctions/Viewing Objects' );
	}

	/**
	 * Redirect the user to the Main Page, as their request isn't valid / answerable.
	 *
	 * TODO (T343652): Actually tell the user why they ended up somewhere they might not want?
	 *
	 * @param OutputPage $output
	 */
	private function redirectToMain( OutputPage $output ) {
		// We use inContentLanguage() to get it in English, rather than redirecting to non-existent pages
		// like https://www.wikifunctions.org/wiki/Strona_g%C5%82%C3%B3wna if the user's language is pl.
		$mainPageUrl = '/wiki/' . $output->msg( 'Mainpage' )->inContentLanguage()->text();
		$output->redirect( $mainPageUrl, 303 );
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
