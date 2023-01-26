<?php

/**
 * WikiLambda integration test suite for Parser-related hooks
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use Parser;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ParserHooks
 * @group Database
 */
class ParserHooksTest extends WikiLambdaIntegrationTestCase {
	/**
	 * @covers ::onParserFirstCallInit
	 * @covers ::parserFunctionCallback
	 */
	public function testOnParserFirstCallInit() {
		$parser = $this->createMock( Parser::class );
		$parser->expects( $this->exactly( 1 ) )
			->method( 'setFunctionHook' )
			->withConsecutive(
				[ 'function', $this->isType( 'callable' ) ]
			);
		$hooks = new \MediaWiki\Extension\WikiLambda\ParserHooks();
		$hooks->onParserFirstCallInit( $parser );
	}
}
