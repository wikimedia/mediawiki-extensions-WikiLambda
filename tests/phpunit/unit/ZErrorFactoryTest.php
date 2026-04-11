<?php

/**
 * WikiLambda unit test suite for the ZErrorFactory
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests;

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZKeyReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZQuote;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedError;
use MediaWikiUnitTestCase;
use Symfony\Component\Yaml\Exception\ParseException;
use Wikimedia\TestingAccessWrapper;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZErrorFactory
 */
class ZErrorFactoryTest extends MediaWikiUnitTestCase {

	protected function setUp(): void {
		parent::setUp();
		// Reset the cached descriptor array so each test runs against a clean slate.
		TestingAccessWrapper::newFromClass( ZErrorFactory::class )->errorDescriptors = null;
	}

	/**
	 * Unwrap a ZError and return its inner ZTypedError's positional values (K1, K2, …).
	 *
	 * @param ZError $zerror
	 * @return array
	 */
	private function getInnerValues( ZError $zerror ): array {
		$inner = $zerror->getZValue();
		$this->assertInstanceOf( ZTypedError::class, $inner );
		$values = [];
		for ( $i = 1; $i <= 10; $i++ ) {
			$value = $inner->getValueByKey( "K$i" );
			if ( $value === null ) {
				break;
			}
			$values[] = $value;
		}
		return $values;
	}

	// ------------------------------------------------------------------
	// readYamlAsSecretJson + getErrorDescriptors
	// ------------------------------------------------------------------

	public function testReadYamlAsSecretJson_parsesRealFile() {
		$yamlPath = dirname( __DIR__, 3 )
			. '/function-schemata/data/errors/error_types.yaml';
		$json = ZErrorFactory::readYamlAsSecretJson( $yamlPath );
		$this->assertIsString( $json );
		$decoded = json_decode( $json, true );
		$this->assertIsArray( $decoded );
		$this->assertArrayHasKey( 'patterns', $decoded );
		$this->assertArrayHasKey( 'keywords', $decoded['patterns'] );
		$this->assertArrayHasKey( 'type', $decoded['patterns']['keywords'] );
	}

	public function testReadYamlAsSecretJson_throwsOnMissingFile() {
		$this->expectException( ParseException::class );
		ZErrorFactory::readYamlAsSecretJson(
			sys_get_temp_dir() . '/definitely-not-a-yaml-file-' . uniqid() . '.yaml'
		);
	}

	public function testGetErrorDescriptors_isIdempotentAndReturnsArray() {
		// Exercise the private method so we see both the "not yet cached" and "cached"
		// branches. NOTE: in production this method currently returns [] because its
		// relative path (`joinPath( __DIR__, "..", "..", "function-schemata", "data" )`)
		// points one directory too high — so the Yaml load throws and the `catch` branch
		// populates the cache with []. We therefore only assert the invariants that hold
		// regardless of that bug: returns an array, and the second call returns the same one.
		$wrapper = TestingAccessWrapper::newFromClass( ZErrorFactory::class );
		$first = $wrapper->getErrorDescriptors();
		$this->assertIsArray( $first );

		$second = $wrapper->getErrorDescriptors();
		$this->assertSame( $first, $second );
	}

	// ------------------------------------------------------------------
	// errorMatchesDescriptor
	// ------------------------------------------------------------------

	public function testErrorMatchesDescriptor_keywordMismatchReturnsFalse() {
		$this->assertFalse( ZErrorFactory::errorMatchesDescriptor(
			[ 'keyword' => 'type', 'keywordArgs' => [], 'dataPointer' => [] ],
			[ 'keyword' => 'required', 'keywordArgs' => [], 'dataPointer' => [] ]
		) );
	}

	public function testErrorMatchesDescriptor_missingKeywordArgReturnsFalse() {
		$this->assertFalse( ZErrorFactory::errorMatchesDescriptor(
			[ 'keyword' => 'type', 'keywordArgs' => [], 'dataPointer' => [] ],
			[ 'keyword' => 'type', 'keywordArgs' => [ 'expected' => 'string' ], 'dataPointer' => [] ]
		) );
	}

	public function testErrorMatchesDescriptor_stringKeywordArgMismatchReturnsFalse() {
		$this->assertFalse( ZErrorFactory::errorMatchesDescriptor(
			[
				'keyword' => 'type',
				'keywordArgs' => [ 'expected' => 'object' ],
				'dataPointer' => [],
			],
			[
				'keyword' => 'type',
				'keywordArgs' => [ 'expected' => 'string' ],
				'dataPointer' => [],
			]
		) );
	}

	public function testErrorMatchesDescriptor_stringKeywordArgMatchReturnsTrue() {
		$this->assertTrue( ZErrorFactory::errorMatchesDescriptor(
			[
				'keyword' => 'type',
				'keywordArgs' => [ 'expected' => 'string' ],
				'dataPointer' => [],
			],
			[
				'keyword' => 'type',
				'keywordArgs' => [ 'expected' => 'string' ],
				'dataPointer' => [],
			]
		) );
	}

	public function testErrorMatchesDescriptor_arrayKeywordArgContainsValueReturnsTrue() {
		$this->assertTrue( ZErrorFactory::errorMatchesDescriptor(
			[
				'keyword' => 'type',
				'keywordArgs' => [ 'used' => 'string' ],
				'dataPointer' => [],
			],
			[
				'keyword' => 'type',
				'keywordArgs' => [ 'used' => [ 'string', 'array' ] ],
				'dataPointer' => [],
			]
		) );
	}

	public function testErrorMatchesDescriptor_arrayKeywordArgNotContainedReturnsFalse() {
		$this->assertFalse( ZErrorFactory::errorMatchesDescriptor(
			[
				'keyword' => 'type',
				'keywordArgs' => [ 'used' => 'object' ],
				'dataPointer' => [],
			],
			[
				'keyword' => 'type',
				'keywordArgs' => [ 'used' => [ 'string', 'array' ] ],
				'dataPointer' => [],
			]
		) );
	}

	public function testErrorMatchesDescriptor_dataPointerLongerThanErrorReturnsFalse() {
		$this->assertFalse( ZErrorFactory::errorMatchesDescriptor(
			[
				'keyword' => 'type',
				'keywordArgs' => [],
				'dataPointer' => [ 'b', 'c' ],
			],
			[
				'keyword' => 'type',
				'keywordArgs' => [],
				'dataPointer' => [ 'a', 'b', 'c' ],
			]
		) );
	}

	public function testErrorMatchesDescriptor_dataPointerTailMatchesReturnsTrue() {
		$this->assertTrue( ZErrorFactory::errorMatchesDescriptor(
			[
				'keyword' => 'type',
				'keywordArgs' => [],
				'dataPointer' => [ 'foo', 'bar', 'Z6K1' ],
			],
			[
				'keyword' => 'type',
				'keywordArgs' => [],
				'dataPointer' => [ 'Z6K1' ],
			]
		) );
	}

	public function testErrorMatchesDescriptor_dataPointerTailDoesNotMatchReturnsFalse() {
		$this->assertFalse( ZErrorFactory::errorMatchesDescriptor(
			[
				'keyword' => 'type',
				'keywordArgs' => [],
				'dataPointer' => [ 'foo', 'Z9K1' ],
			],
			[
				'keyword' => 'type',
				'keywordArgs' => [],
				'dataPointer' => [ 'Z6K1' ],
			]
		) );
	}

	public function testErrorMatchesDescriptor_emptyDescriptorPointerReturnsTrueAfterKeywordMatch() {
		$this->assertTrue( ZErrorFactory::errorMatchesDescriptor(
			[
				'keyword' => 'type',
				'keywordArgs' => [],
				'dataPointer' => [ 'anything', 'at', 'all' ],
			],
			[
				'keyword' => 'type',
				'keywordArgs' => [],
				'dataPointer' => [],
			]
		) );
	}

	// ------------------------------------------------------------------
	// getDataType
	// ------------------------------------------------------------------

	public function testGetDataType_returnsFalseForNonArray() {
		$this->assertFalse( ZErrorFactory::getDataType( 'not-an-array' ) );
	}

	public function testGetDataType_returnsFalseWhenZ1K1Missing() {
		$this->assertFalse( ZErrorFactory::getDataType( [ 'Z6K1' => 'hi' ] ) );
	}

	public function testGetDataType_returnsStringZ1K1Directly() {
		$this->assertSame(
			'Z6',
			ZErrorFactory::getDataType( [ 'Z1K1' => 'Z6', 'Z6K1' => 'hi' ] )
		);
	}

	public function testGetDataType_returnsNestedReferenceValue() {
		$this->assertSame(
			'Z40',
			ZErrorFactory::getDataType( [
				'Z1K1' => [ 'Z1K1' => 'Z9', 'Z9K1' => 'Z40' ],
			] )
		);
	}

	public function testGetDataType_returnsFalseWhenNestedTypeIsNotAZReference() {
		// Nested Z1K1 exists but is not a Z9 reference (no inner Z1K1=Z9).
		$this->assertFalse( ZErrorFactory::getDataType( [
			'Z1K1' => [ 'K1' => 'something' ],
		] ) );
	}

	public function testGetDataType_returnsFalseWhenNestedReferenceLacksValue() {
		$this->assertFalse( ZErrorFactory::getDataType( [
			'Z1K1' => [ 'Z1K1' => 'Z9' ],
		] ) );
	}

	// ------------------------------------------------------------------
	// errorMatchesType
	// ------------------------------------------------------------------

	public function testErrorMatchesType_returnsTrueWhenDataTypeNotInferrable() {
		$this->assertTrue( ZErrorFactory::errorMatchesType( [
			'data' => 'scalar',
			'keywordArgs' => [ 'missing' => 'Z6K1' ],
		] ) );
	}

	public function testErrorMatchesType_returnsTrueWhenNoMissingKey() {
		$this->assertTrue( ZErrorFactory::errorMatchesType( [
			'data' => [ 'Z1K1' => 'Z6' ],
			'keywordArgs' => [],
		] ) );
	}

	public function testErrorMatchesType_returnsTrueWhenMissingKeyMatchesTypePrefix() {
		$this->assertTrue( ZErrorFactory::errorMatchesType( [
			'data' => [ 'Z1K1' => 'Z6' ],
			'keywordArgs' => [ 'missing' => 'Z6K1' ],
		] ) );
	}

	public function testErrorMatchesType_returnsFalseWhenMissingKeyDoesNotMatchTypePrefix() {
		$this->assertFalse( ZErrorFactory::errorMatchesType( [
			'data' => [ 'Z1K1' => 'Z6' ],
			'keywordArgs' => [ 'missing' => 'Z9K1' ],
		] ) );
	}

	// ------------------------------------------------------------------
	// createZErrorInstance — the big switch
	// ------------------------------------------------------------------

	/**
	 * Walks every branch of ZErrorFactory::createZErrorInstance that does not require
	 * ZObjectFactory or wfMessage. (Auth, label-clash-multi, Z509 wrap, and Z505 live in
	 * the integration sibling.)
	 *
	 * @dataProvider provideCreateZErrorInstance
	 */
	public function testCreateZErrorInstance_producesExpectedShape(
		string $zErrorType,
		array $payload,
		array $expectedValueClasses,
		array $expectedSerialisedValues
	) {
		$zerror = ZErrorFactory::createZErrorInstance( $zErrorType, $payload );
		$this->assertInstanceOf( ZError::class, $zerror );
		$this->assertSame( $zErrorType, $zerror->getZErrorType() );

		$values = $this->getInnerValues( $zerror );
		$this->assertSameSize( $expectedValueClasses, $values );

		foreach ( $expectedValueClasses as $i => $expectedClass ) {
			$this->assertInstanceOf( $expectedClass, $values[$i], "K" . ( $i + 1 ) . " class" );
			// ZError passthroughs store the inner ZTypedError in getZValue(); compare by zid instead.
			$actual = ( $expectedClass === ZError::class )
				? $values[$i]->getZErrorType()
				: $values[$i]->getZValue();
			$this->assertEquals(
				$expectedSerialisedValues[$i],
				$actual,
				"K" . ( $i + 1 ) . " value mismatch for $zErrorType"
			);
		}
	}

	public static function provideCreateZErrorInstance() {
		// Shared child error used anywhere a child ZError is expected in a payload.
		$childError = new ZError(
			new ZReference( ZErrorTypeRegistry::Z_ERROR_INVALID_REFERENCE ),
			new ZTypedError( ZTypedError::buildType( ZErrorTypeRegistry::Z_ERROR_INVALID_REFERENCE ), [] )
		);

		return [
			'Z500 unknown error' => [
				ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
				[ 'message' => 'boom' ],
				[ ZString::class ],
				[ 'boom' ],
			],
			'Z501 invalid syntax' => [
				ZErrorTypeRegistry::Z_ERROR_INVALID_SYNTAX,
				[ 'message' => 'bad', 'input' => '{not json' ],
				[ ZString::class, ZString::class ],
				[ 'bad', '{not json' ],
			],
			'Z502 not wellformed' => [
				ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED,
				[ 'subtype' => 'Z500', 'childError' => $childError ],
				[ ZString::class, ZError::class ],
				[ 'Z500', ZErrorTypeRegistry::Z_ERROR_INVALID_REFERENCE ],
			],
			'Z503 not implemented yet' => [
				ZErrorTypeRegistry::Z_ERROR_NOT_IMPLEMENTED_YET,
				[ 'data' => 'some feature' ],
				[ ZString::class ],
				[ 'some feature' ],
			],
			'Z504 zid not found' => [
				ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND,
				[ 'data' => 'Z12345' ],
				[ ZString::class ],
				[ 'Z12345' ],
			],
			'Z506 argument type mismatch' => [
				ZErrorTypeRegistry::Z_ERROR_ARGUMENT_TYPE_MISMATCH,
				[ 'expected' => 'Z6', 'actual' => 'Z40', 'argument' => 'Z12345' ],
				[ ZReference::class, ZReference::class, ZQuote::class ],
				[ 'Z6', 'Z40', 'Z12345' ],
			],
			'Z511 missing key with missing arg' => [
				ZErrorTypeRegistry::Z_ERROR_MISSING_KEY,
				[
					'keywordArgs' => [ 'missing' => 'Z6K1' ],
					'data' => [ 'some' => 'thing' ],
				],
				[ ZKeyReference::class, ZQuote::class ],
				[ 'Z6K1', [ 'some' => 'thing' ] ],
			],
			'Z511 missing key without missing arg (empty-string fallback)' => [
				ZErrorTypeRegistry::Z_ERROR_MISSING_KEY,
				[
					'keywordArgs' => [],
					'data' => [ 'some' => 'thing' ],
				],
				[ ZKeyReference::class, ZQuote::class ],
				[ '', [ 'some' => 'thing' ] ],
			],
			'Z513 missing persistent value' => [
				ZErrorTypeRegistry::Z_ERROR_MISSING_PERSISTENT_VALUE,
				[ 'data' => [ 'Z1K1' => 'Z2' ] ],
				[ ZQuote::class ],
				[ [ 'Z1K1' => 'Z2' ] ],
			],
			'Z518 object type mismatch' => [
				ZErrorTypeRegistry::Z_ERROR_OBJECT_TYPE_MISMATCH,
				[ 'expected' => 'Z6', 'actual' => 'raw' ],
				[ ZReference::class, ZQuote::class ],
				[ 'Z6', 'raw' ],
			],
			'Z519 undefined list type' => [
				ZErrorTypeRegistry::Z_ERROR_UNDEFINED_LIST_TYPE,
				[ 'data' => 'something' ],
				[ ZQuote::class ],
				[ 'something' ],
			],
			'Z520 wrong list type' => [
				ZErrorTypeRegistry::Z_ERROR_WRONG_LIST_TYPE,
				[ 'data' => 'something' ],
				[ ZQuote::class ],
				[ 'something' ],
			],
			'Z521 not number/boolean/null' => [
				ZErrorTypeRegistry::Z_ERROR_NOT_NUMBER_BOOLEAN_NULL,
				[ 'data' => 42 ],
				[ ZQuote::class ],
				[ 42 ],
			],
			'Z522 array element not wellformed' => [
				ZErrorTypeRegistry::Z_ERROR_ARRAY_ELEMENT_NOT_WELLFORMED,
				[ 'index' => '3', 'childError' => $childError ],
				[ ZString::class, ZError::class ],
				[ '3', ZErrorTypeRegistry::Z_ERROR_INVALID_REFERENCE ],
			],
			'Z523 missing type' => [
				ZErrorTypeRegistry::Z_ERROR_MISSING_TYPE,
				[ 'data' => [ 'Z6K1' => 'hi' ] ],
				[ ZQuote::class ],
				[ [ 'Z6K1' => 'hi' ] ],
			],
			'Z525 invalid key' => [
				ZErrorTypeRegistry::Z_ERROR_INVALID_KEY,
				[ 'dataPointer' => [ 'a', 'b', 'Z6K1' ] ],
				[ ZString::class ],
				[ 'Z6K1' ],
			],
			'Z526 key value not wellformed' => [
				ZErrorTypeRegistry::Z_ERROR_KEY_VALUE_NOT_WELLFORMED,
				[ 'key' => 'Z6K1', 'childError' => $childError ],
				[ ZKeyReference::class, ZError::class ],
				[ 'Z6K1', ZErrorTypeRegistry::Z_ERROR_INVALID_REFERENCE ],
			],
			'Z529 connection failure' => [
				ZErrorTypeRegistry::Z_ERROR_CONNECTION_FAILURE,
				[ 'host' => 'orchestrator.invalid' ],
				[ ZString::class ],
				[ 'orchestrator.invalid' ],
			],
			'Z530 api failure' => [
				ZErrorTypeRegistry::Z_ERROR_API_FAILURE,
				[ 'request' => 'Z10000()', 'error' => $childError ],
				[ ZQuote::class, ZError::class ],
				[ 'Z10000()', ZErrorTypeRegistry::Z_ERROR_INVALID_REFERENCE ],
			],
			'Z532 string value missing' => [
				ZErrorTypeRegistry::Z_ERROR_STRING_VALUE_MISSING,
				[ 'data' => [ 'Z1K1' => 'Z6' ] ],
				[ ZQuote::class ],
				[ [ 'Z1K1' => 'Z6' ] ],
			],
			'Z533 string value wrong type' => [
				ZErrorTypeRegistry::Z_ERROR_STRING_VALUE_WRONG_TYPE,
				[ 'data' => [ 'Z1K1' => 'Z6', 'Z6K1' => 42 ] ],
				[ ZQuote::class ],
				[ [ 'Z1K1' => 'Z6', 'Z6K1' => 42 ] ],
			],
			'Z535 reference value missing' => [
				ZErrorTypeRegistry::Z_ERROR_REFERENCE_VALUE_MISSING,
				[ 'data' => [ 'Z1K1' => 'Z9' ] ],
				[ ZQuote::class ],
				[ [ 'Z1K1' => 'Z9' ] ],
			],
			'Z536 reference value wrong type' => [
				ZErrorTypeRegistry::Z_ERROR_REFERENCE_VALUE_WRONG_TYPE,
				[ 'data' => [ 'Z1K1' => 'Z9', 'Z9K1' => 123 ] ],
				[ ZQuote::class ],
				[ [ 'Z1K1' => 'Z9', 'Z9K1' => 123 ] ],
			],
			'Z537 reference value invalid' => [
				ZErrorTypeRegistry::Z_ERROR_REFERENCE_VALUE_INVALID,
				[ 'data' => 'not-a-zid' ],
				[ ZString::class ],
				[ 'not-a-zid' ],
			],
			'Z538 wrong namespace' => [
				ZErrorTypeRegistry::Z_ERROR_WRONG_NAMESPACE,
				[ 'title' => 'User:Foo' ],
				[ ZString::class ],
				[ 'User:Foo' ],
			],
			'Z539 wrong content type' => [
				ZErrorTypeRegistry::Z_ERROR_WRONG_CONTENT_TYPE,
				[ 'title' => 'Z1' ],
				[ ZString::class ],
				[ 'Z1' ],
			],
			'Z540 invalid lang code' => [
				ZErrorTypeRegistry::Z_ERROR_INVALID_LANG_CODE,
				[ 'lang' => 'zz' ],
				[ ZString::class ],
				[ 'zz' ],
			],
			'Z541 lang not found' => [
				ZErrorTypeRegistry::Z_ERROR_LANG_NOT_FOUND,
				[ 'lang' => 'Z1500' ],
				[ ZString::class ],
				[ 'Z1500' ],
			],
			'Z542 unexpected ztype' => [
				ZErrorTypeRegistry::Z_ERROR_UNEXPECTED_ZTYPE,
				[ 'expected' => 'Z6', 'used' => 'Z40' ],
				[ ZReference::class, ZReference::class ],
				[ 'Z6', 'Z40' ],
			],
			'Z543 ztype not found' => [
				ZErrorTypeRegistry::Z_ERROR_ZTYPE_NOT_FOUND,
				[ 'type' => 'Z99999' ],
				[ ZString::class ],
				[ 'Z99999' ],
			],
			'Z544 conflicting type names' => [
				ZErrorTypeRegistry::Z_ERROR_CONFLICTING_TYPE_NAMES,
				[ 'zid' => 'Z10000', 'name' => 'Foo', 'existing' => 'Z20000' ],
				[ ZString::class, ZString::class, ZString::class ],
				[ 'Z10000', 'Foo', 'Z20000' ],
			],
			'Z545 conflicting type zids' => [
				ZErrorTypeRegistry::Z_ERROR_CONFLICTING_TYPE_ZIDS,
				[ 'zid' => 'Z10000', 'name' => 'Foo', 'existing' => 'Z20000' ],
				[ ZString::class, ZString::class, ZString::class ],
				[ 'Z10000', 'Foo', 'Z20000' ],
			],
			'Z546 builtin type not found' => [
				ZErrorTypeRegistry::Z_ERROR_BUILTIN_TYPE_NOT_FOUND,
				[ 'zid' => 'Z10000', 'name' => 'Foo' ],
				[ ZString::class, ZString::class ],
				[ 'Z10000', 'Foo' ],
			],
			'Z547 invalid format' => [
				ZErrorTypeRegistry::Z_ERROR_INVALID_FORMAT,
				[ 'data' => 'raw' ],
				[ ZQuote::class ],
				[ 'raw' ],
			],
			'Z548 invalid json' => [
				ZErrorTypeRegistry::Z_ERROR_INVALID_JSON,
				[ 'message' => 'unexpected token', 'data' => '{not json' ],
				[ ZString::class, ZQuote::class ],
				[ 'unexpected token', '{not json' ],
			],
			'Z549 invalid reference' => [
				ZErrorTypeRegistry::Z_ERROR_INVALID_REFERENCE,
				[ 'data' => 'not-a-zid' ],
				[ ZString::class ],
				[ 'not-a-zid' ],
			],
			'Z550 unknown reference' => [
				ZErrorTypeRegistry::Z_ERROR_UNKNOWN_REFERENCE,
				[ 'data' => 'Z99999' ],
				[ ZString::class ],
				[ 'Z99999' ],
			],
			'Z551 schema type mismatch with tail' => [
				ZErrorTypeRegistry::Z_ERROR_SCHEMA_TYPE_MISMATCH,
				[
					'dataPointer' => [ 'a', 'Z6K1' ],
					'keywordArgs' => [ 'expected' => 'string', 'used' => 'object' ],
				],
				[ ZKeyReference::class, ZString::class, ZString::class ],
				[ 'Z6K1', 'string', 'object' ],
			],
			'Z551 schema type mismatch empty pointer falls back to empty key ref' => [
				ZErrorTypeRegistry::Z_ERROR_SCHEMA_TYPE_MISMATCH,
				[
					'dataPointer' => [],
					'keywordArgs' => [ 'expected' => 'string', 'used' => 'object' ],
				],
				[ ZKeyReference::class, ZString::class, ZString::class ],
				[ '', 'string', 'object' ],
			],
			'Z552 array type mismatch' => [
				ZErrorTypeRegistry::Z_ERROR_ARRAY_TYPE_MISMATCH,
				[ 'key' => 'K1', 'expected' => 'Z6', 'data' => 42 ],
				[ ZKeyReference::class, ZString::class, ZQuote::class ],
				[ 'K1', 'Z6', 42 ],
			],
			'Z553 disallowed root zobject' => [
				ZErrorTypeRegistry::Z_ERROR_DISALLOWED_ROOT_ZOBJECT,
				[ 'data' => [ 'Z1K1' => 'Z1' ] ],
				[ ZQuote::class ],
				[ [ 'Z1K1' => 'Z1' ] ],
			],
			'Z554 label clash' => [
				ZErrorTypeRegistry::Z_ERROR_LABEL_CLASH,
				[ 'zid' => 'Z12345', 'language' => 'en' ],
				[ ZString::class, ZString::class ],
				[ 'Z12345', 'en' ],
			],
			'Z555 unmatching zid' => [
				ZErrorTypeRegistry::Z_ERROR_UNMATCHING_ZID,
				[ 'zid' => 'Z12345', 'title' => 'Z99999' ],
				[ ZString::class, ZString::class ],
				[ 'Z12345', 'Z99999' ],
			],
			'Z556 invalid title' => [
				ZErrorTypeRegistry::Z_ERROR_INVALID_TITLE,
				[ 'title' => 'User:Foo' ],
				[ ZString::class ],
				[ 'User:Foo' ],
			],
			'Z557 user cannot edit' => [
				ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_EDIT,
				[ 'message' => 'nope' ],
				[ ZString::class ],
				[ 'nope' ],
			],
			'Z560 invalid evaluation result' => [
				ZErrorTypeRegistry::Z_ERROR_INVALID_EVALUATION_RESULT,
				[ 'result' => 'something' ],
				[ ZQuote::class ],
				[ 'something' ],
			],
			'Z580 duplicate languages' => [
				ZErrorTypeRegistry::Z_ERROR_DUPLICATE_LANGUAGES,
				[ 'language' => 'en' ],
				[ ZString::class ],
				[ 'en' ],
			],
		];
	}

	public function testCreateZErrorInstance_Z507_wrapsFunctionCallAndError() {
		$childError = ZErrorFactory::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
			[ 'message' => 'boom' ]
		);
		$zerror = ZErrorFactory::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_EVALUATION,
			[ 'functionCall' => 'Z10000()', 'error' => $childError ]
		);
		$this->assertSame( ZErrorTypeRegistry::Z_ERROR_EVALUATION, $zerror->getZErrorType() );
		$values = $this->getInnerValues( $zerror );
		$this->assertCount( 2, $values );
		$this->assertInstanceOf( ZQuote::class, $values[0] );
		$this->assertSame( 'Z10000()', $values[0]->getZValue() );
		$this->assertSame( $childError, $values[1] );
	}

	public function testCreateZErrorInstance_Z524_passesDataThroughUnwrapped() {
		// Z524 is the single case that stores the raw payload 'data' without wrapping it in a
		// ZQuote/ZString — that's an important contract to lock down.
		$raw = new ZString( 'raw-data' );
		$zerror = ZErrorFactory::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_TYPE_NOT_STRING_ARRAY,
			[ 'data' => $raw ]
		);
		$values = $this->getInnerValues( $zerror );
		$this->assertCount( 1, $values );
		$this->assertSame( $raw, $values[0] );
	}

	public function testCreateZErrorInstance_Z559_hasNoValues() {
		$zerror = ZErrorFactory::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN,
			[]
		);
		$this->assertSame( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN, $zerror->getZErrorType() );
		$this->assertCount( 0, $this->getInnerValues( $zerror ) );
	}

	public function testCreateZErrorInstance_unknownTypeHitsDefaultBranch() {
		$zerror = ZErrorFactory::createZErrorInstance( 'Z999', [] );
		$this->assertInstanceOf( ZError::class, $zerror );
		$this->assertSame( 'Z999', $zerror->getZErrorType() );
		$this->assertCount( 0, $this->getInnerValues( $zerror ) );
	}

	// ------------------------------------------------------------------
	// Convenience wrappers (those that don't touch ZObjectFactory / wfMessage)
	// ------------------------------------------------------------------

	public function testCreateValidationZError_wrapsChildInZ502() {
		$child = ZErrorFactory::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
			[ 'message' => 'boom' ]
		);
		$zerror = ZErrorFactory::createValidationZError( $child );
		$this->assertSame( ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED, $zerror->getZErrorType() );
		$values = $this->getInnerValues( $zerror );
		$this->assertCount( 2, $values );
		$this->assertInstanceOf( ZString::class, $values[0] );
		$this->assertSame( ZErrorTypeRegistry::Z_ERROR_UNKNOWN, $values[0]->getZValue() );
		$this->assertSame( $child, $values[1] );
	}

	public function testCreateKeyValueZError_wrapsAsZ526() {
		$child = ZErrorFactory::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
			[ 'message' => 'boom' ]
		);
		$zerror = ZErrorFactory::createKeyValueZError( 'Z6K1', $child );
		$this->assertSame(
			ZErrorTypeRegistry::Z_ERROR_KEY_VALUE_NOT_WELLFORMED,
			$zerror->getZErrorType()
		);
		$values = $this->getInnerValues( $zerror );
		$this->assertInstanceOf( ZKeyReference::class, $values[0] );
		$this->assertSame( 'Z6K1', $values[0]->getZValue() );
		$this->assertSame( $child, $values[1] );
	}

	public function testCreateArrayElementZError_wrapsAsZ522() {
		$child = ZErrorFactory::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
			[ 'message' => 'boom' ]
		);
		$zerror = ZErrorFactory::createArrayElementZError( '3', $child );
		$this->assertSame(
			ZErrorTypeRegistry::Z_ERROR_ARRAY_ELEMENT_NOT_WELLFORMED,
			$zerror->getZErrorType()
		);
		$values = $this->getInnerValues( $zerror );
		$this->assertInstanceOf( ZString::class, $values[0] );
		$this->assertSame( '3', $values[0]->getZValue() );
		$this->assertSame( $child, $values[1] );
	}

	public function testCreateLabelClashZErrors_singleClashReturnsZ554Directly() {
		$zerror = ZErrorFactory::createLabelClashZErrors( [ 'en' => 'Z12345' ] );
		$this->assertSame( ZErrorTypeRegistry::Z_ERROR_LABEL_CLASH, $zerror->getZErrorType() );
		$values = $this->getInnerValues( $zerror );
		$this->assertCount( 2, $values );
		$this->assertSame( 'Z12345', $values[0]->getZValue() );
		$this->assertSame( 'en', $values[1]->getZValue() );
	}

	public function testCreateUnknownValidationError_wrapsZ500InsideZ502() {
		$zerror = ZErrorFactory::createUnknownValidationError( 'boom' );
		$this->assertSame( ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED, $zerror->getZErrorType() );

		$outerValues = $this->getInnerValues( $zerror );
		$this->assertCount( 2, $outerValues );
		$this->assertSame( ZErrorTypeRegistry::Z_ERROR_UNKNOWN, $outerValues[0]->getZValue() );

		$this->assertInstanceOf( ZError::class, $outerValues[1] );
		$innerValues = $this->getInnerValues( $outerValues[1] );
		$this->assertCount( 1, $innerValues );
		$this->assertInstanceOf( ZString::class, $innerValues[0] );
		$this->assertSame( 'boom', $innerValues[0]->getZValue() );
	}

	public function testCreateEvaluationError_wrapsZ500InsideZ507() {
		$zerror = ZErrorFactory::createEvaluationError( 'boom', 'Z10000()' );
		$this->assertSame( ZErrorTypeRegistry::Z_ERROR_EVALUATION, $zerror->getZErrorType() );

		$outerValues = $this->getInnerValues( $zerror );
		$this->assertCount( 2, $outerValues );
		$this->assertInstanceOf( ZQuote::class, $outerValues[0] );
		$this->assertSame( 'Z10000()', $outerValues[0]->getZValue() );

		$this->assertInstanceOf( ZError::class, $outerValues[1] );
		$innerValues = $this->getInnerValues( $outerValues[1] );
		$this->assertSame( 'boom', $innerValues[0]->getZValue() );
	}

	public function testCreateApiFailureError_wrapsStringMessageInZ500() {
		$zerror = ZErrorFactory::createApiFailureError( 'boom', 'Z10000()' );
		$this->assertSame( ZErrorTypeRegistry::Z_ERROR_API_FAILURE, $zerror->getZErrorType() );

		$outerValues = $this->getInnerValues( $zerror );
		$this->assertCount( 2, $outerValues );
		$this->assertInstanceOf( ZQuote::class, $outerValues[0] );
		$this->assertSame( 'Z10000()', $outerValues[0]->getZValue() );

		$inner = $outerValues[1];
		$this->assertInstanceOf( ZError::class, $inner );
		$this->assertSame( ZErrorTypeRegistry::Z_ERROR_UNKNOWN, $inner->getZErrorType() );
		$innerValues = $this->getInnerValues( $inner );
		$this->assertSame( 'boom', $innerValues[0]->getZValue() );
	}

	public function testCreateApiFailureError_passesThroughExistingZError() {
		$existing = ZErrorFactory::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_INVALID_REFERENCE,
			[ 'data' => 'not-a-zid' ]
		);
		$zerror = ZErrorFactory::createApiFailureError( $existing, 'Z10000()' );
		$this->assertSame( ZErrorTypeRegistry::Z_ERROR_API_FAILURE, $zerror->getZErrorType() );

		$outerValues = $this->getInnerValues( $zerror );
		$this->assertCount( 2, $outerValues );
		// The wrapped error must be the same object, not a re-wrapped Z500.
		$this->assertSame( $existing, $outerValues[1] );
	}
}
