<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\ApiWikifunctionsHTMLSanitiser
 * @covers \MediaWiki\Extension\WikiLambda\ParserFunction\WikifunctionsPFragmentSanitiserTokenHandler
 * @group Database
 * @group API
 */
class ApiWikifunctionsHTMLSanitiserTest extends WikiLambdaApiTestCase {

	/**
	 * @dataProvider provideInvalidZObjects
	 */
	public function testX( $input, $expected ) {
		$response = $this->doApiRequestWithToken( [
			'action' => 'wikifunctions_html_sanitiser',
			'html' => $input
		] )[0]['wikifunctions_html_sanitiser'];

		$this->assertArrayHasKey( 'success', $response );
		$this->assertTrue( $response['success'], 'Expected success but got failure' );

		$actual = $response[ 'value' ];
		$this->assertEquals( $expected, $actual, 'Sanitised HTML does not match expected output' );
	}

	public static function provideInvalidZObjects() {
		return [
			'Allowed content is a no-op' => [
				'<p><b>Hello</b>, <em>world</em>!</p>',
				'<p><b>Hello</b>, <em>world</em>!</p>'
			],
			'Reserved micro-data attributes are silently dropped' => [
				'<b data-mw="This is a bad vector!" data-mw-foo="No, really!">HTML!</b>',
				'<b>HTML!</b>'
			],
			'Script tags are encoded away' => [
				'<script>alert("x")</script>',
				'&lt;script&gt;alert("x")&lt;/script&gt;'
			],
			'Links are prohibited (unless to a known domain)' => [
				'<a href="www.example.com/foo">Naughty and not allowed!</a>',
				'&lt;a href="www.example.com/foo"&gt;Naughty and not allowed!'
			]
		];
	}
}
