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
use MediaWiki\Extension\WikiLambda\PageTitle\PageTitleBuilder;
use MediaWiki\Extension\WikiLambda\UIUtils;
use MediaWiki\Extension\WikiLambda\WikidataEntityLookup;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Html\Html;
use MediaWiki\Language\LanguageFactory;
use MediaWiki\Language\LanguageNameUtils;
use MediaWiki\MainConfigNames;
use MediaWiki\Output\OutputPage;
use MediaWiki\Page\Article;
use MediaWiki\Parser\ParserOptions;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Revision\RevisionStore;
use MediaWiki\Revision\SlotRecord;
use MediaWiki\SpecialPage\UnlistedSpecialPage;
use MediaWiki\Title\Title;
use MediaWiki\User\User;
use MediaWiki\Utils\UrlUtils;

class SpecialViewAbstract extends UnlistedSpecialPage {
	public function __construct(
		private readonly ContentRenderer $contentRenderer,
		private readonly LanguageFactory $languageFactory,
		private readonly LanguageNameUtils $languageNameUtils,
		private readonly RevisionStore $revisionStore,
		private readonly UrlUtils $urlUtils,
		private readonly WikidataEntityLookup $entityLookup
	) {
		parent::__construct( 'ViewAbstract' );
	}

	/** @inheritDoc */
	public function getRestriction(): string {
		return 'read';
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
		if ( !WikiLambdaServices::getMode()->isAbstract() ) {
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
		if ( !WikiLambdaServices::getMode()->isAbstract() ) {
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

		// Begin output by setting headers
		$this->setHeaders();

		// (T343594) Set the title of the page to the target title, so Recent Changes Link works
		$output->setTitle( $targetTitle );

		// If this is a redirect from Create page, announce it somehow
		if ( $request->getInt( 'created' ) ) {
			$output->addSubtitle(
				Html::noticeBox( $this->msg( 'wikilambda-abstract-special-create-existing-redirected' )->parse() )
			);
		}

		// (T343594) Set the revision ID to the requested one or the latest, so the Permanent Link works
		$latestRevId = $output->getTitle()->getLatestRevID();
		$targetRevisionId = $this->getRequest()->getInt( 'oldid' ) ?: $latestRevId;
		$output->setRevisionId( $targetRevisionId );

		// Resolve via the title, not the bare revision ID, so an oldid belonging to some
		// other page is treated as not found rather than rendered under this page's title.
		$targetRevision = $this->revisionStore->getRevisionByTitle( $targetTitle, $targetRevisionId );

		// If the revision does not exist, send to Main
		if ( !$targetRevision ) {
			$this->redirectToMain( $output );
			return;
		}

		// (T430601) Respect RevisionDelete/suppression: if the viewer may not see this
		// revision, show the same error message core's article view shows and stop, rather
		// than leaking the hidden content through the /view/ path.
		if ( !UIUtils::checkRevisionViewable(
			$targetRevision, $this->getAuthority(), $targetTitle, $output
		) ) {
			$output->setPageTitleMsg( $this->getContext()->msg( 'errorpagetitle' ) );
			return;
		}

		// When requesting a specific revision...
		if ( $this->getRequest()->getInt( 'oldid' ) > 0 ) {
			// Resolve the revision first: both setOldSubtitle() and showDeletedRevisionHeader()
			// read Article::$mRevisionRecord, and the latter dereferences it without a guard.
			$article = Article::newFromTitle( $targetTitle, $this->getContext() );
			$article->fetchRevisionRecord();

			// (T364318) Add the revision navigation bar if seeing an oldid
			$article->setOldSubtitle( $targetRevisionId );

			// (T430601) A viewer who may see hidden text still gets core's 'unhide' gate:
			// the header returns false until they confirm with unhide=1.
			if ( !$article->showDeletedRevisionHeader() ) {
				return;
			}
		}

		// Only fetch content after confirming the viewer may see this revision
		$targetContent = $targetRevision->getContent(
			SlotRecord::MAIN, RevisionRecord::FOR_THIS_USER, $this->getAuthority()
		);

		// If content does not exist, send to Main
		if ( !$targetContent ) {
			$this->redirectToMain( $output );
			return;
		}

		// (T345453) Have the standard copyright stuff show up.
		$output->setCopyright( true );

		// Set page title to the object being viewed.
		$qid = $targetTitle->getText();
		$langCode = $targetLanguageObject->getCode();
		$label = $this->entityLookup->resolveAbstractLabel( $qid, $langCode );

		// Rich HTML for the H1 display: fall back to the QID as the title text when no
		// Wikibase label is available (the QID chip still renders alongside it).
		$output->setPageTitle(
			PageTitleBuilder::createAbstractViewPageTitle(
				$label ?? $targetTitle->getPrefixedText(),
				$langCode,
				$targetLanguageObject->getDir(),
				$qid,
			)
		);
		// Plain-text override for the browser <title> tag: "Label (QID)" or just "QID",
		// plus the " - {{SITENAME}}" suffix, matching the /wiki/, edit and history views.
		$output->setHTMLTitle(
			PageTitleBuilder::createAbstractViewPageHtmlTitle( $label, $qid, $langCode )
		);

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

		// Allow anonymous /view/ responses to be edge-cached, rather than recomputed per request like
		// a normal Special page. Re-rendering embeds the abstract source and per-language label into the
		// page, so each /view/<lang>/<page> URL is its own cache entry; ViewUrlCacheHandler purges
		// them on edit/delete. OutputPage::sendCacheControl() keeps logged-in (session-bearing) responses
		// private regardless, so only anonymous reads are cached.
		$output->setCdnMaxage( $this->getConfig()->get( MainConfigNames::CdnMaxAge ) );

		// (T345457) Tell OutputPage that our content is article-related, so we get Special:WhatLinksHere etc.
		// (T343594) The Special:WhatLinksHere weren't shown on view/en/ZXXXX pages,
		// but they were on wiki/ZXXXX pages. Setting the flag here (lower in code) fixes it.
		$output->setArticleFlag( true );
		$this->addHelpLink( 'Abstract_Wikipedia:About' );
	}

	/**
	 * Redirect the user to the Main Page, as their request isn't valid / answerable.
	 *
	 * TODO (T343652): Actually tell the user why they ended up somewhere they might not want?
	 *
	 * @param OutputPage $output
	 */
	private function redirectToMain( OutputPage $output ) {
		$mainPageUrl = Title::newMainPage( $output )->getFullURL();
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
