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

use MediaWiki\Extension\WikiLambda\Pagers\ZObjectAlphabeticPager;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\HTMLForm\HTMLForm;
use MediaWiki\Languages\LanguageFallback;
use MediaWiki\SpecialPage\SpecialPage;

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

	/**
	 * Get and validate SpecialPage parameters from url
	 *
	 * @return array - int min, int max, bool connected, bool pending, bool pass, bool fail
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

		return [ $min, $max, $connected, $pending, $pass, $fail ];
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $subpage ) {
		// Get and validate page parameters
		[ $min, $max, $connected, $pending, $pass, $fail ] = $this->getParameters();

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

		// TODO (T300519): Make this help page.
		$this->addHelpLink( 'Help:Wikifunctions/Functions by Test status' );

		// Get list of fallback language Zids
		$languageZids = $this->langRegistry->getListOfFallbackLanguageZids(
			$this->languageFallback,
			$this->getLanguage()->getCode()
		);

		// Build ZObjectAlphabeticalPager for the given filters
		$filters = [
			'type' => ZTypeRegistry::Z_FUNCTION,
			'testfilters' => [
				'min' => $min,
				'max' => $max,
				'connected' => $connected,
				'pending' => $pending,
				'pass' => $pass,
				'fail' => $fail
			]
		];

		$pager = new ZObjectAlphabeticPager( $this->getContext(), $this->zObjectStore, $filters, $languageZids );

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
		return $this->msg( 'wikilambda-special-functionsbytests-formheader' )->text();
	}

	/**
	 * Build the form to place at the head of the Special page
	 *
	 * @return string
	 */
	public function getHeaderForm() {
		$formHeader = $this->msg( 'wikilambda-special-functionsbytests-form-header' )->text();
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