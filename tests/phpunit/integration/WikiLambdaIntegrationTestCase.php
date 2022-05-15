<?php

/**
 * WikiLambda integration test abstract class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use Language;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZObjectRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\MediaWikiServices;
use MediaWikiIntegrationTestCase;

abstract class WikiLambdaIntegrationTestCase extends MediaWikiIntegrationTestCase {

	protected const ZLANG = [
		'en' => 'Z1002',
		'es' => 'Z1003',
		'fr' => 'Z1004',
		'ru' => 'Z1005',
		'zh' => 'Z1006',
		'de' => 'Z1430',
		'it' => 'Z1787',
		'pcd' => 'Z1829',
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
			$this->editPage( $zid, $data, 'Test ZObject creation', NS_MAIN );
		}
	}

	/**
	 * Return the ZPersistentObject representation of a data object from the data collection directory
	 *
	 * @param string $zid
	 * @return ZPersistentObject
	 */
	protected function getZPersistentObject( $zid ): ZPersistentObject {
		$dataPath = dirname( __DIR__, 3 ) . '/function-schemata/data/definitions';
		$data = file_get_contents( "$dataPath/$zid.json" );
		return ZObjectFactory::createChild( json_decode( $data ) );
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
	 * Simulate the existence of a given set of error types by registering
	 * their Zids
	 *
	 * @param string[] $errors
	 */
	protected function registerErrors( $errors ): void {
		$errorRegistry = ZErrorTypeRegistry::singleton();
		foreach ( $errors as $err ) {
			$errorRegistry->register( $err, $err );
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
	 * Returns instance of Language given a string language code
	 *
	 * @param string $code
	 * @return Language
	 */
	protected function makeLanguage( string $code ) {
		$services = MediaWikiServices::getInstance();

		$languageFactory = $services->getLanguageFactory();

		try {
			return $languageFactory->getLanguage( $code );
		} catch ( \MWException $th ) {
			// We support language codes that MediaWiki won't, so in extremis we may need to roll
			// our own.
			// TODO (T304009): We should not create Language objects directly, that's not supported upstream.
			return new Language(
				$code,
				$services->getNamespaceInfo(),
				$services->getLocalisationCache(),
				$services->getLanguageNameUtils(),
				$services->getLanguageFallback(),
				$services->getLanguageConverterFactory(),
				$services->getHookContainer(),
				$services->getMainConfig()
			);
		}
	}

	/**
	 * Make sure that all the different registries are cleared and initialized with their initial values
	 */
	protected function tearDown(): void {
		ZObjectRegistry::clearAll();
		parent::tearDown();
	}
}
