<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Renderer;

use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent;
use MediaWiki\Extension\WikiLambda\Renderer\WikifunctionsSanitiserTokenHandler;
use MediaWiki\Extension\WikiLambda\Tests\Integration\AbstractModeTestConfigTrait;
use MediaWiki\Logger\LoggerFactory;
use MediaWikiIntegrationTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Renderer\WikifunctionsSanitiserTokenHandler
 * @group Database
 */
class WikifunctionsSanitiserTokenHandlerTest extends MediaWikiIntegrationTestCase {
	use AbstractModeTestConfigTrait;

	protected function setUp(): void {
		parent::setUp();
		// The red-link cases below need abstract mode on and the abstract namespace
		// registered, so isEmptyAbstractArticle() can recognise a local AW link.
		$this->setUpAsAbstractMode();
	}

	/**
	 * @param string $html
	 * @param array<string, true> $blockedDomains
	 */
	private function sanitise( string $html, array $blockedDomains = [] ): string {
		return WikifunctionsSanitiserTokenHandler::sanitiseHtmlFragment(
			LoggerFactory::getInstance( 'WikiLambda' ),
			$html,
			$blockedDomains,
			null
		);
	}

	// ------------------------------------------------------------------
	// Reference-context link policy
	// ------------------------------------------------------------------

	public function testReferenceContextLinkAllowedWhenDomainNotBlocked() {
		$html = '<span class="ext-wikilambda-reference">'
			. '<a href="https://example.org/source">Source</a>'
			. '</span>';
		$result = $this->sanitise( $html );
		$this->assertStringContainsString( '<a href="https://example.org/source">Source</a>', $result );
	}

	public function testReferenceContextLinkBlockedWhenExactDomainIsBlocked() {
		$html = '<span class="ext-wikilambda-reference">'
			. '<a href="https://blocked.example.org/source">Source</a>'
			. '</span>';
		$result = $this->sanitise( $html, [ 'blocked.example.org' => true ] );
		$this->assertStringNotContainsString( '<a href=', $result );
		$this->assertStringContainsString( '&lt;a', $result );
	}

	public function testReferenceContextLinkBlockedWhenParentDomainIsBlocked() {
		// Domain suffix matching: blocking 'example.org' should also block 'sub.example.org'
		$html = '<span class="ext-wikilambda-reference">'
			. '<a href="https://sub.example.org/source">Source</a>'
			. '</span>';
		$result = $this->sanitise( $html, [ 'example.org' => true ] );
		$this->assertStringNotContainsString( '<a href=', $result );
		$this->assertStringContainsString( '&lt;a', $result );
	}

	public function testReferenceContextLinkAllowedWhenOnlyUnrelatedDomainIsBlocked() {
		$html = '<span class="ext-wikilambda-reference">'
			. '<a href="https://allowed.org/source">Source</a>'
			. '</span>';
		$result = $this->sanitise( $html, [ 'other.org' => true ] );
		$this->assertStringContainsString( '<a href="https://allowed.org/source">Source</a>', $result );
	}

	public function testSupReferenceContextLinkAllowed() {
		$html = '<sup class="ext-wikilambda-reference">'
			. '<a href="https://example.org/ref">Ref</a>'
			. '</sup>';
		$result = $this->sanitise( $html );
		$this->assertStringContainsString( '<a href="https://example.org/ref">Ref</a>', $result );
	}

	public function testDivReferenceContextLinkAllowed() {
		$html = '<div class="ext-wikilambda-reference">'
			. '<a href="https://example.org/ref">Ref</a>'
			. '</div>';
		$result = $this->sanitise( $html );
		$this->assertStringContainsString( '<a href="https://example.org/ref">Ref</a>', $result );
	}

	// ------------------------------------------------------------------
	// Standard (non-reference) link policy: external links always blocked
	// ------------------------------------------------------------------

	public function testExternalLinkOutsideReferenceContextIsBlocked() {
		$html = '<a href="https://example.org/source">External</a>';
		$result = $this->sanitise( $html );
		$this->assertStringNotContainsString( '<a href=', $result );
		$this->assertStringContainsString( '&lt;a', $result );
	}

	public function testExternalLinkOutsideReferenceContextIsBlockedEvenWithEmptyBlockedDomains() {
		// The non-reference policy blocks all external links regardless of blockedDomains
		$html = '<a href="https://example.org/source">External</a>';
		$result = $this->sanitise( $html, [] );
		$this->assertStringNotContainsString( '<a href=', $result );
		$this->assertStringContainsString( '&lt;a', $result );
	}

	// ------------------------------------------------------------------
	// Red-link (class="new") for local AW article links
	// ------------------------------------------------------------------

	private function localWikiUrl( string $titleText ): string {
		$config = $this->getServiceContainer()->getMainConfig();
		$server = $config->get( 'Server' );
		$articlePath = $config->get( 'ArticlePath' );
		$path = str_replace( '$1', wfUrlencode( str_replace( ' ', '_', $titleText ) ), $articlePath );
		return $server . $path;
	}

	private function localViewUrl( string $lang, string $titleText ): string {
		$server = $this->getServiceContainer()->getMainConfig()->get( 'Server' );
		return $server . '/view/' . $lang . '/' . wfUrlencode( str_replace( ' ', '_', $titleText ) );
	}

	public function testLocalAWLinkToNonExistentPageIsRedLink() {
		$url = $this->localWikiUrl( 'Abstract_Wikipedia:Q00000' );
		$result = $this->sanitise( '<a href="' . $url . '">Link</a>' );

		$this->assertStringContainsString( 'class="new"', $result,
			'A link to a non-existent AW article should have class="new"' );
	}

	public function testLocalNonAWLinkHasNoRedLinkClass() {
		// A link to a regular (non-AW) local page should pass through without class="new"
		$url = $this->localWikiUrl( 'Main_Page' );
		$result = $this->sanitise( '<a href="' . $url . '">Home</a>' );

		$this->assertStringNotContainsString( 'class="new"', $result );
		$this->assertStringContainsString( '<a href=', $result );
	}

	public function testLocalAWLinkToNonExistentPageIsRedLinkViaViewPath() {
		$url = $this->localViewUrl( 'en', 'Abstract_Wikipedia:Q00000' );
		$result = $this->sanitise( '<a href="' . $url . '">Link</a>' );

		$this->assertStringContainsString( 'class="new"', $result,
			'A link to a non-existent AW article via /view/ path should have class="new"' );
	}

	public function testLocalNonAWLinkHasNoRedLinkClassViaViewPath() {
		$url = $this->localViewUrl( 'en', 'Main_Page' );
		$result = $this->sanitise( '<a href="' . $url . '">Home</a>' );

		$this->assertStringNotContainsString( 'class="new"', $result );
		$this->assertStringContainsString( '<a href=', $result );
	}

	public function testLocalAWLinkToNonExistentPageIsRedLinkWithProtocolRelativeServer() {
		// Regression: in production $wgServer is protocol-relative (e.g. //abstract.wikipedia.org).
		// The host normalisation must strip the leading '//' so the link's host still matches the
		// local server; otherwise isEmptyAbstractArticle() never recognises the link as local and
		// no red-link class is added, even though the link still renders via the allow-list.
		$this->overrideConfigValue( 'Server', '//abstract.wikipedia.org' );
		$this->overrideConfigValue( 'CanonicalServer', 'https://abstract.wikipedia.org' );

		$url = 'https://abstract.wikipedia.org/wiki/Abstract_Wikipedia:Q00000';
		$result = $this->sanitise( '<a href="' . $url . '">Link</a>' );

		$this->assertStringContainsString( 'class="new"', $result,
			'Red-link class must still be applied when $wgServer is protocol-relative' );
	}

	public function testLocalAWLinkIsBlueWhenNotInAbstractMode() {
		// When not abstract mode, isEmptyAbstractArticle always return false
		$emptyContent = new AbstractWikiContent(
			'{ "qid": "Q88886", "sections": { "Q8776414": { "index": 0, "fragments": [ "Z89" ] } } }'
		);
		$this->editPage( 'Q88886', $emptyContent, 'empty AW page', 2300 );

		$this->overrideConfigValue( 'WikiLambdaEnableAbstractMode', false );

		$url = $this->localWikiUrl( 'Abstract_Wikipedia:Q88886' );
		$result = $this->sanitise( '<a href="' . $url . '">Link</a>' );

		$this->assertStringNotContainsString( 'class="new"', $result,
			'When abstract mode is disabled, no red-link class should be added' );
		$this->assertStringContainsString( '<a href=', $result );
	}
}
