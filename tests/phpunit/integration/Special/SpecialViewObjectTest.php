<?php

/**
 * WikiLambda integration test suite for the ViewObject special page
 *
 * @copyright 2020– WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Special;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\Special\SpecialViewObject;
use MediaWiki\Extension\WikiLambda\ZObjectContent\ZObjectContent;
use MediaWiki\Permissions\Authority;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Tests\Specials\SpecialPageTestBase;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Special\SpecialViewObject
 * @group Database
 */
class SpecialViewObjectTest extends SpecialPageTestBase {

	private Authority $performer;

	protected function setUp(): void {
		parent::setUp();

		$this->performer = $this->getTestUser()->getAuthority();

		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', true );
	}

	/**
	 * @inheritDoc
	 */
	protected function newSpecialPage(): SpecialViewObject {
		return $this->getServiceContainer()->getSpecialPageFactory()->getPage( 'ViewObject' );
	}

	/**
	 * @param string $zid
	 */
	protected function createZObjectForZid( string $zid ): void {
		$title = Title::newFromText( $zid, NS_MAIN );
		$content = new ZObjectContent( json_encode( [
			'Z1K1' => 'Z2',
			'Z2K1' => [ 'Z1K1' => 'Z6', 'Z6K1' => $zid ],
			'Z2K2' => 'test',
			'Z2K3' => [ 'Z1K1' => 'Z12', 'Z12K1' => [ 'Z11' ] ],
		] ) );
		$this->editPage( $title, $content, 'create test zobject', NS_MAIN );
	}

	public function testNoSubpageRedirectsToMain(): void {
		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ '',
			/* request */ null,
			/* language */ null,
			/* performer */ $this->performer
		);

		$this->assertStringContainsString( 'Main_Page', $response->getHeader( 'Location' ) );
	}

	public function testMissingPageRedirectsToMain(): void {
		$title = Title::newFromText( 'Z999999', NS_MAIN );
		$this->assertFalse( $title->exists() );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Z999999',
			/* request */ null,
			/* language */ null,
			/* performer */ $this->performer
		);

		$this->assertStringContainsString( 'Main_Page', $response->getHeader( 'Location' ) );
	}

	public function testInvalidZidRedirectsToMain(): void {
		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/not-a-zid',
			/* request */ null,
			/* language */ null,
			/* performer */ $this->performer
		);

		$this->assertStringContainsString( 'Main_Page', $response->getHeader( 'Location' ) );
	}

	public function testBadRevisionRedirectsToMain(): void {
		$this->createZObjectForZid( 'Z10000' );

		$request = new FauxRequest( [ 'oldid' => 999999 ] );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Z10000',
			/* request */ $request,
			/* language */ null,
			/* performer */ $this->performer
		);

		$this->assertStringContainsString( 'Main_Page', $response->getHeader( 'Location' ) );
	}

	public function testUselangOverridesSubpageLanguage(): void {
		$this->createZObjectForZid( 'Z10000' );

		$request = new FauxRequest( [ 'uselang' => 'es' ] );

		$context = RequestContext::getMain();
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );
		$context->setRequest( $request );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Z10000',
			/* request */ $request,
			/* language */ null,
			/* performer */ null,
			/* fullHtml */ false,
			/* context */ $context
		);

		$this->assertNull( $response->getHeader( 'Location' ) );

		$output = $context->getOutput();
		$jsVars = $output->getJsConfigVars();
		$this->assertArrayHasKey( 'wgWikiLambda', $jsVars );
		$this->assertSame( 'Z10000', $jsVars['wgWikiLambda']['zId'] );
	}

	public function testShowOldRevisionWarning(): void {
		$zid = 'Z10000';
		$title = Title::newFromText( $zid, NS_MAIN );

		$initialContent = new ZObjectContent( json_encode( [
			'Z1K1' => 'Z2',
			'Z2K1' => [ 'Z1K1' => 'Z6', 'Z6K1' => $zid ],
			'Z2K2' => 'first content',
			'Z2K3' => [ 'Z1K1' => 'Z12', 'Z12K1' => [ 'Z11',
				[ 'Z1K1' => 'Z11', 'Z11K1' => 'Z1002', 'Z11K2' => 'first label' ]
			] ]
		] ) );
		$status = $this->editPage( $title, $initialContent, 'first revision', NS_MAIN );
		$firstRevisionId = $status->getNewRevision()->getId();

		$editedContent = new ZObjectContent( json_encode( [
			'Z1K1' => 'Z2',
			'Z2K1' => [ 'Z1K1' => 'Z6', 'Z6K1' => $zid ],
			'Z2K2' => 'second content',
			'Z2K3' => [ 'Z1K1' => 'Z12', 'Z12K1' => [ 'Z11',
				[ 'Z1K1' => 'Z11', 'Z11K1' => 'Z1002', 'Z11K2' => 'second label' ]
			] ]
		] ) );
		$status = $this->editPage( $title, $editedContent, 'second revision', NS_MAIN );
		$lastRevisionId = $status->getNewRevision()->getId();

		$this->assertNotSame( $firstRevisionId, $lastRevisionId );

		$request = new FauxRequest( [ 'oldid' => $firstRevisionId ] );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Z10000',
			/* request */ $request,
			/* language */ 'en',
			/* performer */ $this->performer,
			/* fullHtml */ true
		);

		$this->assertStringContainsString( 'id="mw-revision-info"', $html );
		$this->assertStringContainsString( 'cdx-message--warning mw-revision', $html );
	}

	// (T417203) Assert the title is the correct revision
	public function testShowOldRevisionTitle(): void {
		$zid = 'Z10000';
		$title = Title::newFromText( $zid, NS_MAIN );

		$initialContent = new ZObjectContent( json_encode( [
			'Z1K1' => 'Z2',
			'Z2K1' => [ 'Z1K1' => 'Z6', 'Z6K1' => $zid ],
			'Z2K2' => 'first content',
			'Z2K3' => [ 'Z1K1' => 'Z12', 'Z12K1' => [ 'Z11',
				[ 'Z1K1' => 'Z11', 'Z11K1' => 'Z1002', 'Z11K2' => 'first label' ]
			] ]
		] ) );
		$status = $this->editPage( $title, $initialContent, 'first revision', NS_MAIN );
		$firstRevisionId = $status->getNewRevision()->getId();

		$editedContent = new ZObjectContent( json_encode( [
			'Z1K1' => 'Z2',
			'Z2K1' => [ 'Z1K1' => 'Z6', 'Z6K1' => $zid ],
			'Z2K2' => 'second content',
			'Z2K3' => [ 'Z1K1' => 'Z12', 'Z12K1' => [ 'Z11',
				[ 'Z1K1' => 'Z11', 'Z11K1' => 'Z1002', 'Z11K2' => 'second label' ]
			] ]
		] ) );
		$status = $this->editPage( $title, $editedContent, 'second revision', NS_MAIN );
		$lastRevisionId = $status->getNewRevision()->getId();

		$this->assertNotSame( $firstRevisionId, $lastRevisionId );

		$request = new FauxRequest( [ 'oldid' => $firstRevisionId ] );

		$context = RequestContext::getMain();
		$context->setRequest( $request );
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Z10000',
			/* request */ $request,
			/* language */ null,
			/* performer */ null,
			/* fullHtml */ false,
			/* context */ $context
		);

		// (T417203) Assert the title is the correct revision
		$this->assertStringContainsString( 'first label', $context->getOutput()->getPageTitle() );
	}

	public function testViewObjectContent(): void {
		$this->createZObjectForZid( 'Z10000' );

		$context = RequestContext::getMain();
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Z10000',
			/* request */ $context->getRequest(),
			/* language */ null,
			/* performer */ null,
			/* fullHtml */ false,
			/* context */ $context
		);

		$this->assertNull( $response->getHeader( 'Location' ) );

		$output = $context->getOutput();
		$jsVars = $output->getJsConfigVars();

		$this->assertArrayHasKey( 'wgWikiLambda', $jsVars );
		$wikiLambdaVars = $jsVars['wgWikiLambda'];

		$this->assertFalse( $wikiLambdaVars['createNewPage'] );
		$this->assertSame( 'Z10000', $wikiLambdaVars['zId'] );
		$this->assertTrue( $wikiLambdaVars['viewmode'] );
	}
}
