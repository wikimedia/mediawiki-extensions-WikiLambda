<?php

/**
 * WikiLambda integration test suite for 'client-mode' Parser-related hooks
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\HookHandler\ClientHooks;
use MediaWiki\Parser\Parser;
use MediaWikiIntegrationTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\ClientHooks
 * @group Database
 */
class ClientHooksTest extends MediaWikiIntegrationTestCase {

	private function newClientHooks(): ClientHooks {
		$services = $this->getServiceContainer();
		return new ClientHooks(
			$services->getMainConfig(),
			$services->getService( 'HttpRequestFactory' ),
			$services->getService( 'JobQueueGroup' )
		);
	}

	public function testOnParserFirstCallInit_enabled() {
		// Force-enable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );

		$parser = $this->createMock( Parser::class );
		$parser->expects( $this->once() )
			->method( 'setFunctionHook' )
			->with( 'function', $this->isType( 'callable' ) );

		$hooks = $this->newClientHooks();
		$hooks->onParserFirstCallInit( $parser );
	}

	public function testOnParserFirstCallInit_disabled() {
		// Force-disable our code
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', false );

		$parser = $this->createMock( Parser::class );
		$parser->expects( $this->never() )
			->method( 'setFunctionHook' );

		$hooks = $this->newClientHooks();
		$hooks->onParserFirstCallInit( $parser );
	}
}
