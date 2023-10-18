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

use Html;
use InvalidArgumentException;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use MediaWiki\Extension\WikiLambda\ZObjectEditingPageTrait;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\MediaWikiServices;
use MediaWiki\Title\Title;
use OutputPage;
use ParserOptions;
use SpecialPage;

class SpecialViewObject extends SpecialPage {
	use ZObjectEditingPageTrait;

	/** @var ZObjectStore */
	protected $zObjectStore;

	/**
	 * @param ZObjectStore $zObjectStore
	 */
	public function __construct( ZObjectStore $zObjectStore ) {
		parent::__construct( 'ViewObject', 'view', false );
		$this->zObjectStore = $zObjectStore;
	}

	/**
	 * @inheritDoc
	 */
	protected function getGroupName() {
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
		$services = MediaWikiServices::getInstance();

		$output = $this->getOutput();

		// Make sure things don't think the page is wikitext, so that e.g. VisualEditor
		// doesn't try to instantiate its tabs
		$output->getTitle()->setContentModel( CONTENT_MODEL_ZOBJECT );

		// If there's no sub-page, just exit.
		if ( !$subPage || !is_string( $subPage ) ) {
			$this->redirectToMain( $output );
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
			|| !ZObjectUtils::isValidId( $targetPageName )
		) {
			$this->redirectToMain( $output );
			return;
		}

		$this->getSkin()->setRelevantTitle( $targetTitle );

		// (T345453) Have the standard copyright stuff show up.
		$this->getContext()->getOutput()->setCopyright( true );

		$this->setHeaders();

		try {
			$targetLanguageObject = $services->getLanguageFactory()->getLanguage( $targetLanguage );
		} catch ( InvalidArgumentException $e ) {
			// (T343006) Supplied language is invalid; probably a user-error, so just exit.
			$this->redirectToMain( $output );
			return;
		}

		// Set the page language for our own purposes.
		$this->getContext()->setLanguage( $targetLanguageObject );

		$output->addModules( [ 'ext.wikilambda.edit', 'mediawiki.special' ] );

		$targetContent = $this->zObjectStore->fetchZObjectByTitle( $targetTitle );

		if ( !$targetContent ) {
			$this->redirectToMain( $output );
		}

		// Request that we render the content in the given target language.
		$parserOptions = ParserOptions::newFromUserAndLang( $this->getUser(), $targetLanguageObject );

		$contentRenderer = $services->getContentRenderer();

		$parserOutput = $contentRenderer->getParserOutput(
			$targetContent,
			$targetTitle,
			/* revId */ null,
			$parserOptions
		);

		// Add the header to the parserOutput
		$header = ZObjectContentHandler::createZObjectViewHeader( $targetContent, $targetTitle, $targetLanguageObject );
		$output->setPageTitle( $header );

		$output->addParserOutput( $parserOutput );

		// Add all the see-other links to versions of this page in each of the known languages.
		$languages = $this->zObjectStore->fetchAllZLanguageObjects();
		foreach ( $languages as $zid => $bcpcode ) {
			if ( $bcpcode === $targetLanguage ) {
				continue;
			}
			// Add each item individually to help phan understand the taint better, even though it's slower
			$output->addHeadItem(
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

		// TODO: Make this help page.
		$this->addHelpLink( 'Extension:WikiLambda/Viewing Objects' );

		$this->generateZObjectPayload( $output, $this->getContext(), [
			'createNewPage' => false,
			'zId' => $targetPageName,
			'viewmode' => true,
		] );
	}

	/**
	 * Redirect the user to the Main Page, as their request isn't valid / answerable.
	 *
	 * TODO: Actually tell the user why they ended up somewhere they might not want?
	 *
	 * @param OutputPage $output
	 */
	private function redirectToMain( OutputPage $output ) {
		$mainPageUrl = '/wiki/' . $output->msg( 'Mainpage' )->text();
		$output->redirect( $mainPageUrl, 303 );
	}
}
