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
	 * Method to test private and protected methods using ReflectionClass
	 *
	 * @param stdClass $object
	 * @param string $methodName
	 * @param array $args
	 * @return mixed The return value of the private method invoked
	 */
	protected function runPrivateMethod( $object, $methodName, $args ) {
		$reflector = new \ReflectionClass( get_class( $object ) );
		$method = $reflector->getMethod( $methodName );
		$method->setAccessible( true );
		return $method->invokeArgs( $object, $args );
	}
}
