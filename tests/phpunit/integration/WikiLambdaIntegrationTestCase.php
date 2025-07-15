<?php

/**
 * WikiLambda integration test abstract class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Content\Content;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZObjectRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Language\Language;
use MediaWiki\Permissions\Authority;
use MediaWikiIntegrationTestCase;

abstract class WikiLambdaIntegrationTestCase extends MediaWikiIntegrationTestCase {

	/** @var string */
	private $mainDataPath;
	/** @var string */
	private $testDataPath;

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

	/** @inheritDoc */
	public function __construct( $name = null, array $data = [], $dataName = '' ) {
		parent::__construct( $name, $data, $dataName );

		$this->mainDataPath = dirname( __DIR__, 3 ) . '/function-schemata/data/definitions';
	}

	/**
	 * Set configuration flag WikiLambdaEnableRepoMode to true
	 */
	protected function setUpAsRepoMode(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', true );
		\MediaWiki\Extension\WikiLambda\HookHandler\RepoHooks::registerExtension();

		// Always register Z504, as otherwise we get an infinite recursion of not finding Z504
		$this->insertZids( [ 'Z504' ] );
	}

	/**
	 * Set directory with definitions used for this test suite
	 *
	 * @param string $path
	 */
	protected function setTestDataPath( $path ) {
		$this->testDataPath = $path;
	}

	/**
	 * Given a zid, returns the zobject definition found in:
	 * * function schemata data definitions, or
	 * * test data definitions (if directory is configured for this test suite)
	 * If not found in either directory, raises Exception
	 *
	 * @param string $zid
	 * @return string
	 */
	private function getDefinition( $zid ): string {
		$mainFile = "$this->mainDataPath/$zid.json";
		$testFile = isset( $this->testDataPath ) ? "$this->testDataPath/$zid.json" : null;

		if ( file_exists( $mainFile ) ) {
			$data = file_get_contents( $mainFile );
		} elseif ( isset( $this->testDataPath ) && file_exists( $testFile ) ) {
			$data = file_get_contents( $testFile );
		} else {
			throw new \RuntimeException( "ZObject definition for $zid not found in main or test data paths." );
		}

		return $data;
	}

	/**
	 * Inserts the given ZObjects from the builtin data collection directory
	 *
	 * @param string[] $zids
	 */
	protected function insertZids( $zids ): void {
		foreach ( $zids as $zid ) {
			$data = $this->getDefinition( $zid );
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
		$data = $this->getDefinition( $zid );
		return ZObjectFactory::create( json_decode( $data ) );
	}

	/** @inheritDoc */
	protected function editPage(
		$page,
		$content,
		$summary = '',
		$defaultNs = NS_MAIN,
		?Authority $performer = null
	) {
		// Make sure that $content Z0s are replaced with $page
		$contentText = $content instanceof Content ? $content->getText() : $content;
		$zPlaceholderRegex = '/\"' . ZTypeRegistry::Z_NULL_REFERENCE . '(K[1-9]\d*)?\"/';
		$contentText = preg_replace( $zPlaceholderRegex, "\"$page$1\"", $contentText );

		// Then call parent editPage
		return parent::editPage( $page, $contentText, $summary, $defaultNs, $performer );
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
		$services = $this->getServiceContainer();
		$languageFactory = $services->getLanguageFactory();
		return $languageFactory->getLanguage( $code );
	}

	/**
	 * Make sure that all the different registries are cleared and initialized with their initial values
	 */
	protected function tearDown(): void {
		ZObjectRegistry::clearAll();
		parent::tearDown();
	}
}
