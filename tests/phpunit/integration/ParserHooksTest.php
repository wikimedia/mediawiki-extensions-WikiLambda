<?php

/**
 * WikiLambda integration test suite for Parser-related hooks
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Parser\Parser;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ParserHooks
 * @group Database
 */
class ParserHooksTest extends WikiLambdaIntegrationTestCase {

	public function testOnParserFirstCallInit() {
		// Force-enable our code
		$this->setMwGlobals( [
			'wgWikiLambdaEnableParserFunction' => true,
		] );

		$parser = $this->createMock( Parser::class );
		$parser->expects( $this->once() )
			->method( 'setFunctionHook' )
			->with( 'function', $this->isType( 'callable' ) );
		$hooks = new \MediaWiki\Extension\WikiLambda\ParserHooks();
		$hooks->onParserFirstCallInit( $parser );
	}
}
