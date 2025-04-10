<?php
/**
 * WikiLambda Special:ListFunctionsByTests page
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Special;

use MediaWiki\Extension\WikiLambda\Pagers\FunctionsByTestsPager;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\HTMLForm\HTMLForm;
use MediaWiki\Languages\LanguageFallback;
use MediaWiki\SpecialPage\SpecialPage;
use MediaWiki\User\User;

class SpecialListFunctionsByTests extends SpecialPage {

	private ZObjectStore $zObjectStore;
	private LanguageFallback $languageFallback;
	private ZLangRegistry $langRegistry;

	/**
	 * @param ZObjectStore $zObjectStore
	 * @param LanguageFallback $languageFallback
	 */
	public function __construct( ZObjectStore $zObjectStore, LanguageFallback $languageFallback ) {
		parent::__construct( 'ListFunctionsByTests' );

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
		return $this->msg( 'wikilambda-special-functionsbytests' );
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
	 * Get and validate SpecialPage parameters from url
	 *
	 * @return array - int min, int max, bool connected, bool pending, bool pass, bool fail, bool excludePreDefined
	 */
	private function getParameters() {
		// Get max test count from request
		// Default: 0 (no lower limit)
		$min = $this->getRequest()->getText( 'min' );
		$min = is_numeric( $min ) ? (int)$min : 0;

		// Get max test count from request
		// Default: -1 (no upper limit)
		$max = $this->getRequest()->getText( 'max' );
		$max = is_numeric( $max ) ? (int)$max : -1;

		// Get boolean value connected from request
		// Default: false (filter by only connected tests)
		$status = $this->getRequest()->getArray( 'status' );
		$connected = is_array( $status ) ? in_array( 'connected', $status ) : false;
		$pending = is_array( $status ) ? in_array( 'pending', $status ) : false;

		// Get boolean value passing from request
		// Default: false (filter by only passing tests)
		$result = $this->getRequest()->getArray( 'result' );
		$pass = is_array( $result ) ? in_array( 'pass', $result ) : false;
		$fail = is_array( $result ) ? in_array( 'fail', $result ) : false;

		$excludePreDefined = $this->getRequest()->getBool( 'excludePreDefined' );

		return [ $min, $max, $connected, $pending, $pass, $fail, $excludePreDefined ];
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $subpage ) {
		if ( !$this->userCanExecute( $this->getUser() ) ) {
			$this->displayRestrictionError();
		}

		// Get and validate page parameters
		[ $min, $max, $connected, $pending, $pass, $fail, $excludePreDefined ] = $this->getParameters();

		// Set headers
		$this->setHeaders();
		$this->outputHeader( 'wikilambda-special-functionsbytests-summary' );

		// Set output
		$output = $this->getOutput();
		$output->enableOOUI();
		$output->addModuleStyles( [
			'mediawiki.special',
			'ext.wikilambda.special.styles'
		] );

		$this->addHelpLink( 'Help:Wikifunctions/Functions by Test status' );

		// Get list of fallback language ZIDs
		$languageZids = $this->langRegistry->getListOfFallbackLanguageZids(
			$this->languageFallback,
			$this->getLanguage()->getCode()
		);

		// Build FunctionsByTestsPager with the given filters
		$filters = [
			'min' => $min,
			'max' => $max,
			'connected' => $connected,
			'pending' => $pending,
			'pass' => $pass,
			'fail' => $fail
		];
		$pager = new FunctionsByTestsPager(
			$this->getContext(),
			$this->zObjectStore,
			$languageZids,
			$excludePreDefined,
			$filters
		);

		// Add the header form
		$output->addHTML( $this->getHeaderForm() );

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
	 * Render the header for listing Functions filtered by their test status
	 *
	 * @return string - The wikitext for the header.
	 */
	private function getHeaderTitle() {
		return $this->msg( 'wikilambda-special-functionsbytests-form-header' )->text();
	}

	/**
	 * Build the form to place at the head of the Special page
	 *
	 * @return string
	 */
	public function getHeaderForm() {
		$formHeader = $this->getHeaderTitle();
		$formDescriptor = [
			'min' => [
				'label' => $this->msg( 'wikilambda-special-functionsbytests-form-min' )->text(),
				'help' => $this->msg( 'wikilambda-special-functionsbytests-form-min-help' )->escaped(),
				'type' => 'int',
				'name' => 'min',
				'cssclass' => 'ext-wikilambda-special-tests-min',
				'section' => 'matchrange'
			],
			'max' => [
				'label' => $this->msg( 'wikilambda-special-functionsbytests-form-max' )->text(),
				'help' => $this->msg( 'wikilambda-special-functionsbytests-form-max-help' )->escaped(),
				'type' => 'int',
				'name' => 'max',
				'cssclass' => 'ext-wikilambda-special-tests-max',
				'section' => 'matchrange'
			],
			'status' => [
				'type' => 'multiselect',
				'label' => $this->msg( 'wikilambda-special-functionsbytests-form-status' )->text(),
				'name' => 'status',
				'options' => [
					$this->msg( 'wikilambda-special-functionsbytests-form-status-connected' )->escaped() => 'connected',
					$this->msg( 'wikilambda-special-functionsbytests-form-status-pending' )->escaped() => 'pending'
				],
				'default' => [],
			],
			'result' => [
				'type' => 'multiselect',
				'label' => $this->msg( 'wikilambda-special-functionsbytests-form-result' )->text(),
				'name' => 'result',
				'options' => [
					$this->msg( 'wikilambda-special-functionsbytests-form-result-pass' )->escaped() => 'pass',
					$this->msg( 'wikilambda-special-functionsbytests-form-result-fail' )->escaped() => 'fail'
				],
				'default' => [],
			],
			'excludePreDefined' => [
				'type' => 'check',
				'label' => $this->msg( 'wikilambda-special-objectsbytype-form-excludepredefined' )->text(),
				'name' => 'excludePreDefined',
				'default' => false
			]
		];

		$htmlForm = HTMLForm::factory( 'ooui', $formDescriptor, $this->getContext() )
			->setFormIdentifier( 'testfilters' )
			->setWrapperLegend( $formHeader )
			->setCollapsibleOptions( true )
			->setMethod( 'get' );
		return $htmlForm->prepareForm()->getHTML( false );
	}
}
