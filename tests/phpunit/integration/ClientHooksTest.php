<?php

/**
 * WikiLambda integration test suite for 'client-mode' Parser-related hooks
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Parser\Parser;
use MediaWikiIntegrationTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ClientHooks
 * @group Database
 */
class ClientHooksTest extends MediaWikiIntegrationTestCase {

	public function testOnParserFirstCallInit() {
		// Force-enable our code
		$this->setMwGlobals( [
			'wgWikiLambdaEnableClientMode' => true,
		] );

		$parser = $this->createMock( Parser::class );
		$parser->expects( $this->once() )
			->method( 'setFunctionHook' )
			->with( 'function', $this->isType( 'callable' ) );

		$hooks = new \MediaWiki\Extension\WikiLambda\ClientHooks();
		$hooks->onParserFirstCallInit( $parser );
	}
}
