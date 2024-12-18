<?php
/**
 * WikiLambda Special:ListMissingLabels page
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Special;

use MediaWiki\Extension\WikiLambda\Fields\HTMLZLanguageSelectField;
use MediaWiki\Extension\WikiLambda\Fields\HTMLZTypeSelectField;
use MediaWiki\Extension\WikiLambda\Pagers\BasicZObjectPager;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\HTMLForm\HTMLForm;
use MediaWiki\Languages\LanguageFallback;
use MediaWiki\SpecialPage\SpecialPage;

class SpecialListMissingLabels extends SpecialPage {

	private ZObjectStore $zObjectStore;
	private LanguageFallback $languageFallback;
	private ZLangRegistry $langRegistry;

	/**
	 * @param ZObjectStore $zObjectStore
	 * @param LanguageFallback $languageFallback
	 */
	public function __construct( ZObjectStore $zObjectStore, LanguageFallback $languageFallback ) {
		parent::__construct( 'ListMissingLabels' );
		$this->zObjectStore = $zObjectStore;
		$this->languageFallback = $languageFallback;
		$this->langRegistry = ZLangRegistry::singleton();
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
		return $this->msg( 'wikilambda-special-missinglabels' );
	}

	/**
	 * Get and validate SpecialPage parameters from subpage and url
	 *
	 * @param string $subpage
	 * @return array - type ZID, lang ZID, excludePreDefined
	 */
	private function getParameters( $subpage ) {
		// Get language from Request.
		// * Can be empty string, valid or invalid Zid
		// * Default: User language
		$langZid = $this->getRequest()->getText( 'language' );
		if ( ( !$langZid ) || !ZObjectUtils::isValidZObjectReference( $langZid ) ) {
			$langCode = $this->getLanguage()->getCode();
			$langZid = $this->langRegistry->getLanguageZidFromCode( $langCode );
		}

		// Get type from subpage; overwrite with value from Request.
		// * subpage can be empty string or NULL or valid/invalid string
		// * requestType can be empty string or valid/invalid string
		// Default: Z8/Function
		$requestType = $this->getRequest()->getText( 'type' );
		if ( $requestType && ZObjectUtils::isValidZObjectReference( $requestType ) ) {
			$type = $requestType;
		} else {
			$type = $subpage && ZObjectUtils::isValidZObjectReference( $subpage ) ?
				$subpage : ZTypeRegistry::Z_FUNCTION;
		}

		$excludePreDefined = $this->getRequest()->getBool( 'excludePreDefined' );

		return [ $type, $langZid, $excludePreDefined ];
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $subpage ) {
		// Get and validate page parameters
		[ $type, $langZid, $excludePreDefined ] = $this->getParameters( $subpage );

		// Set headers
		$this->setHeaders();
		$this->outputHeader( 'wikilambda-special-missinglabels-summary' );

		// Set output
		$output = $this->getOutput();
		$output->enableOOUI();
		$output->addModuleStyles( [ 'mediawiki.special' ] );

		// TODO (T300519): Make this help page.
		$this->addHelpLink( 'Help:Wikifunctions/Missing labels' );

		// Get list of fallback language Zids
		$languageZids = $this->langRegistry->getListOfFallbackLanguageZids(
			$this->languageFallback,
			$this->getLanguage()->getCode()
		);

		// Add selected language at the start of the array; this way
		// we will identify objects with missing label in langZid by
		// checking that the preferred label is not in langZid.
		// The label displayed in the list will be then the one in the
		// user language or its closes fallback. Also, remove duplicates
		// in case the selected language is the same as user language.
		array_unshift( $languageZids, $langZid );
		$languageZids = array_unique( $languageZids );

		// Build BasicZObjectPager for the given filters
		$filters = [
			'type' => $type,
			'missing_language' => $langZid
		];
		$pager = new BasicZObjectPager(
			$this->getContext(),
			$this->zObjectStore,
			$languageZids,
			null,
			$excludePreDefined,
			$filters
		);

		// Add the header form
		$output->addHTML( $this->getHeaderForm( $type, $langZid ) );

		// Add the top pagination controls
		$output->addHTML( $pager->getNavigationBar() );
		// Add the item list body
		$output->addWikiTextAsInterface( $pager->getBody() );
		// Add the bottom pagination controls
		$output->addHTML( $pager->getNavigationBar() );

		// Add bottom pagination controls
		$output->addWikiTextAsInterface( $pager->getBottomLinks() );
	}

	/**
	 * Render the header for listing ZObjects by a specific type
	 * with missing labels in the given language.
	 *
	 * @param string $typeZid - The type of ZObjects being listed.
	 * @param string $langZid - The selected language Zid.
	 * @return string - The text for the header.
	 */
	private function getHeaderTitle( $typeZid, $langZid ) {
		$typeLabel = $this->zObjectStore->fetchZObjectLabel( $typeZid, $this->getLanguage()->getCode() );
		$langLabel = $this->zObjectStore->fetchZObjectLabel( $langZid, $this->getLanguage()->getCode() );
		return $this->msg( 'wikilambda-special-missinglabels-for-type' )
			->rawParams( htmlspecialchars( $typeLabel ), htmlspecialchars( $typeZid ), htmlspecialchars( $langLabel ) )
			->text();
	}

	/**
	 * Build the form to place at the head of the Special page,
	 * with a selector field for ZTypes and another for ZLanguages.
	 *
	 * @param string $typeZid
	 * @param string $langZid
	 * @return string
	 */
	public function getHeaderForm( $typeZid, $langZid ) {
		$formHeader = $this->getHeaderTitle( $typeZid, $langZid );
		$formDescriptor = [
			'type' => [
				'label' => 'Type',
				'class' => HTMLZTypeSelectField::class,
				'name' => 'type',
				'default' => $typeZid
			],
			'language' => [
				'label' => 'Language',
				'class' => HTMLZLanguageSelectField::class,
				'name' => 'language',
				'default' => $langZid
			],
			'excludePreDefined' => [
				'type' => 'check',
				'label' => $this->msg( 'wikilambda-special-objectsbytype-form-excludepredefined' )->text(),
				'name' => 'excludePreDefined',
				'default' => false
			]
		];

		$htmlForm = HTMLForm::factory( 'ooui', $formDescriptor, $this->getContext() )
			->setWrapperLegend( $formHeader )
			->setCollapsibleOptions( true )
			->setMethod( 'get' );
		return $htmlForm->prepareForm()->getHTML( false );
	}
}
