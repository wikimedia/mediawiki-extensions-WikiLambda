<?php

/**
 * WikiLambda integration test suite for the ZObjectContent class
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use FormatJson;
use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZTypeRegistry;
use ParserOptions;
use Status;
use Title;
use WikiPage;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjectContent
 * @group Database
 */
class ZObjectContentTest extends \MediaWikiIntegrationTestCase {

	private const EN = 'Z1002';
	private const ES = 'Z1003';

	protected function setUp() : void {
		parent::setUp();

		$this->tablesUsed[] = 'wikilambda_zobject_labels';
		$this->tablesUsed[] = 'wikilambda_zobject_label_conflicts';

		$langs = ZLangRegistry::singleton();
		$langs->register( self::EN, 'en' );
		$langs->register( self::ES, 'es' );
	}

	/** @var string[] */
	protected $titlesTouched = [];

	public function tearDown() : void {
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
	 */
	public function testCreation_invalidString() {
		$this->hideDeprecated( '::create' );
		$this->expectException( ZErrorException::class );
		$this->expectExceptionMessage( "ZPersistentObject input is not a string." );
		$testObject = new ZObjectContent( true );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidJson() {
		$this->hideDeprecated( '::create' );
		$this->expectException( ZErrorException::class );
		$this->expectExceptionMessage( "ZPersistentObject input is invalid JSON: Syntax error." );
		$testObject = new ZObjectContent( "{'invalid': JSON]" );
	}

	/**
	 * @covers ::__construct
	 */
	public function testCreation_invalidThrows_nokey() {
		$this->hideDeprecated( '::create' );
		$this->expectException( ZErrorException::class );
		$testObject = new ZObjectContent( '{}' );
	}

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 * @covers ::getZValue
	 */
	public function testCreation_basicObject() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZObjectContent(
			'{ "Z1K1": "Z1" }'
		);
		$this->assertSame( 'Z1', $testObject->getZType() );
		$this->assertSame(
			[ 'Z1K1' => 'Z1' ],
			$testObject->getZValue(),
			"When passed an inner ZObject, ZObjectContent creates a ZPersistentObject wrapper"
		);
	}

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 * @covers ::getZValue
	 */
	public function testCreation_basicPersistentObject() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZObjectContent(
			'{ "Z1K1": "Z2", "Z2K1": "Z0", "Z2K2": { "Z1K1": "Z1" }, "Z2K3": { "Z1K1": "Z12", "Z12K1": [] } }'
		);
		$this->assertSame( 'Z1', $testObject->getZType() );
		$this->assertSame(
			[ 'Z1K1' => 'Z1' ],
			$testObject->getZValue(),
			"When passed an ZPersistentObject, ZObjectContent doesn't create another ZPersistentObject wrapper"
		);
	}

	/**
	 * @covers ::__construct
	 * @covers ::isValid
	 * @covers ::validateContent
	 * @covers ::getZType
	 */
	public function testCreation_invalidThrows_invalidkey() {
		$testObject = new ZObjectContent(
			'{ "Z1K1": "This is not a valid key!" }'
		);
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( ZErrorException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	/**
	 * @covers ::__construct
	 * @covers ::isValid
	 * @covers ::validateContent
	 * @covers ::getZType
	 */
	public function testCreation_invalidThrows_unrecognisedkey() {
		$testObject = new ZObjectContent(
			'{ "Z1K1": "Z1234" }'
		);
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( ZErrorException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	/**
	 * @covers ::__construct
	 * @covers ::isValid
	 * @covers ::validateContent
	 * @covers ::getZType
	 */
	public function testCreation_invalidThrows_nestedrecordhasinvalidkey() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZObjectContent(
			'{ "Z1K1":"Z2", "Z2K1":"Z0", "Z2K2": { "Z1K1": "Foo" }, "Z2K3": { "Z1K1": "Z12", "Z12K1": [] } }'
		);
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( ZErrorException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	/**
	 * @covers ::__construct
	 * @covers ::isValid
	 * @covers ::validateContent
	 * @covers ::getZType
	 */
	public function testCreation_invalidThrows_nestedrecordhasnovalue() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZObjectContent(
			'{ "Z1K1": "Z2", "Z2K2": { "Z1K1": "Z1" }, "Z2K3": { "Z1K1": "Z12", "Z12K1": [] } }'
		);
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( ZErrorException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	/**
	 * @covers ::__construct
	 * @covers ::isValid
	 * @covers ::validateContent
	 * @covers ::getZType
	 */
	public function testCreation_invalidThrows_nestedrecordhasnolabel() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZObjectContent(
			'{ "Z1K1": "Z2", "Z2K2": { "Z1K1": "Z1", "Z2K2": "Foo" } }'
		);
		$this->assertFalse( $testObject->isValid() );
		$this->expectException( ZErrorException::class );
		$this->assertSame( 'InvalidObjectWillNotHaveAType', $testObject->getZType() );
	}

	/**
	 * @covers ::prepareSave
	 */
	public function testPrepareSave_valid() {
		$sysopUser = $this->getTestSysop()->getUser();
		$testZid = 'Z333';
		$testTitle = Title::newFromText( $testZid, NS_ZOBJECT );
		$testPage = WikiPage::factory( $testTitle );

		$testObject = new ZObjectContent(
			'{ "Z1K1": "Z2", "Z2K1": "Z0", "Z2K2": { "Z1K1": "Z1" }, "Z2K3": { "Z1K1": "Z12", "Z12K1": [] } }'
		);
		$status = $testObject->prepareSave( $testPage, 0, -1, $sysopUser );
		$this->assertTrue( $status->isOK() );
	}

	/**
	 * @covers ::prepareSave
	 */
	public function testPrepareSave_invalid() {
		$sysopUser = $this->getTestSysop()->getUser();
		$testZid = 'Z333';
		$testTitle = Title::newFromText( $testZid, NS_ZOBJECT );
		$testPage = WikiPage::factory( $testTitle );

		$testObject = new ZObjectContent(
			'{ "Z1K1": "Z2", "Z2K1": "Z0", "Z2K3": { "Z1K1": "Z12", "Z12K1": [] } }'
		);
		$status = $testObject->prepareSave( $testPage, 0, -1, $sysopUser );
		$this->assertTrue( $status->hasMessage( 'wikilambda-invalidzobject' ) );
	}

	/**
	 * @covers ::preSaveTransform
	 * @covers ::getText
	 */
	public function testPrepareSaveTransform_invalid() {
		$sysopUser = $this->getTestSysop()->getUser();
		$popts = $this->createMock( ParserOptions::class );
		$testZid = 'Z333';
		$testTitle = Title::newFromText( $testZid, NS_ZOBJECT );

		// Invalid content because it doesn't have Z2K3 key
		$testObject = new ZObjectContent(
			'{ "Z1K1": "Z2",'
				. '"Z2K1": { "Z1K1": "Z9", "Z9K1": "Z333" },'
				. '"Z2K2": { "Z1K1": "Z6", "Z6K1": "string value" } }'
		);
		$transformedObject = $testObject->preSaveTransform( $testTitle, $sysopUser, $popts );

		$this->assertInstanceOf( ZObjectContent::class, $transformedObject );
		$this->assertSame(
			$transformedObject->getText(),
			$testObject->getText(),
			'The ZObject is not transformed as it was found not valid'
		);
	}

	/**
	 * @covers ::preSaveTransform
	 * @covers ::getText
	 */
	public function testPrepareSaveTransform_valid() {
		$sysopUser = $this->getTestSysop()->getUser();
		$popts = $this->createMock( ParserOptions::class );
		$testZid = 'Z333';
		$testTitle = Title::newFromText( $testZid, NS_ZOBJECT );

		// Valid content with string and reference in normal form
		$testObject = new ZObjectContent( '{ "Z1K1": "Z2",'
			. '"Z2K1": { "Z1K1": "Z9", "Z9K1": "Z333" },'
			. '"Z2K2": { "Z1K1": "Z6", "Z6K1": "string value" },'
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [] } }' );

		// Expected result: canonical, UTF8, trimmed and standard EOL characters
		$zObjectTransform = FormatJson::encode( [
			"Z1K1" => "Z2",
			"Z2K1" => "Z333",
			"Z2K2" => "string value",
			"Z2K3" => [
				"Z1K1" => "Z12",
				"Z12K1" => []
			]
		], true, FormatJson::UTF8_OK );
		$zObjectTransform = str_replace( [ "\r\n", "\r" ], "\n", rtrim( $zObjectTransform ) );

		$transformedObject = $testObject->preSaveTransform( $testTitle, $sysopUser, $popts );
		$this->assertInstanceOf( ZObjectContent::class, $transformedObject );
		$this->assertSame( $transformedObject->getText(), $zObjectTransform );
		$this->assertNotSame(
			$transformedObject->getText(),
			$testObject->getText(),
			'The ZObject is transformed as it is valid and in normal form'
		);
	}

	/**
	 * @covers ::getStatus
	 */
	public function testGetStatus_null() {
		$zObject = '{ "Z1K1": "Z2",'
			. '"Z2K1": { "Z1K1": "Z9", "Z9K1": "Z333" },'
			. '"Z2K2": { "Z1K1": "Z6", "Z6K1": "string value" },'
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [] } }';
		$testObject = new ZObjectContent( $zObject );
		$status = $testObject->getStatus();
		$this->assertNull( $testObject->getStatus() );
	}

	/**
	 * @covers ::getStatus
	 */
	public function testGetStatus() {
		$zObject = '{ "Z1K1": "Z2",'
			. '"Z2K1": { "Z1K1": "Z9", "Z9K1": "Z333" },'
			. '"Z2K2": { "Z1K1": "Z6", "Z6K1": "string value" },'
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [] } }';
		$testObject = new ZObjectContent( $zObject );
		$testObject->isValid();
		$status = $testObject->getStatus();
		$this->assertInstanceOf( Status::class, $status );
	}

	/**
	 * @covers ::getText
	 * @covers ::getObject
	 * @covers ::getZObject
	 */
	public function testContentGetters() {
		$zobjectText = '{ "Z1K1": "Z2",'
			. '"Z2K1": { "Z1K1": "Z9", "Z9K1": "Z333" },'
			. '"Z2K2": { "Z1K1": "Z6", "Z6K1": "string value" },'
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [] } }';
		$testObject = new ZObjectContent( $zobjectText );

		$this->assertSame( $testObject->getText(), $zobjectText );
		$this->assertTrue( $testObject->getObject() instanceof \stdClass );
		$this->assertSame( $testObject->getObject()->Z1K1, 'Z2' );
		$this->assertNull( $testObject->getZObject() );

		$testObject->isValid();
		$this->assertInstanceOf( ZPersistentObject::class, $testObject->getZObject() );
		$this->assertInstanceOf( ZObject::class, $testObject->getInnerZObject() );
	}

	/**
	 * @covers ::getInnerZObject
	 * @covers ::getZid
	 * @covers ::getZType
	 * @covers ::getZValue
	 * @covers ::getLabels
	 * @covers ::getLabel
	 */
	public function testPersistentGetterWrappers() {
		$zobjectText = '{ "Z1K1": "Z2",'
			. '"Z2K1": { "Z1K1": "Z9", "Z9K1": "Z333" },'
			. '"Z2K2": { "Z1K1": "Z6", "Z6K1": "string value" },'
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": ['
			. '{ "Z1K1": "Z11", "Z11K1":"Z1003", "Z11K2": "etiqueta en castellano" },'
			. '{ "Z1K1": "Z11", "Z11K1":"Z1002", "Z11K2": "english label" }'
			. '] } }';
		$testObject = new ZObjectContent( $zobjectText );
		$testObject->isValid();

		$english = new \Language();

		$this->assertInstanceOf( ZObject::class, $testObject->getInnerZObject() );
		$this->assertInstanceOf( ZString::class, $testObject->getInnerZObject() );
		$this->assertSame( $testObject->getZid(), 'Z333' );
		$this->assertSame( $testObject->getZType(), 'Z6' );
		$this->assertSame( $testObject->getZValue(), 'string value' );
		$this->assertInstanceOf( ZMultiLingualString::class, $testObject->getLabels() );
		$this->assertSame( $testObject->getLabel( $english ), 'english label' );
	}

	/**
	 * @covers ::getInnerZObject
	 * @covers ::getZid
	 * @covers ::getZType
	 * @covers ::getZValue
	 * @covers ::getLabels
	 * @covers ::getLabel
	 */
	public function testPersistentGetterWrappers_invalid() {
		$testObject = new ZObjectContent( '{ "Z1K1": "Z2", "Z2K1": "Z333" }' );
		$exceptions = [];
		$english = new \Language();

		try {
			$testObject->getInnerZObject();
		} catch ( ZErrorException $e ) {
			$exceptions[] = $e->getMessage();
		}

		try {
			$testObject->getZid();
		} catch ( ZErrorException $e ) {
			$exceptions[] = $e->getMessage();
		}

		try {
			$testObject->getZType();
		} catch ( ZErrorException $e ) {
			$exceptions[] = $e->getMessage();
		}

		try {
			$testObject->getZValue();
		} catch ( ZErrorException $e ) {
			$exceptions[] = $e->getMessage();
		}

		try {
			$testObject->getLabels();
		} catch ( ZErrorException $e ) {
			$exceptions[] = $e->getMessage();
		}

		try {
			$testObject->getLabel( $english );
		} catch ( ZErrorException $e ) {
			$exceptions[] = $e->getMessage();
		}

		$this->assertCount(
			6,
			$exceptions,
			'All ZPersistentObject wrapper methods raise exception when the ZObject created was invalid.'
		);
	}

	/**
	 * @covers ::getTypeString
	 * @covers ::getZType
	 */
	public function testGetTypeString() {
		$registry = ZTypeRegistry::singleton();
		$title = Title::newFromText( ZTestType::TEST_ZID, NS_ZOBJECT );
		$content = ZObjectContentHandler::makeContent( ZTestType::TEST_ENCODING, $title );
		$page = WikiPage::factory( $title );
		$page->doEditContent( $content, "Test creation object" );
		$this->titlesTouched[] = ZTestType::TEST_ZID;
		$page->clear();

		$this->assertTrue(
			$registry->isZObjectKeyKnown( ZTestType::TEST_ZID ),
			"'TestingType' found in DB"
		);

		$zobjectText = '{ "Z1K1": "Z2",'
			. '"Z2K1": "Z0",'
			. '"Z2K2": { "Z1K1": "' . ZTestType::TEST_ZID
			. '", "Z111K1": "string value", "Z111K2": "Other string" },'
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": ['
			. '{ "Z1K1": "Z11", "Z11K1":"Z1003", "Z11K2": "etiqueta en castellano" },'
			. '{ "Z1K1": "Z11", "Z11K1":"Z1002", "Z11K2": "english label" }'
			. '] } }';
		$testObject = new ZObjectContent( $zobjectText );
		$english = new \Language();
		$this->assertSame( 'Demonstration type (Z111)',
			$testObject->getTypeString( $english ) );
	}
}
