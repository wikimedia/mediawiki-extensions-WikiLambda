<?php
/**
 * WikiLambda Special:ListObjectsByType page
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Special;

use MediaWiki\Extension\WikiLambda\Fields\HTMLZTypeSelectField;
use MediaWiki\Extension\WikiLambda\Pagers\BasicZObjectPager;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\HTMLForm\HTMLForm;
use MediaWiki\Languages\LanguageFallback;
use MediaWiki\SpecialPage\SpecialPage;
use MediaWiki\User\User;

class SpecialListObjectsByType extends SpecialPage {

	private ZObjectStore $zObjectStore;
	private LanguageFallback $languageFallback;
	private ZLangRegistry $langRegistry;

	/**
	 * @param ZObjectStore $zObjectStore
	 * @param LanguageFallback $languageFallback
	 */
	public function __construct( ZObjectStore $zObjectStore, LanguageFallback $languageFallback ) {
		parent::__construct( 'ListObjectsByType' );

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
		return $this->msg( 'wikilambda-special-objectsbytype' );
	}

	/** @inheritDoc */
	public function isListed() {
		// No usage allowed on client-mode wikis.
		return $this->getConfig()->get( 'WikiLambdaEnableRepoMode' );
	}

	/**
	 * @inheritDoc
	 *
	 * @param User $user
	 * @return bool
	 */
	public function userCanExecute( User $user ) {
		if ( !$this->getConfig()->get( 'WikiLambdaEnableRepoMode' ) ) {
			// No usage allowed on client-mode wikis.
			return false;
		}
		return parent::userCanExecute( $user );
	}

	/**
	 * Get and validate SpecialPage parameters from subpage and url
	 *
	 * @param string $subpage
	 * @return array - type ZID, orderby, bool excludePreDefined
	 */
	private function getParameters( $subpage ) {
		// Get type from subpage; overwrite with value from Request.
		// * requestType can be empty string or valid/invalid string
		// * subpage can be empty string or NULL or valid/invalid string
		// Default: Z8/Function
		$requestType = $this->getRequest()->getText( 'type' );
		if ( $requestType && ZObjectUtils::isValidZObjectReference( $requestType ) ) {
			$type = $requestType;
		} else {
			$type = $subpage && ZObjectUtils::isValidZObjectReference( $subpage ) ?
				$subpage :
				ZTypeRegistry::Z_FUNCTION;
		}

		// Get orderby from Request.
		// * can be empty string or valid/invalid string (name, latest, oldest)
		// Default: 'name'
		$requestOrderby = $this->getRequest()->getText( 'orderby' );
		$orderby = in_array( $requestOrderby, BasicZObjectPager::ORDER_BY_OPTIONS ) ?
			$requestOrderby :
			BasicZObjectPager::ORDER_BY_NAME;

		$excludePreDefined = $this->getRequest()->getBool( 'excludePreDefined' );

		return [ $type, $orderby, $excludePreDefined ];
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $subpage ) {
		// Get and validate page parameters
		[ $type, $orderby, $excludePreDefined ] = $this->getParameters( $subpage );

		// Set headers
		$this->setHeaders();
		$this->outputHeader( 'wikilambda-special-objectsbytype-summary' );

		// Set output
		$output = $this->getOutput();
		$output->enableOOUI();
		$output->addModuleStyles( [ 'mediawiki.special' ] );

		$this->addHelpLink( 'Help:Wikifunctions/Objects by type' );

		// Get list of fallback language Zids
		$languageZids = $this->langRegistry->getListOfFallbackLanguageZids(
			$this->languageFallback,
			$this->getLanguage()->getCode()
		);

		// Build BasicZObjectPager for the given filters
		$filters = [ 'type' => $type ];
		$pager = new BasicZObjectPager(
			$this->getContext(),
			$this->zObjectStore,
			$languageZids,
			$orderby,
			$excludePreDefined,
			$filters
		);

		// Add the header form
		$output->addHTML( $this->getHeaderForm( $type, $orderby ) );

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
	 * Render the header for listing ZObjects by a specific type.
	 *
	 * @param string $typeZid - The type Zid of ZObjects being listed.
	 * @return string - The text for the header.
	 */
	private function getHeaderTitle( $typeZid ) {
		$typeLabel = $this->zObjectStore->fetchZObjectLabel( $typeZid, $this->getLanguage()->getCode() );
		return $this->msg( 'wikilambda-special-objectsbytype-listheader' )
			->rawParams( htmlspecialchars( $typeLabel ?? $typeZid ), htmlspecialchars( $typeZid ) )
			->text();
	}

	/**
	 * Build the form to place at the head of the Special page,
	 * with a selector field for ZTypes and another for ZLanguages.
	 *
	 * @param string $typeZid
	 * @param string $orderby
	 * @return string
	 */
	public function getHeaderForm( string $typeZid, string $orderby ) {
		$formHeader = $this->getHeaderTitle( $typeZid );
		$formDescriptor = [
			'type' => [
				'label' => $this->msg( 'wikilambda-special-objectsbytype-form-type' )->text(),
				'class' => HTMLZTypeSelectField::class,
				'name' => 'type',
				'default' => $typeZid
			],
			'orderby' => [
				'label' => $this->msg( 'wikilambda-special-objectsbytype-form-orderby' )->text(),
				'type' => 'select',
				'name' => 'orderby',
				'options' => [
					$this->msg( 'wikilambda-special-objectsbytype-form-orderby-name' )
						->escaped() => BasicZObjectPager::ORDER_BY_NAME,
					$this->msg( 'wikilambda-special-objectsbytype-form-orderby-latest' )
						->escaped() => BasicZObjectPager::ORDER_BY_LATEST,
					$this->msg( 'wikilambda-special-objectsbytype-form-orderby-oldest' )
						->escaped() => BasicZObjectPager::ORDER_BY_OLDEST
				],
				'default' => $orderby
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
			->setCollapsibleOptions( false )
			->setMethod( 'get' );
		return $htmlForm->prepareForm()->getHTML( false );
	}
}
