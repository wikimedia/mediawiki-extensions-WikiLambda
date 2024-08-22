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
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\ClientHooks
 * @group Database
 */
class ClientHooksTest extends MediaWikiIntegrationTestCase {

	public function testOnParserFirstCallInit_enabled() {
		// Force-enable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );

		$parser = $this->createMock( Parser::class );
		$parser->expects( $this->once() )
			->method( 'setFunctionHook' )
			->with( 'function', $this->isType( 'callable' ) );

		$hooks = new \MediaWiki\Extension\WikiLambda\HookHandler\ClientHooks();
		$hooks->onParserFirstCallInit( $parser );
	}

	public function testOnParserFirstCallInit_disabled() {
		// Force-disable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', false );

		$parser = $this->createMock( Parser::class );
		$parser->expects( $this->never() )
			->method( 'setFunctionHook' );

		$hooks = new \MediaWiki\Extension\WikiLambda\HookHandler\ClientHooks();
		$hooks->onParserFirstCallInit( $parser );
	}
}
