<?php

/**
 * WikiLambda integration test suite for Special:FunctionUsage.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Special;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\ClientStorage\WikifunctionsUsageStore;
use MediaWiki\Extension\WikiLambda\Special\SpecialFunctionUsage;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Tests\Specials\SpecialPageTestBase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Special\SpecialFunctionUsage
 * @group Database
 */
class SpecialFunctionUsageTest extends SpecialPageTestBase {

	private WikifunctionsUsageStore $usageStore;

	protected function setUp(): void {
		parent::setUp();
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', true );
		$this->usageStore = WikiLambdaServices::getWikifunctionsUsageStore();
	}

	protected function newSpecialPage(): SpecialFunctionUsage {
		return new SpecialFunctionUsage(
			WikiLambdaServices::getWikifunctionsUsageStore(),
			WikiLambdaServices::getZObjectStore()
		);
	}

	// ---------------------------------------------------------------
	// Execution and parameter handling
	// (tests run under language qqx, so messages render as their key)
	// ---------------------------------------------------------------

	public function testExecute_noTarget_showsOnlyTheForm() {
		[ $html ] = $this->executeSpecialPage();

		$this->assertStringContainsString( 'wikilambda-special-functionusage-form-function', $html );
		$this->assertStringNotContainsString( 'wikilambda-special-functionusage-count', $html );
		$this->assertStringNotContainsString( 'wikilambda-special-functionusage-empty', $html );
	}

	public function testExecute_invalidTarget_showsError() {
		[ $html ] = $this->executeSpecialPage( 'banana' );

		$this->assertStringContainsString( 'wikilambda-special-functionusage-invalid', $html );
		$this->assertStringNotContainsString( 'wikilambda-special-functionusage-count', $html );
	}

	public function testExecute_validTargetWithNoUsage_showsEmptyMessage() {
		[ $html ] = $this->executeSpecialPage( 'Z10001' );

		$this->assertStringContainsString( 'wikilambda-special-functionusage-empty', $html );
		$this->assertStringNotContainsString( 'wikilambda-special-functionusage-count', $html );
	}

	public function testExecute_validTarget_pointsToWhatLinksHereForInDefinitionUse() {
		// Shown even with no embedding usage, so an empty list does not read as "unused";
		// the link targets Special:WhatLinksHere for the Function.
		[ $html ] = $this->executeSpecialPage( 'Z10001' );

		$this->assertStringContainsString( 'wikilambda-special-functionusage-whatlinkshere', $html );
		$this->assertStringContainsString( 'WhatLinksHere', $html );
	}

	public function testExecute_validTargetWithUsage_listsPagesGroupedByWiki() {
		$this->usageStore->insertUsage( 'Z10001', 'enwiki', 101, NS_TEMPLATE, 'Template', 'Greeting' );
		$this->usageStore->insertUsage( 'Z10001', 'dewiki', 202, NS_MAIN, null, 'Begrüßung' );

		[ $html ] = $this->executeSpecialPage( 'Z10001' );

		$this->assertStringContainsString( 'wikilambda-special-functionusage-count', $html );
		// Wikis appear as group headings; foreign wikis are unknown to the test wiki, so
		// WikiMap falls back to the wiki ID for the heading and to plain text for the link.
		$this->assertStringContainsString( 'enwiki', $html );
		$this->assertStringContainsString( 'dewiki', $html );
		$this->assertStringContainsString( 'Template:Greeting', $html );
		$this->assertStringContainsString( 'Begrüßung', $html );
	}

	public function testExecute_functionRequestParam_overridesSubpage() {
		$this->usageStore->insertUsage( 'Z10005', 'enwiki', 303, NS_MAIN, null, 'Requested target page' );

		$request = new FauxRequest( [ 'function' => 'Z10005' ] );
		[ $html ] = $this->executeSpecialPage( 'Z9999', $request );

		$this->assertStringContainsString( 'wikilambda-special-functionusage-count', $html );
		$this->assertStringContainsString( 'Requested target page', $html );
	}

	public function testExecute_overTheLimit_showsNextLink() {
		for ( $i = 1; $i <= 51; $i++ ) {
			$this->usageStore->insertUsage( 'Z10002', 'enwiki', $i, NS_MAIN, null, "Page$i" );
		}

		[ $html ] = $this->executeSpecialPage( 'Z10002' );

		// 51 > the page limit of 50, so a "next" navigation link is shown.
		$this->assertStringContainsString( 'nextn', $html );
	}

	public function testExecute_withOffset_showsPrevLink() {
		for ( $i = 1; $i <= 51; $i++ ) {
			$this->usageStore->insertUsage( 'Z10003', 'enwiki', $i, NS_MAIN, null, "Pg$i" );
		}

		$request = new FauxRequest( [ 'offset' => '50' ] );
		[ $html ] = $this->executeSpecialPage( 'Z10003', $request );

		$this->assertStringContainsString( 'prevn', $html );
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
		$this->assertFalse( $page->userCanExecute( $this->getTestUser()->getUser() ) );
	}

	public function testUserCanExecute_repoMode_returnsTrueForRegularUser() {
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', true );
		$page = $this->newSpecialPage();
		$page->setContext( RequestContext::getMain() );
		$this->assertTrue( $page->userCanExecute( $this->getTestUser()->getUser() ) );
	}
}
