<?php

/**
 * WikiLambda integration test suite for the ViewAbstract special page
 *
 * @copyright 2020– WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Special;

use MediaWiki\Context\RequestContext;
use MediaWiki\Exception\ErrorPageError;
use MediaWiki\Exception\PermissionsError;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent;
use MediaWiki\Extension\WikiLambda\Special\SpecialCreateAbstract;
use MediaWiki\Extension\WikiLambda\Tests\Integration\MockWikidataEntityLookupTrait;
use MediaWiki\Permissions\Authority;
use MediaWiki\Tests\Specials\SpecialPageTestBase;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Special\SpecialCreateAbstract
 * @group Database
 */
class SpecialCreateAbstractTest extends SpecialPageTestBase {
	use MockWikidataEntityLookupTrait;

	private const TEST_ABSTRACT_NS = 2300;

	private Authority $performer;

	protected function setUp(): void {
		parent::setUp();

		$this->performer = $this->getTestUser()->getAuthority();

		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', false );
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractMode', true );

		// Mock for all test suite: Q42 and Q319 exist, Q999999 doesn't
		$this->mockWikidataEntityLookup( [
			'Q42' => [ 'en' => 'Douglas Adams' ],
			'Q319' => [ 'en' => 'Jupiter' ]
		] );
	}

	/**
	 * @inheritDoc
	 */
	protected function newSpecialPage(): SpecialCreateAbstract {
		return $this->getServiceContainer()->getSpecialPageFactory()->getPage( 'CreateAbstract' );
	}

	public function testExecuteThrowsIfAbstractModeDisabled(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractMode', false );

		$this->expectException( ErrorPageError::class );

		$this->executeSpecialPage(
			/* subpage */ 'Q42',
			/* request */ null,
			/* language */ null,
			/* performer */ $this->performer
		);
	}

	public function testExecuteThrowsIfLoggedOut(): void {
		$this->expectException( PermissionsError::class );

		$this->executeSpecialPage(
			/* subpage */ 'Q42',
			/* request */ null,
			/* language */ null,
			/* performer */ null
		);
	}

	public function testRedirectToViewPage(): void {
		$qid = 'Q42';
		$title = Title::newFromText( $qid, self::TEST_ABSTRACT_NS );
		$content = new AbstractWikiContent( json_encode( [
			'qid' => $qid,
			'sections' => [
				'Q8776414' => [
					'index' => 0,
					'fragments' => [ 'Z89' ]
				]
			]
		] ) );

		$page = $this->editPage( $title, $content, 'creating', self::TEST_ABSTRACT_NS );
		$request = RequestContext::getMain()->getRequest();

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'Q42',
			/* request */ $request,
			/* language */ 'en',
			/* performer */ $this->performer
		);

		$location = $response->getHeader( 'Location' );

		$expectedUrl = 'Special:ViewAbstract/en/Abstract_Wikipedia:Q42';
		$expectedParam = 'created=1';

		$this->assertStringContainsString( $expectedUrl, $location );
		$this->assertStringContainsString( $expectedParam, $location );
	}

	public function testCreateAbstractContent(): void {
		// Ensure page does not exist
		$title = Title::newFromText( 'Q319', self::TEST_ABSTRACT_NS );
		$this->assertFalse( $title->exists() );

		$context = RequestContext::getMain();
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'Q319',
			/* request */ $context->getRequest(),
			/* language */ null,
			/* performer */ null,
			/* fullHtml */ false,
			/* context */ $context
		);

		// No redirect expected
		$this->assertNull( $response->getHeader( 'Location' ) );

		// Ensure output has the appropriate config vars
		$output = $context->getOutput();
		$jsVars = $output->getJsConfigVars();

		$this->assertArrayHasKey( 'wgWikiLambda', $jsVars );

		$wikiLambdaVars = $jsVars['wgWikiLambda'];

		$this->assertTrue( $wikiLambdaVars['abstractContent'] );
		$this->assertTrue( $wikiLambdaVars['createNewPage'] );
		$this->assertSame( 'Q319', $wikiLambdaVars['title'] );
		$this->assertSame( 'en', $wikiLambdaVars['zlang'] );
		$this->assertFalse( $wikiLambdaVars['viewmode'] );
		$this->assertArrayHasKey( 'content', $wikiLambdaVars );

		$pageTitle = (string)$output->getPageTitle();
		$this->assertStringContainsString( 'ext-wikilambda-editpage-header', $pageTitle );
		$this->assertStringContainsString( 'ext-wikilambda-editpage-header__qid', $pageTitle );
		$this->assertStringContainsString( '>Q319<', $pageTitle );
		$this->assertStringContainsString(
			'Create a New Abstract Article for Q319',
			$pageTitle
		);
	}

	public function testCreateAbstractContent_failsWithNonExistingItemId(): void {
		// Ensure page does not exist
		$title = Title::newFromText( 'Q999999', self::TEST_ABSTRACT_NS );
		$this->assertFalse( $title->exists() );

		$context = RequestContext::getMain();
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'Q999999',
			/* request */ $context->getRequest(),
			/* language */ null,
			/* performer */ null,
			/* fullHtml */ false,
			/* context */ $context
		);

		// Redirects to main CreateAbstract page
		$location = $response->getHeader( 'Location' );
		$expectedUrl = 'Special:CreateAbstract';

		$this->assertStringContainsString( $expectedUrl, $location );
		$this->assertStringNotContainsString( 'Q999999', $location );
	}

	public function testCreateAbstractSetsPageTitleWithoutQid(): void {
		$context = RequestContext::getMain();
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ '',
			/* request */ $context->getRequest(),
			/* language */ null,
			/* performer */ null,
			/* fullHtml */ false,
			/* context */ $context
		);

		$this->assertNull( $response->getHeader( 'Location' ) );

		$pageTitle = (string)$context->getOutput()->getPageTitle();
		$this->assertStringContainsString( 'ext-wikilambda-editpage-header', $pageTitle );
		$this->assertStringNotContainsString( 'ext-wikilambda-editpage-header__qid', $pageTitle );
		$this->assertStringContainsString(
			'Create a New Abstract Article',
			$pageTitle
		);
	}

	public function testRedirectsWhenQidNotOnWikidata(): void {
		$qid = 'Q999999';

		[ , $response ] = $this->executeSpecialPage(
			/* subpage */ $qid,
			/* request */ null,
			/* language */ null,
			/* performer */ $this->performer
		);

		$location = $response->getHeader( 'Location' );
		$this->assertNotNull( $location );
		$this->assertStringContainsString( 'Special:CreateAbstract', $location );
		$this->assertStringNotContainsString( $qid, $location );
	}
}
