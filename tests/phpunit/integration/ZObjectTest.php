<?php

/**
 * WikiLambda integration test suite for the ZObject class
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use Title;
use WikiPage;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZObject
 * @group Database
 */
class ZObjectTest extends \MediaWikiIntegrationTestCase {

	/** @var string[] */
	protected $titlesTouched = [];

	protected function setUp() : void {
		parent::setUp();

		$this->tablesUsed[] = 'wikilambda_zobject_labels';
		$this->tablesUsed[] = 'wikilambda_zobject_label_conflicts';
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
	 * @covers ::getValueByKey
	 */
	public function testGetValueByKey_stringValue() {
		$testObject = ZObjectFactory::create( 'foo' );
		$testObject = $testObject->getValueByKey( 'Z6K1' );
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( 'foo', $testObject->getZValue() );
	}

	/**
	 * @covers ::getValueByKey
	 */
	public function testGetValueByKey_undefinedKey() {
		$testObject = ZObjectFactory::create( 'foo' );
		$testObject = $testObject->getValueByKey( 'Z1K999' );
		$this->assertNull( $testObject );
	}

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 */
	public function testConstruct_builtinType() {
		$testObject = (object)[
			"Z1K1" => "Z6",
			"Z6K1" => "builtin zobject"
		];
		$testZObject = ZObjectFactory::create( $testObject );
		$this->assertInstanceOf( ZObject::class, $testZObject );
		$this->assertInstanceOf( ZString::class, $testZObject );
		$this->assertSame( $testZObject->getZType(), 'Z6' );
	}

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 */
	public function testConstruct_customType() {
		// Create type Z111
		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$title = Title::newFromText( ZTestType::TEST_ZID, NS_ZOBJECT );
		$content = ZObjectContentHandler::makeContent( ZTestType::TEST_ENCODING, $title );
		$page = WikiPage::factory( $title );
		$page->doEditContent( $content, "Test creation object" );
		$this->titlesTouched[] = ZTestType::TEST_ZID;

		// Create instance of type Z111
		$testObject = (object)[
			"Z1K1" => "Z111",
			"Z111K1" => "first demonstration key",
			"Z111K2" => "second demonstration key"
		];
		$testZObject = ZObjectFactory::create( $testObject );
		$this->assertInstanceOf( ZObject::class, $testZObject );
		$this->assertSame( $testZObject->getZType(), 'Z111' );
	}

}
