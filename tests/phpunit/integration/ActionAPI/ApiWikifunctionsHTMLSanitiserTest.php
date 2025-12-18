<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI;

use MediaWiki\Registration\ExtensionRegistry;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\ApiWikifunctionsHTMLSanitiser
 * @covers \MediaWiki\Extension\WikiLambda\ParserFunction\WikifunctionsPFragmentSanitiserTokenHandler
 * @group Database
 * @group API
 */
class ApiWikifunctionsHTMLSanitiserTest extends WikiLambdaApiTestCase {

	/**
	 * @dataProvider provideHTML
	 */
	public function testSanitise( $input, $expected ) {
		$this->overrideConfigValue( 'Server', 'http://this.wikifunctions.mock' );
		$this->overrideConfigValue( 'CanonicalServer', 'https://canonical.wikifunctions.mock' );

		$response = $this->doApiRequestWithToken( [
			'action' => 'wikifunctions_html_sanitiser',
			'html' => $input
		] )[0]['wikifunctions_html_sanitiser'];

		$this->assertArrayHasKey( 'success', $response );
		$this->assertTrue( $response['success'], 'Expected success but got failure' );

		$actual = $response[ 'value' ];
		$this->assertEquals( $expected, $actual, 'Sanitised HTML does not match expected output' );
	}

	public static function provideHTML() {
		yield 'Allowed content is a no-op' => [
			'<p><b>Hello</b>, <em>world</em>!</p>',
			'<p><b>Hello</b>, <em>world</em>!</p>'
		];

		yield 'Reserved micro-data attributes are silently dropped' => [
			'<b data-mw="This is a bad vector!" data-mw-foo="No, really!">HTML!</b>',
			'<b>HTML!</b>'
		];

		yield 'Script tags are encoded away' => [
			'<script>alert("x")</script>',
			'&lt;script&gt;alert("x")&lt;/script&gt;'
		];

		yield 'Links are prohibited (unless to a known domain)' => [
			'<a href="www.example.com/foo">Naughty and not allowed!</a>',
			'&lt;a href="www.example.com/foo"&gt;Naughty and not allowed!'
		];

		// Test links to wgServer
		yield 'Links to current server are allowed (relative protocol)' => [
			'<a href="//this.wikifunctions.mock/foo">Allowed link with relative protocol!</a>',
			'<a href="//this.wikifunctions.mock/foo">Allowed link with relative protocol!</a>',
		];
		yield 'Links to current server are allowed (specific protocol)' => [
			'<a href="https://this.wikifunctions.mock/foo">Allowed link with https!</a>',
			'<a href="https://this.wikifunctions.mock/foo">Allowed link with https!</a>',
		];

		// Test links to wgCanonicalServer
		yield 'Links to canonical server are allowed (relative protocol)' => [
			'<a href="//canonical.wikifunctions.mock/foo">Allowed link with relative protocol!</a>',
			'<a href="//canonical.wikifunctions.mock/foo">Allowed link with relative protocol!</a>',
		];
		yield 'Links to canonical server are allowed (specific protocol)' => [
			'<a href="http://canonical.wikifunctions.mock/foo">Allowed link with http!</a>',
			'<a href="http://canonical.wikifunctions.mock/foo">Allowed link with http!</a>',
		];

		// These tests need SiteMatrix extension to be loaded; ignore otherwise:
		if ( ExtensionRegistry::getInstance()->isLoaded( 'SiteMatrix' ) ) {
			// Test links to SiteMatrix language sites
			yield 'Links to allowed language wiki (relative protocol)' => [
				'<a href="//es.wiktionary.mock/foo">Allowed es.wiktionary link!</a>',
				'<a href="//es.wiktionary.mock/foo">Allowed es.wiktionary link!</a>',
			];
			yield 'Links to allowed language wiki (specific protocol)' => [
				'<a href="https://dag.wikipedia.mock/foo">Allowed dag.wikipedia link!</a>',
				'<a href="https://dag.wikipedia.mock/foo">Allowed dag.wikipedia link!</a>',
			];

			// Test links to SiteMatrix multilingual sites
			yield 'Links to allowed special wiki (relative protocol)' => [
				'<a href="//test.wikimedia.mock/foo">Allowed test.wikimedia link!</a>',
				'<a href="//test.wikimedia.mock/foo">Allowed test.wikimedia link!</a>',
			];
			yield 'Links to allowed special wiki (specific protocol)' => [
				'<a href="https://meta.wikimedia.mock/foo">Allowed meta.wikimedia link!</a>',
				'<a href="https://meta.wikimedia.mock/foo">Allowed meta.wikimedia link!</a>',
			];
		}
	}
}
