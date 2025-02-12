<?php

/**
 * WikiLambda integration test suite for the ZError class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Json\FormatJson;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZError
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZKeyReference
 *
 * @group Database
 */
class ZErrorTest extends WikiLambdaIntegrationTestCase {

	public function testCreation_factory() {
		$stringZObject = <<<EOT
{
	"Z1K1": "Z5",
	"Z5K1": "Z501",
	"Z5K2": "error message"
}
EOT;

		$testObject = ZObjectFactory::create( json_decode( $stringZObject ) );

		$this->assertSame( 'Z5', $testObject->getZType() );

		$this->assertSame(
			[ 'Z1K1' => 'Z5', 'Z5K1' => 'Z501', 'Z5K2' => 'error message' ],
			(array)$testObject->getSerialized()
		);
	}

	public function testCreate_invalidErrorType() {
		$testObject = new ZError( 'invalid', new ZString( 'error message' ) );
		$this->assertFalse( $testObject->isValid() );
	}

	public function testCreate_unknownErrorType() {
		$testObject = new ZError( new ZReference( 'Z999' ), new ZString( 'error message' ) );
		$this->assertFalse( $testObject->isValid() );
	}

	public function testCreate_wrongValue() {
		$testObject = new ZError( new ZReference( 'Z501' ), 'error message' );
		$this->assertFalse( $testObject->isValid() );
	}

	public function testCreate_invalidValue() {
		$testObject = new ZError( new ZReference( 'Z501' ), new ZReference( '' ) );
		$this->assertFalse( $testObject->isValid() );
	}

	public function testCreate_valid() {
		$testObject = new ZError( new ZReference( 'Z501' ), new ZString( 'error message' ) );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z501', $testObject->getZErrorType() );

		$testObjectErrorData = $testObject->getErrorData();

		// NOTE: This message label is "wrong" because we don't load Z501 in this test run
		$this->assertSame( 'Unknown error Z501', $testObject->getMessage() );
		$this->assertSame( 'Unknown error Z501', $testObjectErrorData['message'] );

		$this->assertArrayEquals(
			[ 'Z1K1' => 'Z5', 'Z5K1' => 'Z501', 'Z5K2' => 'error message' ],
			(array)$testObjectErrorData['zerror'],
			"Getting the 'zerror' from getErrorData() returns the input"
		);

		// NOTE: This is identical to 'zerror' as we don't load the labels in this test run"
		$this->assertArrayEquals(
			[ 'Z1K1' => 'Z5', 'Z5K1' => 'Z501', 'Z5K2' => 'error message' ],
			(array)$testObjectErrorData['labelled'],
			"Getting the 'labelled' from getErrorData() returns the 'transformed' input"
		);

		$this->assertSame(
			[ 'Z1K1' => 'Z5', 'Z5K1' => 'Z501', 'Z5K2' => 'error message' ],
			(array)$testObject->getSerialized()
		);

		$this->assertInstanceOf( ZObject::class, $testObject->getZValue() );
	}

	public function testMessage_ListErrors() {
		$errorPath = dirname( __DIR__, 1 ) . '/test_data/Z5_list_of_errors.json';
		$errorData = file_get_contents( $errorPath );
		$errorObject = FormatJson::decode( $errorData );

		$registry = ZErrorTypeRegistry::singleton();
		$registry->register( 'Z509:en', 'List of errors' );
		$registry->register( 'Z554:en', 'Label for a given language clashes with another Object\'s label' );
		$registry->register( 'Z509:fr', 'liste d\'erreurs' );
		$registry->register( 'Z554:fr', 'L\'ét. d\'une langue entre en conflit avec une autre' );
		$testObject = ZObjectFactory::create( $errorObject );

		// Default language is English
		$this->assertSame( 'List of errors', $testObject->getMessage() );
		// Specifying English gets the right result
		$this->assertSame( 'List of errors', $testObject->getMessage( 'en' ) );
		// Specifying French gets the right result
		$this->assertSame( 'liste d\'erreurs', $testObject->getMessage( 'fr' ) );
		// Specifying an unknown language goes through the error state
		$this->assertSame( 'Unknown error Z509', $testObject->getMessage( 'unknown' ) );

		$errorsHtmlEn = 'List of errors'
			. '<ul class="ext-wikilambda-app-suberror-list">'
			. '<li class="ext-wikilambda-app-suberror-list__item">'
			. 'Label for a given language clashes with another Object\'s label'
			. '</li>'
			. '<li class="ext-wikilambda-app-suberror-list__item">'
			. 'Label for a given language clashes with another Object\'s label'
			. '</li>'
			. '</ul>';
		// Default language is English
		$this->assertEquals( $errorsHtmlEn, $testObject->getHtmlMessage() );
		// Specifying English gets the right result
		$this->assertEquals( $errorsHtmlEn, $testObject->getHtmlMessage( 'en' ) );

		$errorsHtmlFr = 'liste d\'erreurs'
			. '<ul class="ext-wikilambda-app-suberror-list">'
			. '<li class="ext-wikilambda-app-suberror-list__item">'
			. 'L\'ét. d\'une langue entre en conflit avec une autre'
			. '</li>'
			. '<li class="ext-wikilambda-app-suberror-list__item">'
			. 'L\'ét. d\'une langue entre en conflit avec une autre'
			. '</li>'
			. '</ul>';
		// Specifying French gets the right result
		$this->assertEquals( $errorsHtmlFr, $testObject->getHtmlMessage( 'fr' ) );
	}

	public function testMessage_NotWellformed() {
		$errorPath = dirname( __DIR__, 1 ) . '/test_data/Z5_not_wellformed.json';
		$errorData = file_get_contents( $errorPath );

		$registry = ZErrorTypeRegistry::singleton();
		$registry->register( 'Z502:en', 'Not wellformed' );
		$registry->register( 'Z509:en', 'List of errors' );
		$registry->register( 'Z526:en', 'Key value not wellformed' );
		$registry->register( 'Z551:en', 'Schema type mismatch' );
		$registry->register( 'Z549:en', 'Invalid reference' );
		$testObject = ZObjectFactory::create( json_decode( $errorData ) );

		$this->assertSame( 'Not wellformed', $testObject->getMessage() );

		$errorsHtml = 'Not wellformed'
			. '<ul class="ext-wikilambda-app-suberror-list">'
			. '<li class="ext-wikilambda-app-suberror-list__item">List of errors'
			. '<ul class="ext-wikilambda-app-suberror-list">'
			. '<li class="ext-wikilambda-app-suberror-list__item">Key value not wellformed: Z4K1'
			. '<ul class="ext-wikilambda-app-suberror-list">'
			. '<li class="ext-wikilambda-app-suberror-list__item">List of errors'
			. '<ul class="ext-wikilambda-app-suberror-list">'
			. '<li class="ext-wikilambda-app-suberror-list__item">Schema type mismatch</li>'
			. '<li class="ext-wikilambda-app-suberror-list__item">Invalid reference</li>'
			. '</ul></li></ul></li>'
			. '<li class="ext-wikilambda-app-suberror-list__item">Schema type mismatch</li>'
			. '</ul></li></ul>';
		$this->assertSame( $errorsHtml, $testObject->getHtmlMessage() );
	}
}
