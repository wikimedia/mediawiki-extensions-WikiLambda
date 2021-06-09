<?php

/**
 * WikiLambda integration test suite for the ZError class
 *
 * @copyright 2020-2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZTypeRegistry;
use Title;
use WikiPage;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZError
 * @group Database
 */
class ZErrorTest extends \MediaWikiIntegrationTestCase {

	/** @var string[] */
	protected $titlesTouched = [];

	protected function setUp() : void {
		parent::setUp();

		$this->tablesUsed[] = 'wikilambda_zobject_labels';
		$this->tablesUsed[] = 'wikilambda_zobject_label_conflicts';

		// Insert necessary ZIDs
		$files = [ 'Z50' => 'Z50.json', 'Z501' => 'Z501.json' ];
		$dataPath = dirname( __DIR__, 3 ) . '/data/';
		foreach ( $files as $zid => $filename ) {
			$data = file_get_contents( $dataPath . $filename );
			$this->editPage( $zid, $data, 'Test creation', NS_ZOBJECT );
			$this->titlesTouched[] = $zid;
		}
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
	 * @covers ::__construct
	 * @covers ::isValid
	 */
	public function testCreate_invalidErrorType() {
		$testObject = new ZError( 'invalid', new ZString( 'error message' ) );
		$this->assertFalse( $testObject->isValid() );
	}

	/**
	 * @covers ::__construct
	 * @covers ::isValid
	 */
	public function testCreate_unknownErrorType() {
		$testObject = new ZError( 'Z999', new ZString( 'error message' ) );
		$this->assertFalse( $testObject->isValid() );
	}

	/**
	 * @covers ::__construct
	 * @covers ::isValid
	 */
	public function testCreate_wrongValue() {
		$testObject = new ZError( 'Z501', 'error message' );
		$this->assertFalse( $testObject->isValid() );
	}

	/**
	 * @covers ::__construct
	 * @covers ::isValid
	 */
	public function testCreate_invalidValue() {
		$testObject = new ZError( 'Z501', new ZReference( '' ) );
		$this->assertFalse( $testObject->isValid() );
	}

	/**
	 * @covers ::__construct
	 * @covers ::isValid
	 * @covers ::getZValue
	 * @covers ::getMessage
	 */
	public function testCreate_valid() {
		$testObject = new ZError( 'Z501', new ZString( 'error message' ) );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z501', $testObject->getZValue()[ ZTypeRegistry::Z_ERROR_TYPE ] );
		$this->assertInstanceOf( ZObject::class, $testObject->getMessage() );
	}
}
