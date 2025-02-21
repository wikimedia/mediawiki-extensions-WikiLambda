<?php

/**
 * WikiLambda integration test suite for hooks
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\HookHandler;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\MainConfigNames;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Specials\SpecialRecentChanges;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Hooks
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\PageRenderingHandler
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\PageEditingHandler
 * @group Database
 */
class HooksTest extends WikiLambdaIntegrationTestCase {
	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsRepoMode();
	}

	public function testOnMultiContentSave_otherNameSpace() {
		$invalidTitleText = 'This is a title';

		$invalidZIDStatus = $this->editPage(
			$invalidTitleText, ZTestType::TEST_ENCODING, 'Test content', NS_PROJECT
		);

		$this->assertTrue( $invalidZIDStatus->isOK() );

		$invalidTitle = Title::newFromText( $invalidTitleText, NS_PROJECT );
		$this->assertTrue( $invalidTitle->exists() );
	}

	public function testOnMultiContentSave_badTitle() {
		$invalidTitleText = 'Bad page title';

		$invalidZIDStatus = $this->editPage(
			$invalidTitleText, ZTestType::TEST_ENCODING, 'Test bad title', NS_MAIN
		);

		$this->assertFalse( $invalidZIDStatus->isOK() );
		$this->assertTrue( $invalidZIDStatus->hasMessage( 'wikilambda-invalidzobjecttitle' ) );

		$invalidTitle = Title::newFromText( $invalidTitleText, NS_MAIN );
		$this->assertFalse( $invalidTitle->exists() );
	}

	public function testOnMultiContentSave_badContent() {
		$invalidContent = '{"Z1K1": "Z3"}';

		$invalidZIDStatus = $this->editPage(
			ZTestType::TEST_ZID, $invalidContent, 'Test bad content', NS_MAIN
		);

		$this->assertFalse( $invalidZIDStatus->isOK() );
		$this->assertTrue( $invalidZIDStatus->hasMessage( 'wikilambda-invalidzobject' ) );
	}

	public function testRegisterExtension() {
		$zObjectTitle = Title::newFromText( 'Z1' );
		$this->assertTrue( $zObjectTitle->isContentPage() );

		$this->assertSame( 'zobject', CONTENT_MODEL_ZOBJECT ?? '' );
		$this->assertSame( CONTENT_MODEL_ZOBJECT, $zObjectTitle->getContentModel() );

		$this->assertFalse( $zObjectTitle->isWikitextPage() );

		global $wgNonincludableNamespaces;
		$this->assertArrayHasKey( NS_MAIN, $wgNonincludableNamespaces );

		global $wgNamespaceProtection;
		$this->assertContains( 'wikilambda-edit', $wgNamespaceProtection[NS_MAIN] );
		$this->assertContains( 'wikilambda-create', $wgNamespaceProtection[NS_MAIN] );
	}

	public function testOnNamespaceIsMovable() {
		$zObjectTitle = Title::newFromText( 'Z1' );
		$this->assertFalse( $zObjectTitle->isMovable() );

		$zObjectTalkTitle = Title::newFromText( 'Z1', NS_TALK );
		$this->assertTrue( $zObjectTalkTitle->isMovable() );
	}

	protected function getRecentChangesPage(): SpecialRecentChanges {
		return new SpecialRecentChanges(
			$this->getServiceContainer()->getWatchedItemStore(),
			$this->getServiceContainer()->getMessageParser(),
			$this->getServiceContainer()->getUserOptionsLookup(),
			$this->getServiceContainer()->getChangeTagsStore()
		);
	}

	public function testOnHtmlPageLinkRendererEnd_noDoubleEscape() {
		$createdStatus = $this->editPage(
			ZTestType::TEST_ZID, ZTestType::TEST_HTML_ESCAPE, 'Test html escape', NS_MAIN
		);

		$this->assertTrue( $createdStatus->isOK() );

		$context = RequestContext::getMain();

		$context->setTitle( Title::newFromText( __METHOD__ ) );
		$context->setRequest( new FauxRequest );

		// Confirm that the test page is in RC and the label was escaped exactly
		// once.
		$rc1 = $this->getRecentChangesPage();
		$rc1->setContext( $context );
		$rc1->execute( null );
		$this->assertStringContainsString( "&lt;&lt;&lt;&gt;&gt;&gt;", $rc1->getOutput()->getHTML() );
	}

	/**
	 * @dataProvider provideChangedTargetToViewUrl
	 */
	public function testChangedTargetToViewUrl(
		$target, $expected, $create = true, $existing = true, $label = null, $attribs = [], $query = [], $lang = 'en'
	) {
		$this->overrideConfigValue( MainConfigNames::ArticlePath, '/wiki/$1' );
		$this->registerLangs( [ 'en', 'fr' ] );
		$linkRenderer = $this->getServiceContainer()->getLinkRenderer();

		$targetTitle = Title::newFromDBkey( $target );
		$this->setUserLang( $lang );

		if ( $create ) {
			$this->insertZids( [ $target ] );
		}

		if ( $existing ) {
			$renderedLink = $linkRenderer->makeKnownLink( $targetTitle, $label, $attribs, $query );
		} else {
			$renderedLink = $linkRenderer->makeBrokenLink( $targetTitle, $label, $attribs, $query );
		}

		$this->assertEquals(
			$expected,
			$renderedLink
		);
	}

	public function provideChangedTargetToViewUrl() {
		// Note that URLs with '&'s in them have them encoded to '&amp;' by the hook to be HTML-safe.

		yield 'English, default label, ZID, /view link' => [
			'Z1',
			'<a href="/view/en/Z1" title="Z1">Object (<span dir="ltr">Z1</span>)</a>'
		];

		yield 'English, fallback redlink label, ZID, /view link' => [
			'Z2',
			'<a href="/wiki/Z2?action=edit&amp;uselang=en&amp;redlink=1" class="new" '
				. 'title="Z2 (page does not exist)"><span dir="ltr">Z2</span></a>',
			false,
			false
		];

		yield 'English, custom label, no ZID, /view link' => [
			'Z1',
			'<a href="/view/en/Z1" title="Z1">hello</a>',
			true,
			true,
			'hello'
		];

		yield 'English, default label, ZID, action=edit link' => [
			'Z1',
			'<a href="/wiki/Z1?action=edit&amp;uselang=en" title="Z1">Object (<span dir="ltr">Z1</span>)</a>',
			true,
			true,
			null,
			[],
			[ 'action' => 'edit' ]
		];

		yield 'English, default label, ZID, action=edit link on oldid' => [
			'Z1',
			'<a href="/wiki/Z1?action=edit&amp;uselang=en&amp;oldid=1234" title="Z1">Object '
				. '(<span dir="ltr">Z1</span>)</a>',
			true,
			true,
			null,
			[],
			[ 'action' => 'edit', 'oldid' => '1234' ]
		];

		yield 'English, default label, ZID, action=history link' => [
			'Z1',
			'<a href="/wiki/Z1?action=history&amp;uselang=en" title="Z1">Object (<span dir="ltr">Z1</span>)</a>',
			true,
			true,
			null,
			[],
			[ 'action' => 'history' ]
		];

		yield 'English, default label, ZID, diff=prev link' => [
			'Z1',
			'<a href="/wiki/Z1?uselang=en&amp;diff=prev" title="Z1">Object (<span dir="ltr">Z1</span>)</a>',
			true,
			true,
			null,
			[],
			[ 'diff' => 'prev' ]
		];

		yield 'English, default label, ZID, oldid link' => [
			'Z1',
			'<a href="/wiki/Z1?uselang=en&amp;oldid=1234" title="Z1">Object (<span dir="ltr">Z1</span>)</a>',
			true,
			true,
			null,
			[],
			[ 'oldid' => '1234' ]
		];

		yield 'English, default label, ZID, unknown GET param preserved' => [
			'Z1',
			'<a href="/view/en/Z1?foo=bar" title="Z1">Object (<span dir="ltr">Z1</span>)</a>',
			true,
			true,
			null,
			[],
			[ 'foo' => 'bar' ]
		];

		yield 'French, fallback no label, ZID, /view link' => [
			'Z1',
			'<a href="/view/fr/Z1" title="Z1">Object (<span dir="ltr">Z1</span>)</a>',
			true,
			true,
			null,
			[],
			[],
			'fr'
		];

		yield 'Nonsense language, fallback no label, ZID, /view link' => [
			'Z1',
			'<a href="/view/en/Z1" title="Z1">Object (<span dir="ltr">Z1</span>)</a>',
			true,
			true,
			null,
			[],
			[],
			'hellothisisnotalanguage'
		];

		yield 'Talk pages are not over-ridden' => [
			'Talk:Z1',
			'<a href="/wiki/Talk:Z1" title="Talk:Z1">Talk:Z1</a>',
			false
		];

		// …
	}
}
