<?php

/**
 * WikiLambda integration test suite for 'client-mode' Parser-related hooks
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\HookHandler;

use MediaWiki\Extension\WikiLambda\HookHandler\ClientHooks;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaClientIntegrationTestCase;
use MediaWiki\Parser\Parser;

/**
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\ClientHooks
 * @group Database
 * @group Broken
 */
class ClientHooksTest extends WikiLambdaClientIntegrationTestCase {

	private function newClientHooks(): ClientHooks {
		$services = $this->getServiceContainer();
		return new ClientHooks(
			$services->getMainConfig(),
			$services->getHttpRequestFactory(),
			$services->getJobQueueGroup()
		);
	}

	public function testOnParserFirstCallInit_enabled() {
		$parser = $this->createMock( Parser::class );
		$parser->expects( $this->once() )
			->method( 'setFunctionHook' )
			->with( 'function', $this->isType( 'callable' ) );

		$hooks = $this->newClientHooks();
		$hooks->onParserFirstCallInit( $parser );
	}

	public function testOnParserFirstCallInit_disabled() {
		$parser = $this->createMock( Parser::class );
		$parser->expects( $this->never() )
			->method( 'setFunctionHook' );

		$hooks = $this->newClientHooks();
		$hooks->onParserFirstCallInit( $parser );
	}
}
