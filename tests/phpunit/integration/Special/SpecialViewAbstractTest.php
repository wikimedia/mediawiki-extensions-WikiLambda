<?php

use MediaWiki\Context\RequestContext;
use MediaWiki\Exception\ErrorPageError;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent;
use MediaWiki\Extension\WikiLambda\Special\SpecialViewAbstract;
use MediaWiki\Permissions\Authority;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Storage\PageUpdateStatus;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Special\SpecialViewAbstract
 * @group Database
 */
class SpecialViewAbstractTest extends SpecialPageTestBase {

	private const TEST_ABSTRACT_NS = 2300;

	private Authority $performer;

	protected function setUp(): void {
		parent::setUp();

		$this->performer = $this->getTestUser()->getAuthority();

		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', false );
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractMode', true );
	}

	/**
	 * @inheritDoc
	 */
	protected function newSpecialPage(): SpecialViewAbstract {
		return $this->getServiceContainer()->getSpecialPageFactory()->getPage( 'ViewAbstract' );
	}

	/**
	 * @param string $qid
	 * @return PageUpdateStatus
	 */
	protected function createAbstractPageForQid( $qid ): PageUpdateStatus {
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
		return $this->editPage( $title, $content, 'create test aw content', self::TEST_ABSTRACT_NS );
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

	public function testNoSubpageRedirectToMain(): void {
		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ '',
			/* request */ null,
			/* language */ null,
			/* performer */ $this->performer
		);

		$location = $response->getHeader( 'Location' );

		$this->assertStringContainsString( 'Main Page', $location );
	}

	public function testMissingPageRedirectToMain(): void {
		// Ensure page does not exist
		$title = Title::newFromText( 'Q999999', self::TEST_ABSTRACT_NS );
		$this->assertFalse( $title->exists() );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Abstract Wikipedia:Q999999',
			/* request */ null,
			/* language */ null,
			/* performer */ $this->performer
		);

		$location = $response->getHeader( 'Location' );

		$this->assertStringContainsString( 'Main Page', $location );
	}

	public function testUnknownLangRedirectToMain(): void {
		$this->createAbstractPageForQid( 'Q42' );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'foo-bar/Abstract Wikipedia:Q42',
			/* request */ null,
			/* language */ null,
			/* performer */ $this->performer
		);

		$location = $response->getHeader( 'Location' );

		$this->assertStringContainsString( 'Main Page', $location );
	}

	public function testBadRevisionRedirectToMain(): void {
		$this->createAbstractPageForQid( 'Q42' );

		// Request for not existing revision
		$request = new FauxRequest( [ 'oldid' => 999999 ] );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Abstract Wikipedia:Q42',
			/* request */ $request,
			/* language */ 'en',
			/* performer */ $this->performer,
		);

		$location = $response->getHeader( 'Location' );

		$this->assertStringContainsString( 'Main Page', $location );
	}

	public function testOverwriteWithUselangProp(): void {
		$this->createAbstractPageForQid( 'Q42' );

		// uselang=es in the request should overwrite the context language
		$request = new FauxRequest( [ 'uselang' => 'es' ] );

		$context = RequestContext::getMain();
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );
		$context->setRequest( $request );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Abstract Wikipedia:Q42',
			/* request */ $request,
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

		$this->assertSame( 'Q42', $wikiLambdaVars['title'] );
		$this->assertSame( 'es', $wikiLambdaVars['zlang'] );
	}

	public function testRedirectNotice(): void {
		$this->createAbstractPageForQid( 'Q42' );

		// created=1 is passed on redirect from CreateAbstract special page
		$request = new FauxRequest( [ 'created' => 1 ] );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Abstract Wikipedia:Q42',
			/* request */ $request,
			/* language */ 'en',
			/* performer */ $this->performer,
			/* fullHtml */ true
		);

		// Check that the notice text appears in the page HTML
		$this->assertStringContainsString(
			'You were redirected from Special:CreateAbstract page as Qid is already created',
			$html
		);
	}

	public function testShowOldRevisionWarning(): void {
		$qid = 'Q42';
		$title = Title::newFromText( $qid, self::TEST_ABSTRACT_NS );

		// Create the content page and get first revision Id
		$initialContent = new AbstractWikiContent( json_encode( [
			'qid' => $qid,
			'sections' => [ 'Q8776414' => [ 'index' => 0, 'fragments' => [ 'Z89' ] ] ]
		] ) );
		$status = $this->editPage( $title, $initialContent, 'created', self::TEST_ABSTRACT_NS );
		$firstRevisionId = $status->getNewRevision()->getId();

		// Make an edit and get second revision Id
		$editedContent = new AbstractWikiContent( json_encode( [
			'qid' => $qid,
			'sections' => [ 'Q8776414' => [ 'index' => 0, 'fragments' => [ 'Z89', 'foo', 'bar' ] ] ]
		] ) );
		$status = $this->editPage( $title, $editedContent, 'create test aw content', self::TEST_ABSTRACT_NS );
		$lastRevisionId = $status->getNewRevision()->getId();

		// Ensure that the revision Ids are not the same
		$this->assertNotSame( $firstRevisionId, $lastRevisionId );

		// Request for old revision oldid=1
		$request = new FauxRequest( [ 'oldid' => $firstRevisionId ] );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Abstract Wikipedia:Q42',
			/* request */ $request,
			/* language */ 'en',
			/* performer */ $this->performer,
			/* fullHtml */ true
		);

		// Ensure that the old revision warning message is set
		$this->assertStringContainsString( 'id="mw-revision-info"', $html );
		$this->assertStringContainsString( 'cdx-message--warning mw-revision', $html );
	}

	public function testViewAbstractContent(): void {
		$this->createAbstractPageForQid( 'Q42' );

		$context = RequestContext::getMain();
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );

		[ $html, $response ] = $this->executeSpecialPage(
			/* subpage */ 'en/Abstract Wikipedia:Q42',
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
		$this->assertFalse( $wikiLambdaVars['createNewPage'] );
		$this->assertSame( 'Q42', $wikiLambdaVars['title'] );
		$this->assertSame( 'en', $wikiLambdaVars['zlang'] );
		$this->assertTrue( $wikiLambdaVars['viewmode'] );
		$this->assertArrayHasKey( 'content', $wikiLambdaVars );
	}
}
