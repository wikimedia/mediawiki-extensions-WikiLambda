<?php

/**
 * WikiLambda integration test suite for Special:ListObjectsByType
 * (and the BasicZObjectPager that powers it).
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Special;

use MediaWiki\Context\RequestContext;
use MediaWiki\Deferred\DeferredUpdates;
use MediaWiki\Extension\WikiLambda\Pagers\BasicZObjectPager;
use MediaWiki\Extension\WikiLambda\Special\SpecialListObjectsByType;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\MediaWikiServices;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Tests\Specials\SpecialPageTestBase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Pagers\AbstractZObjectPager
 * @covers \MediaWiki\Extension\WikiLambda\Pagers\BasicZObjectPager
 * @covers \MediaWiki\Extension\WikiLambda\Special\SpecialListObjectsByType
 * @group Database
 */
class SpecialListObjectsByTypeTest extends SpecialPageTestBase {

	private ZObjectStore $zObjectStore;

	protected function setUp(): void {
		parent::setUp();
		$this->zObjectStore = WikiLambdaServices::getZObjectStore();
	}

	/**
	 * Insert three Z8 functions in a fixed order. Names are deliberately staggered
	 * so that alphabetical, oldest-first (page_id asc) and latest-first (page_id desc)
	 * each produce a different sequence — otherwise an orderby test could pass
	 * even if the orderby branch were broken.
	 *
	 *   Edit order   ZID      Label              Return type
	 *   1st          Z10001   Charlie function   Z6
	 *   2nd          Z10002   Alpha function     Z40
	 *   3rd          Z10003   Bravo function     Z6
	 */
	public function addDBDataOnce() {
		$this->zObjectStore = WikiLambdaServices::getZObjectStore();
		$dataFile = dirname( __DIR__, 2 ) . '/test_data/special/objectsbytype.json';
		$data = json_decode( file_get_contents( $dataFile ) );
		$this->editPage( 'Z10001', json_encode( $data->Z10001 ), 'function Z10001', NS_MAIN );
		$this->editPage( 'Z10002', json_encode( $data->Z10002 ), 'function Z10002', NS_MAIN );
		$this->editPage( 'Z10003', json_encode( $data->Z10003 ), 'function Z10003', NS_MAIN );
		DeferredUpdates::doUpdates();
	}

	protected function newSpecialPage(): SpecialListObjectsByType {
		$languageFallback = MediaWikiServices::getInstance()->getLanguageFallback();
		return new SpecialListObjectsByType( $this->zObjectStore, $languageFallback );
	}

	// ---------------------------------------------------------------
	// Execution and parameter handling
	// ---------------------------------------------------------------

	public function testExecute_default_listsAllFunctionsAlphabetically() {
		[ $html ] = $this->executeSpecialPage();
		$this->assertStringContainsString( 'Alpha function', $html );
		$this->assertStringContainsString( 'Bravo function', $html );
		$this->assertStringContainsString( 'Charlie function', $html );
		$this->assertMatchesRegularExpression(
			'/Alpha function(.|\n)*Bravo function(.|\n)*Charlie function/',
			$html
		);
	}

	public function testExecute_filterByReturnType_Z6_listsOnlyMatchingFunctions() {
		$request = new FauxRequest( [ 'return_type' => 'Z6' ] );
		[ $html ] = $this->executeSpecialPage( '', $request );
		$this->assertStringContainsString( 'Bravo function', $html );
		$this->assertStringContainsString( 'Charlie function', $html );
		$this->assertStringNotContainsString( 'Alpha function', $html );
	}

	public function testExecute_filterByReturnType_Z40_listsOnlyMatchingFunctions() {
		$request = new FauxRequest( [ 'return_type' => 'Z40' ] );
		[ $html ] = $this->executeSpecialPage( '', $request );
		$this->assertStringContainsString( 'Alpha function', $html );
		$this->assertStringNotContainsString( 'Bravo function', $html );
		$this->assertStringNotContainsString( 'Charlie function', $html );
	}

	public function testExecute_filterByReturnType_Z1_isNoOp() {
		// Z1 is the universal supertype — the pager intentionally skips the
		// wlzl_return_type cond when asked for Z1, so all functions appear.
		$request = new FauxRequest( [ 'return_type' => 'Z1' ] );
		[ $html ] = $this->executeSpecialPage( '', $request );
		$this->assertStringContainsString( 'Alpha function', $html );
		$this->assertStringContainsString( 'Bravo function', $html );
		$this->assertStringContainsString( 'Charlie function', $html );
	}

	public function testExecute_invalidReturnType_fallsBackToZ1() {
		$request = new FauxRequest( [ 'return_type' => 'banana' ] );
		[ $html ] = $this->executeSpecialPage( '', $request );
		$this->assertStringContainsString( 'Alpha function', $html );
		$this->assertStringContainsString( 'Bravo function', $html );
		$this->assertStringContainsString( 'Charlie function', $html );
	}

	public function testExecute_filterByReturnTypeWithNoMatches_showsEmptyBody() {
		// No fixture function returns a Z14 (Implementation) — the listing
		// should be empty and show the type-specific empty message.
		// Tests run under language qqx, which renders messages as their raw key.
		$request = new FauxRequest( [ 'return_type' => 'Z14' ] );
		[ $html ] = $this->executeSpecialPage( '', $request );
		$this->assertStringNotContainsString( 'Alpha function', $html );
		$this->assertStringNotContainsString( 'Bravo function', $html );
		$this->assertStringNotContainsString( 'Charlie function', $html );
		$this->assertStringContainsString(
			'wikilambda-special-objectsbytype-empty', $html
		);
	}

	public function testExecute_typeFromSubpage_isUsed() {
		// No fixture object is of type Z4 — listing is empty.
		[ $html ] = $this->executeSpecialPage( 'Z4' );
		$this->assertStringNotContainsString( 'Alpha function', $html );
		$this->assertStringContainsString(
			'wikilambda-special-objectsbytype-empty', $html
		);
	}

	public function testExecute_typeRequestParam_overridesSubpage() {
		$request = new FauxRequest( [ 'type' => 'Z8' ] );
		[ $html ] = $this->executeSpecialPage( 'Z4', $request );
		$this->assertStringContainsString( 'Alpha function', $html );
	}

	public function testExecute_invalidType_fallsBackToFunction() {
		$request = new FauxRequest( [ 'type' => 'banana' ] );
		[ $html ] = $this->executeSpecialPage( '', $request );
		$this->assertStringContainsString( 'Alpha function', $html );
		$this->assertStringContainsString( 'Bravo function', $html );
	}

	public function testExecute_invalidOrderby_fallsBackToName() {
		$request = new FauxRequest( [ 'orderby' => 'banana' ] );
		[ $html ] = $this->executeSpecialPage( '', $request );
		$this->assertMatchesRegularExpression(
			'/Alpha function(.|\n)*Bravo function(.|\n)*Charlie function/',
			$html
		);
	}

	public function testExecute_orderByOldest_isPageIdAscending() {
		$request = new FauxRequest( [ 'orderby' => 'oldest' ] );
		[ $html ] = $this->executeSpecialPage( '', $request );
		// Edit order: Z10001 (Charlie) → Z10002 (Alpha) → Z10003 (Bravo).
		$this->assertMatchesRegularExpression(
			'/Charlie function(.|\n)*Alpha function(.|\n)*Bravo function/',
			$html
		);
	}

	public function testExecute_orderByLatest_isPageIdDescending() {
		$request = new FauxRequest( [ 'orderby' => 'latest' ] );
		[ $html ] = $this->executeSpecialPage( '', $request );
		$this->assertMatchesRegularExpression(
			'/Bravo function(.|\n)*Alpha function(.|\n)*Charlie function/',
			$html
		);
	}

	public function testExecute_pagination_respectsLimit() {
		$request = new FauxRequest( [ 'limit' => '1' ] );
		[ $html ] = $this->executeSpecialPage( '', $request );
		$this->assertStringContainsString( 'mw-pager-navigation-bar', $html );
		// Default orderby=name ⇒ Alpha is the first (and only) row at limit=1.
		$this->assertStringContainsString( 'Alpha function', $html );
		$this->assertStringNotContainsString( 'Bravo function', $html );
		$this->assertStringNotContainsString( 'Charlie function', $html );
	}

	public function testExecute_headerForm_hasActionAndAllFilterFields() {
		[ $html ] = $this->executeSpecialPage();

		$xpath = $this->htmlXPath( $html );

		$forms = $xpath->query( '//form' );
		$this->assertGreaterThan( 0, $forms->length, 'Expected a <form> element to be rendered' );
		$this->assertStringContainsString(
			'Special:ListObjectsByType',
			$forms->item( 0 )->getAttribute( 'action' )
		);

		foreach ( [ 'type', 'return_type', 'orderby', 'excludePreDefined' ] as $field ) {
			$matches = $xpath->query( "//*[@name='" . $field . "']" );
			$this->assertGreaterThan(
				0,
				$matches->length,
				"Expected the form to contain an element with name='$field'"
			);
		}
	}

	/**
	 * Build a DOMXPath over an HTML fragment, suppressing libxml's HTML5 parser
	 * warnings so assertions can target the structure rather than its serialised
	 * representation (quote style, attribute order, ID scheme).
	 */
	private function htmlXPath( string $html ): \DOMXPath {
		$doc = new \DOMDocument();
		libxml_use_internal_errors( true );
		$doc->loadHTML( '<?xml encoding="UTF-8">' . $html, LIBXML_NOERROR );
		libxml_clear_errors();
		return new \DOMXPath( $doc );
	}

	// ---------------------------------------------------------------
	// Repo / client mode gating
	// ---------------------------------------------------------------

	public function testIsListed_repoMode_true() {
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', true );
		$page = $this->newSpecialPage();
		$page->setContext( RequestContext::getMain() );
		$this->assertTrue( $page->isListed() );
	}

	public function testIsListed_clientMode_false() {
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', false );
		$page = $this->newSpecialPage();
		$page->setContext( RequestContext::getMain() );
		$this->assertFalse( $page->isListed() );
	}

	public function testUserCanExecute_clientMode_returnsFalse() {
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', false );
		$page = $this->newSpecialPage();
		$page->setContext( RequestContext::getMain() );
		$this->assertFalse(
			$page->userCanExecute( $this->getTestUser()->getUser() )
		);
	}

	public function testUserCanExecute_repoMode_returnsTrueForRegularUser() {
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', true );
		$page = $this->newSpecialPage();
		$page->setContext( RequestContext::getMain() );
		$this->assertTrue(
			$page->userCanExecute( $this->getTestUser()->getUser() )
		);
	}

	// ---------------------------------------------------------------
	// BasicZObjectPager — direct unit-style coverage of the conds branches
	// ---------------------------------------------------------------

	private function newPager(
		array $filters,
		string $orderby = BasicZObjectPager::ORDER_BY_NAME
	): BasicZObjectPager {
		return new BasicZObjectPager(
			RequestContext::getMain(),
			$this->zObjectStore,
			[ 'Z1002' ],
			$orderby,
			false,
			$filters
		);
	}

	public function testPager_typeFilter_addsTypeCondition() {
		$info = $this->newPager( [ 'type' => 'Z8' ] )->getQueryInfo();
		$this->assertSame( 'Z8', $info['conds']['wlzl_type'] );
	}

	public function testPager_returnTypeFilter_addsReturnTypeCondition() {
		$info = $this->newPager(
			[ 'type' => 'Z8', 'return_type' => 'Z6' ]
		)->getQueryInfo();
		$this->assertSame( 'Z6', $info['conds']['wlzl_return_type'] );
	}

	public function testPager_returnTypeZ1_isNotAddedAsCondition() {
		$info = $this->newPager(
			[ 'type' => 'Z8', 'return_type' => 'Z1' ]
		)->getQueryInfo();
		$this->assertArrayNotHasKey( 'wlzl_return_type', $info['conds'] );
	}

	public function testPager_missingLanguageFilter_addsPositionalExpression() {
		// missing_language is the branch used by Special:ListMissingLabels
		// (the pager's other consumer); it appends an IExpression rather than
		// a keyed equality cond.
		$info = $this->newPager(
			[ 'type' => 'Z8', 'missing_language' => 'Z1002' ]
		)->getQueryInfo();
		$hasPositionalCond = false;
		foreach ( $info['conds'] as $key => $_cond ) {
			if ( is_int( $key ) ) {
				$hasPositionalCond = true;
				break;
			}
		}
		$this->assertTrue(
			$hasPositionalCond,
			'missing_language filter should append a positional condition'
		);
	}

	public function testPager_noFilters_addsNoConditions() {
		$info = $this->newPager( [] )->getQueryInfo();
		$this->assertSame( [], $info['conds'] );
	}

	public function testPager_emptyBody_overridesAbstractMessage() {
		// BasicZObjectPager replaces AbstractZObjectPager's generic
		// "wikilambda-special-list-empty" with the type-specific message.
		$body = $this->newPager( [ 'type' => 'Z8' ] )->getEmptyBody();
		$this->assertStringContainsString(
			'No persistent Objects found for this type.',
			$body
		);
	}
}
