<?php

/**
 * WikiLambda integration test abstract class
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectRegistry;
use MediaWikiIntegrationTestCase;

abstract class WikiLambdaIntegrationTestCase extends MediaWikiIntegrationTestCase {

	protected const ZLANG = [
		'en' => 'Z1002',
		'es' => 'Z1003',
		'fr' => 'Z1004',
		'ru' => 'Z1005',
		'zh' => 'Z1006',
		'de' => 'Z1430',
		'it' => 'Z1787'
	];

	protected function setUp(): void {
		parent::setUp();

		if ( $this->isTestInDatabaseGroup() ) {
			$this->tablesUsed[] = 'wikilambda_zobject_labels';
			$this->tablesUsed[] = 'wikilambda_zobject_label_conflicts';
			$this->tablesUsed[] = 'wikilambda_zobject_function_join';
			$this->tablesUsed[] = 'page';
		}
	}

	/**
	 * Inserts the given ZObjects from the builtin data collection directory
	 *
	 * @param string[] $zids
	 */
	protected function insertZids( $zids ): void {
		$dataPath = dirname( __DIR__, 3 ) . '/function-schemata/data/definitions';
		foreach ( $zids as $zid ) {
			$data = file_get_contents( "$dataPath/$zid.json" );
			$this->editPage( $zid, $data, 'Test ZObject creation', NS_ZOBJECT );
		}
	}

	/**
	 * Inserts the given Zids of existing ZErrorType instances, plus Z50 (ZErrorType)
	 *
	 * @param string[] $zids
	 */
	protected function insertZErrorTypes( $zids ): void {
		// Insert ZErrorType (Z50) and then all the wanted types
		$this->insertZids( array_merge( (array)'Z50', $zids ) );
	}

	/**
	 * Simulate the existance of a given set of language codes by registering
	 * them and their Zids
	 *
	 * @param string[] $langs
	 */
	protected function registerLangs( $langs ): void {
		$langRegistry = ZLangRegistry::singleton();
		foreach ( $langs as $code ) {
			$zid = self::ZLANG[$code];
			$langRegistry->register( $zid, $code );
		}
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

	/**
	 * Make sure that all the different registries are cleared and initialized with their initial values
	 */
	protected function tearDown(): void {
		ZObjectRegistry::clearAll();
		parent::tearDown();
	}
}
