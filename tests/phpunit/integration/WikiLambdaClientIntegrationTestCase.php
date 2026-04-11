<?php

/**
 * WikiLambda integration test abstract class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWikiIntegrationTestCase;

abstract class WikiLambdaClientIntegrationTestCase extends MediaWikiIntegrationTestCase {
	protected function setUpAsClientMode(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', true );
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );
		$this->overrideConfigValue( 'WikiLambdaClientTargetAPI', 'test.wikifunctions.org' );
		\MediaWiki\Extension\WikiLambda\HookHandler\RepoHooks::registerExtension();
	}

	/**
	 * Invoke a private or protected instance method on an object and return its result.
	 *
	 * Uses raw ReflectionMethod rather than TestingAccessWrapper because some callers
	 * (e.g. ContentHandler::fillParserOutput) declare their parameters with `&` and PHP's
	 * spread-through-__call path does not preserve reference semantics — invokeArgs would
	 * then fail with "must be passed by reference, value given". For property access and
	 * by-value method calls, prefer TestingAccessWrapper at the call site instead.
	 *
	 * @phpcs:ignore MediaWiki.Commenting.FunctionComment.ObjectTypeHintParam
	 * @param object $object
	 * @param string $methodName
	 * @param array $args
	 * @return mixed The return value of the private method invoked
	 */
	protected function runPrivateMethod( $object, $methodName, $args ) {
		$reflector = new \ReflectionClass( get_class( $object ) );
		$method = $reflector->getMethod( $methodName );
		return $method->invokeArgs( $object, $args );
	}
}
