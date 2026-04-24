<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ParserFunction;

use MediaWiki\Extension\WikiLambda\ParserFunction\WikifunctionsPFragmentSanitiserTokenHandler;
use MediaWiki\Logger\LoggerFactory;
use MediaWikiIntegrationTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ParserFunction\WikifunctionsPFragmentSanitiserTokenHandler
 * @group Database
 */
class WikifunctionsPFragmentSanitiserTokenHandlerTest extends MediaWikiIntegrationTestCase {

	/**
	 * @param string $html
	 * @param array<string, true> $blockedDomains
	 */
	private function sanitise( string $html, array $blockedDomains = [] ): string {
		return WikifunctionsPFragmentSanitiserTokenHandler::sanitiseHtmlFragment(
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
}
