<?php

/**
 * WikiLambda unit test suite for the UI schemas of the suggested-function lists.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Config;

use MediaWiki\Extension\CommunityConfiguration\Schema\UISchema;
use MediaWiki\Extension\WikiLambda\Config\AbstractSuggestedFunctionsSchema;
use MediaWiki\Extension\WikiLambda\Config\AbstractSuggestedFunctionsUISchema;
use MediaWiki\Extension\WikiLambda\Config\SuggestedFunctionsSchema;
use MediaWiki\Extension\WikiLambda\Config\SuggestedFunctionsUISchema;
use MediaWikiUnitTestCase;
use ReflectionClass;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Config\SuggestedFunctionsUISchema
 * @covers \MediaWiki\Extension\WikiLambda\Config\AbstractSuggestedFunctionsUISchema
 */
class SuggestedFunctionsUISchemaTest extends MediaWikiUnitTestCase {

	/** @var string The name that extension.json registers our control under. */
	private const CONTROL_NAME = 'WikiLambda.FunctionLookup';

	protected function setUp(): void {
		parent::setUp();
		if ( !class_exists( UISchema::class ) ) {
			$this->markTestSkipped( 'CommunityConfiguration is not installed' );
		}
	}

	public static function provideUiSchema(): array {
		return [
			'client mode' => [ SuggestedFunctionsSchema::class, SuggestedFunctionsUISchema::class ],
			'abstract mode' => [
				AbstractSuggestedFunctionsSchema::class,
				AbstractSuggestedFunctionsUISchema::class,
			],
		];
	}

	/**
	 * @param string $schemaClass
	 * @param string $uiSchemaClass
	 * @dataProvider provideUiSchema
	 */
	public function testDataSchemaPointsAtItsUiSchema( string $schemaClass, string $uiSchemaClass ): void {
		$this->assertSame(
			$uiSchemaClass,
			( new ReflectionClass( $schemaClass ) )->getConstant( 'UI_SCHEMA' )
		);
	}

	/**
	 * @param string $schemaClass
	 * @param string $uiSchemaClass
	 * @dataProvider provideUiSchema
	 */
	public function testAsksForOurControl( string $schemaClass, string $uiSchemaClass ): void {
		$controls = [];
		foreach ( UISchema::flattenElements( $uiSchemaClass::ROOT ) as $element ) {
			if ( isset( $element[UISchema::CONTROL] ) ) {
				$controls[] = $element[UISchema::CONTROL];
			}
		}

		$this->assertSame( [ self::CONTROL_NAME ], $controls );
	}

	/**
	 * @param string $schemaClass
	 * @param string $uiSchemaClass
	 * @dataProvider provideUiSchema
	 */
	public function testEveryScopeIsATopLevelPropertyOfTheDataSchema(
		string $schemaClass, string $uiSchemaClass
	): void {
		// The first iteration of the UI schema places top-level properties only, and a scope that
		// resolves to nothing is dropped with a warning, so the field would quietly move to the end
		// of the form.
		$properties = array_keys( ( new ReflectionClass( $schemaClass ) )->getConstants() );

		foreach ( UISchema::flattenElements( $uiSchemaClass::ROOT ) as $element ) {
			$scope = $element[UISchema::SCOPE] ?? null;
			if ( $scope === null ) {
				continue;
			}
			$this->assertMatchesRegularExpression( '!^#/properties/[^/]+$!', $scope );
			$this->assertContains( substr( $scope, strlen( '#/properties/' ) ), $properties );
		}
	}

	/**
	 * @param string $schemaClass
	 * @param string $uiSchemaClass
	 * @dataProvider provideUiSchema
	 */
	public function testOptionsDoNotReachIntoValidation(
		string $schemaClass, string $uiSchemaClass
	): void {
		// The UI schema is for presentation only. An option that shares a name with a JSON Schema
		// keyword would be a way to smuggle validation into it, which ADR 0002 rules out.
		$jsonSchemaKeywords = [
			'type', 'items', 'properties', 'required', 'enum', 'pattern', 'default',
			'minItems', 'maxItems', 'minLength', 'maxLength', 'additionalProperties',
		];

		$options = [];
		foreach ( UISchema::flattenElements( $uiSchemaClass::ROOT ) as $element ) {
			$options = array_merge( $options, array_keys( $element[UISchema::OPTIONS] ?? [] ) );
		}

		$this->assertSame( [], array_intersect( $options, $jsonSchemaKeywords ) );
	}

	public function testClientModeAsksForNoOutputType(): void {
		$options = SuggestedFunctionsUISchema::ROOT[UISchema::ELEMENTS][0][UISchema::OPTIONS] ?? [];

		// The VisualEditor dialog can call a function of any return type.
		$this->assertArrayNotHasKey( 'outputType', $options );
	}

	public function testAbstractModeAsksForHtmlReturningFunctionsOnly(): void {
		$elements = UISchema::flattenElements( AbstractSuggestedFunctionsUISchema::ROOT );
		$control = null;
		foreach ( $elements as $element ) {
			if ( isset( $element[UISchema::CONTROL] ) ) {
				$control = $element;
			}
		}

		// Abstract Wikipedia puts the result straight into an article, so it has to be HTML.
		$this->assertSame( 'Z89', $control[UISchema::OPTIONS]['outputType'] ?? null );
	}

	public function testAbstractModeAsksForTheMessagesItNames(): void {
		// A message that the UI schema names in an option has to be in MESSAGES too, or the server
		// never sends it and the control shows the key.
		foreach ( UISchema::flattenElements( AbstractSuggestedFunctionsUISchema::ROOT ) as $element ) {
			$hint = $element[UISchema::OPTIONS]['hintMessage'] ?? null;
			if ( $hint !== null ) {
				$this->assertContains( $hint, $element[UISchema::MESSAGES] ?? [] );
			}
		}
	}

	public function testAbstractModeGroupsTheFieldUnderAHeading(): void {
		$root = AbstractSuggestedFunctionsUISchema::ROOT;
		$group = $root[UISchema::ELEMENTS][0];

		$this->assertSame( UISchema::TYPE_GROUP, $group[UISchema::TYPE] );
		$this->assertIsString( $group[UISchema::LABEL] );
		$this->assertNotSame( '', $group[UISchema::LABEL] );
	}
}
