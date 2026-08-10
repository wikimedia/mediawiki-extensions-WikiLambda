<?php

/**
 * WikiLambda unit test suite for the CommunityConfiguration UI schemas.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Config;

use MediaWiki\Extension\CommunityConfiguration\Schema\UISchema;
use MediaWiki\Extension\WikiLambda\Config\AbstractSuggestedFunctionsSchema;
use MediaWiki\Extension\WikiLambda\Config\AbstractSuggestedFunctionsUISchema;
use MediaWiki\Extension\WikiLambda\Config\AbstractWikiOptedInArticlesSchema;
use MediaWiki\Extension\WikiLambda\Config\AbstractWikiOptedInArticlesUISchema;
use MediaWiki\Extension\WikiLambda\Config\SuggestedFunctionsSchema;
use MediaWiki\Extension\WikiLambda\Config\SuggestedFunctionsUISchema;
use MediaWikiUnitTestCase;
use ReflectionClass;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Config\SuggestedFunctionsUISchema
 * @covers \MediaWiki\Extension\WikiLambda\Config\AbstractSuggestedFunctionsUISchema
 * @covers \MediaWiki\Extension\WikiLambda\Config\AbstractWikiOptedInArticlesUISchema
 */
class UISchemasTest extends MediaWikiUnitTestCase {

	protected function setUp(): void {
		parent::setUp();
		if ( !class_exists( UISchema::class ) ) {
			$this->markTestSkipped( 'CommunityConfiguration is not installed' );
		}
	}

	/**
	 * The control names that extension.json says this extension supplies.
	 *
	 * @return string[]
	 */
	private static function getRegisteredControlNames(): array {
		$extensionJson = json_decode(
			file_get_contents( __DIR__ . '/../../../../extension.json' ), true
		);
		return array_keys(
			$extensionJson['attributes']['CommunityConfiguration']['Controls'] ?? []
		);
	}

	public static function provideUiSchema(): array {
		return [
			'client mode functions' => [
				SuggestedFunctionsSchema::class,
				SuggestedFunctionsUISchema::class,
			],
			'abstract mode functions' => [
				AbstractSuggestedFunctionsSchema::class,
				AbstractSuggestedFunctionsUISchema::class,
			],
			'abstract client opted-in articles' => [
				AbstractWikiOptedInArticlesSchema::class,
				AbstractWikiOptedInArticlesUISchema::class,
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
			$schemaClass::UI_SCHEMA
		);
	}

	/**
	 * @param string $schemaClass
	 * @param string $uiSchemaClass
	 * @dataProvider provideUiSchema
	 */
	public function testEveryControlItAsksForIsRegistered( string $schemaClass, string $uiSchemaClass ): void {
		// A name that no extension registers leaves the form falling back to a control of the data
		// schema, which is a silent loss of the whole point of the UI schema.
		$registered = self::getRegisteredControlNames();
		$asked = [];
		foreach ( UISchema::flattenElements( $uiSchemaClass::ROOT ) as $element ) {
			if ( isset( $element[UISchema::CONTROL] ) ) {
				$asked[] = $element[UISchema::CONTROL];
			}
		}

		$this->assertNotSame( [], $asked, 'the UI schema asks for at least one control' );
		$this->assertSame( [], array_diff( $asked, $registered ) );
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

	/**
	 * @param string $schemaClass
	 * @param string $uiSchemaClass
	 * @dataProvider provideUiSchema
	 */
	public function testEveryMessageAnOptionNamesIsAlsoInMessages(
		string $schemaClass, string $uiSchemaClass
	): void {
		// A message that only an option names is never sent to the client, so the control would
		// show the key instead of the text.
		foreach ( UISchema::flattenElements( $uiSchemaClass::ROOT ) as $element ) {
			foreach ( $element[UISchema::OPTIONS] ?? [] as $option => $value ) {
				if ( str_ends_with( (string)$option, 'Message' ) ) {
					$this->assertContains( $value, $element[UISchema::MESSAGES] ?? [] );
				}
			}
		}
		$this->addToAssertionCount( 1 );
	}

	public function testClientModeFunctionsAskForNoOutputType(): void {
		$options = SuggestedFunctionsUISchema::ROOT[UISchema::ELEMENTS][0][UISchema::OPTIONS] ?? [];

		// The VisualEditor dialog can call a function of any return type.
		$this->assertArrayNotHasKey( 'outputType', $options );
	}

	public function testAbstractModeFunctionsAskForHtmlReturningFunctionsOnly(): void {
		$control = null;
		foreach ( UISchema::flattenElements( AbstractSuggestedFunctionsUISchema::ROOT ) as $element ) {
			if ( isset( $element[UISchema::CONTROL] ) ) {
				$control = $element;
			}
		}

		// Abstract Wikipedia puts the result straight into an article, so it has to be HTML.
		$this->assertSame( 'Z89', $control[UISchema::OPTIONS]['outputType'] ?? null );
	}

	public function testAbstractModeFunctionsGroupTheFieldUnderAHeading(): void {
		$group = AbstractSuggestedFunctionsUISchema::ROOT[UISchema::ELEMENTS][0];

		$this->assertSame( UISchema::TYPE_GROUP, $group[UISchema::TYPE] );
		$this->assertIsString( $group[UISchema::LABEL] );
		$this->assertNotSame( '', $group[UISchema::LABEL] );
	}

	public function testOptedInArticlesTakesTheWholeList(): void {
		$elements = AbstractWikiOptedInArticlesUISchema::ROOT[UISchema::ELEMENTS];

		// The Qid of an entry sits below the top level, which a layout cannot name yet, so the
		// control takes the whole list and draws the rows itself.
		$this->assertCount( 1, $elements );
		$this->assertSame( '#/properties/OptedInArticles', $elements[0][UISchema::SCOPE] );
		$this->assertSame( 'WikiLambda.OptedInArticles', $elements[0][UISchema::CONTROL] );
	}

	public function testEachProviderAsksForItsOwnControl(): void {
		// One module for each control, so a form only loads the control it uses.
		$controls = [];
		foreach ( self::provideUiSchema() as [ , $uiSchemaClass ] ) {
			foreach ( UISchema::flattenElements( $uiSchemaClass::ROOT ) as $element ) {
				if ( isset( $element[UISchema::CONTROL] ) ) {
					$controls[$uiSchemaClass] = $element[UISchema::CONTROL];
				}
			}
		}

		$this->assertSame( [
			SuggestedFunctionsUISchema::class => 'WikiLambda.FunctionLookup',
			AbstractSuggestedFunctionsUISchema::class => 'WikiLambda.FunctionLookup',
			AbstractWikiOptedInArticlesUISchema::class => 'WikiLambda.OptedInArticles',
		], $controls );
	}
}
