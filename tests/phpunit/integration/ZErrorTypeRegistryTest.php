<?php

/**
 * WikiLambda integration test suite for the ZErrorTypeRegistry class
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorTypeRegistry;
use Title;
use WikiPage;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZErrorTypeRegistry
 * @group Database
 */
class ZErrorTypeRegistryTest extends \MediaWikiIntegrationTestCase {

	/** @var string[] */
	protected $titlesTouched = [];

	protected function setUp() : void {
		parent::setUp();

		$this->tablesUsed[] = 'wikilambda_zobject_labels';
		$this->tablesUsed[] = 'wikilambda_zobject_label_conflicts';
	}

	protected function insertZids( $zids ) : void {
		$dataPath = dirname( __DIR__, 3 ) . '/data';
		foreach ( $zids as $zid ) {
			$data = file_get_contents( "$dataPath/$zid.json" );
			$this->editPage( $zid, $data, 'Test creation', NS_ZOBJECT );
			$this->titlesTouched[] = $zid;
		}
	}

	protected function insertZErrorTypes( $errorTypes ) : void {
		// Insert ZErrorType (Z50) and then all the wanted types
		$this->insertZids( array_merge( (array)'Z50', $errorTypes ) );
	}

	protected function tearDown() : void {
		$sysopUser = $this->getTestSysop()->getUser();

		foreach ( $this->titlesTouched as $titleString ) {
			$title = Title::newFromText( $titleString, NS_ZOBJECT );
			$page = WikiPage::factory( $title );
			if ( $page->exists() ) {
				$page->doDeleteArticleReal( "clean slate for testing", $sysopUser );
			}
		}

		parent::tearDown();
	}

	/**
	 * @covers ::singleton
	 */
	public function testSingleton() {
		$registry = ZErrorTypeRegistry::singleton();
		$this->assertEquals( get_class( $registry ), ZErrorTypeRegistry::class );
		$this->assertEquals( $registry, ZErrorTypeRegistry::singleton() );
	}

	private function runPrivateMethod( $object, $methodName, $args ) {
		$reflector = new \ReflectionClass( get_class( $object ) );
		$method = $reflector->getMethod( $methodName );
		$method->setAccessible( true );
		return $method->invokeArgs( $object, $args );
	}

	/**
	 * @covers ::registerErrorType
	 * @covers ::isZErrorTypeKnown
	 * @covers ::isZErrorTypeCached
	 * @covers ::unregisterErrorType
	 */
	public function testCacheZErrorType() {
		$errorType = 'Z501';
		$registry = ZErrorTypeRegistry::singleton();

		$this->runPrivateMethod( $registry, 'registerErrorType', [ $errorType, 'error type' ] );
		$this->assertTrue( $registry->isZErrorTypeKnown( $errorType ) );

		$registry->unregisterErrorType( 'Z505' );
		$this->assertTrue(
			$registry->isZErrorTypeKnown( $errorType ),
			'Unregistering a non-cached error type does throw errors.'
		);

		$registry->unregisterErrorType( $errorType );
		$this->assertFalse( $registry->isZErrorTypeKnown( $errorType ) );
	}

	/**
	 * @covers ::isZErrorTypeKnown
	 * @covers ::isZErrorTypeCached
	 */
	public function testIsZErrorTypeKnown_typeNotFound() {
		$errorType = 'Z501';
		$registry = ZErrorTypeRegistry::singleton();

		$this->assertFalse(
			$registry->isZErrorTypeKnown( $errorType ),
			"No ZObject with Zid $errorType was found in the database"
		);
	}

	/**
	 * @covers ::isZErrorTypeKnown
	 * @covers ::isZErrorTypeCached
	 */
	public function testIsZErrorTypeKnown_typeNotValid() {
		$invalidErrorType = 'Z6';
		$expectedErrorType = 'Z506';
		$registry = ZErrorTypeRegistry::singleton();

		$this->insertZErrorTypes( [ $expectedErrorType ] );
		$this->insertZids( [ $invalidErrorType ] );

		$errorType = null;
		try {
			$registry->isZErrorTypeKnown( $invalidErrorType );
		} catch ( ZErrorException $e ) {
			$errorType = $e->getZErrorType();
		}
		$this->assertSame( $expectedErrorType, $errorType );
	}

	/**
	 * @covers ::isZErrorTypeKnown
	 * @covers ::isZErrorTypeCached
	 * @covers ::registerErrorType
	 * @covers ::unregisterErrorType
	 */
	public function testIsZErrorTypeKnown_valid() {
		$errorType = 'Z501';
		$registry = ZErrorTypeRegistry::singleton();
		$this->insertZErrorTypes( [ $errorType ] );

		$this->assertFalse(
			$this->runPrivateMethod( $registry, 'isZErrorTypeCached', [ $errorType ] ),
			'The valid ZErrorType Zid is not yet cached.'
		);

		$this->assertTrue(
			$registry->isZErrorTypeKnown( $errorType ),
			'The valid ZErrorType is found in the database and cached.'
		);

		$this->assertTrue(
			$this->runPrivateMethod( $registry, 'isZErrorTypeCached', [ $errorType ] ),
			'The valid ZErrorType Zid is now cached.'
		);

		$registry->unregisterErrorType( $errorType );
		$this->assertFalse(
			$this->runPrivateMethod( $registry, 'isZErrorTypeCached', [ $errorType ] ),
			'The valid ZErrorType Zid is not cached after unregistering it.'
		);
	}
}
