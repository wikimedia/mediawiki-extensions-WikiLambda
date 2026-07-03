<?php

/**
 * WikiLambda integration test suite for the ZObjectSearchIndexFieldsBuilder
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use CirrusSearch\Search\CirrusIndexField;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Search\ZObjectMultilingualIndexField;
use MediaWiki\Extension\WikiLambda\Search\ZObjectSearchIndexFieldsBuilder;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectContent\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\MainConfigNames;
use MediaWiki\Registration\ExtensionRegistry;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Search\ZObjectSearchIndexFieldsBuilder
 * @covers \MediaWiki\Extension\WikiLambda\Search\ZObjectMultilingualIndexField
 * @group Database
 */
class ZObjectSearchIndexFieldsBuilderTest extends WikiLambdaRepoModeIntegrationTestCase {

	private function skipIfNoCirrusSearch(): void {
		if ( !ExtensionRegistry::getInstance()->isLoaded( 'CirrusSearch' ) ) {
			$this->markTestSkipped( 'CirrusSearch extension is not loaded' );
		}
	}

	/**
	 * Register the languages and insert the built-in types the multilingual fixtures need to be
	 * parsed and validated as ZObjectContent.
	 */
	private function seedMultilingualDependencies(): void {
		$this->registerLangs( [ 'en', 'es', 'fr' ] );
		$this->insertZids( [ 'Z2', 'Z6', 'Z9', 'Z11', 'Z12', 'Z31', 'Z32' ] );
	}

	/**
	 * A non-function ZObject (a Z2 wrapping a Z6 string) with labels in en/es/fr, aliases in
	 * en (two) and fr (one), and a description in en only.
	 *
	 * @return ZObjectContent
	 */
	private function makeMultilingualContent(): ZObjectContent {
		return new ZObjectContent(
			'{'
			. '"Z1K1": "Z2",'
			. '"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
			. '"Z2K2": "the underlying string value",'
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11",'
			. '  { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "English label" },'
			. '  { "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "Spanish label" },'
			. '  { "Z1K1": "Z11", "Z11K1": "Z1004", "Z11K2": "French label" }'
			. '] },'
			. '"Z2K4": { "Z1K1": "Z32", "Z32K1": [ "Z31",'
			. '  { "Z1K1": "Z31", "Z31K1": "Z1002", "Z31K2": [ "Z6", "English alias one", "English alias two" ] },'
			. '  { "Z1K1": "Z31", "Z31K1": "Z1004", "Z31K2": [ "Z6", "French alias" ] }'
			. '] },'
			. '"Z2K5": { "Z1K1": "Z12", "Z12K1": [ "Z11",'
			. '  { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "English description" }'
			. '] }'
			. '}'
		);
	}

	public function testGetDataLabelsRespectAllowlist() {
		$this->seedMultilingualDependencies();
		$builder = new ZObjectSearchIndexFieldsBuilder( [ 'en', 'es' ], ZLangRegistry::singleton() );
		$data = $builder->getData( $this->makeMultilingualContent() );

		$this->assertSame(
			[ 'en' => 'English label', 'es' => 'Spanish label' ],
			$data['zobject_labels'],
			'Only allowlisted languages get a per-language label; French is excluded'
		);
	}

	public function testGetDataAliasesRespectAllowlistAndOmitEmptyLanguages() {
		$this->seedMultilingualDependencies();
		$builder = new ZObjectSearchIndexFieldsBuilder( [ 'en', 'es' ], ZLangRegistry::singleton() );
		$data = $builder->getData( $this->makeMultilingualContent() );

		$this->assertSame(
			[ 'en' => [ 'English alias one', 'English alias two' ] ],
			$data['zobject_aliases'],
			'French aliases are off-allowlist and Spanish has no aliases, so only English remains'
		);
	}

	public function testGetDataDescriptionsRespectAllowlist() {
		$this->seedMultilingualDependencies();
		$builder = new ZObjectSearchIndexFieldsBuilder( [ 'en', 'es' ], ZLangRegistry::singleton() );
		$data = $builder->getData( $this->makeMultilingualContent() );

		$this->assertSame(
			[ 'en' => 'English description' ],
			$data['zobject_descriptions'],
			'Only the English description is present'
		);
	}

	public function testGetDataLabelsAllContainsEveryLanguageRegardlessOfAllowlist() {
		$this->seedMultilingualDependencies();
		$builder = new ZObjectSearchIndexFieldsBuilder( [ 'en', 'es' ], ZLangRegistry::singleton() );
		$data = $builder->getData( $this->makeMultilingualContent() );

		// Every label, including off-allowlist French, feeds the catch-all recall field
		$this->assertContains( 'English label', $data['zobject_labels_all'] );
		$this->assertContains( 'Spanish label', $data['zobject_labels_all'] );
		$this->assertContains( 'French label', $data['zobject_labels_all'] );
		// Every alias, including off-allowlist French, feeds the catch-all recall field
		$this->assertContains( 'English alias one', $data['zobject_labels_all'] );
		$this->assertContains( 'English alias two', $data['zobject_labels_all'] );
		$this->assertContains( 'French alias', $data['zobject_labels_all'] );
	}

	public function testGetDataTypeIsInnerType() {
		$this->seedMultilingualDependencies();
		$builder = new ZObjectSearchIndexFieldsBuilder( [ 'en', 'es' ], ZLangRegistry::singleton() );
		$data = $builder->getData( $this->makeMultilingualContent() );

		$this->assertSame( 'Z6', $data['zobject_type'] );
	}

	public function testGetDataOmitsFunctionSignatureFieldsForNonFunctions() {
		$this->seedMultilingualDependencies();
		$builder = new ZObjectSearchIndexFieldsBuilder( [ 'en', 'es' ], ZLangRegistry::singleton() );
		$data = $builder->getData( $this->makeMultilingualContent() );

		$this->assertArrayNotHasKey( 'function_input_types', $data );
		$this->assertArrayNotHasKey( 'function_output_type', $data );
	}

	public function testGetDataSkipsUnknownLanguageFromPerLanguageFieldsButKeepsItInCatchAll() {
		// Register both languages so the fixture parses, but hand the builder a registry that
		// fails to resolve Z1004, exercising the getData() try/catch skip path.
		$this->registerLangs( [ 'en', 'fr' ] );
		$this->insertZids( [ 'Z2', 'Z6', 'Z9', 'Z11', 'Z12', 'Z32' ] );

		$content = new ZObjectContent(
			'{'
			. '"Z1K1": "Z2",'
			. '"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
			. '"Z2K2": "the underlying string value",'
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11",'
			. '  { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "English label" },'
			. '  { "Z1K1": "Z11", "Z11K1": "Z1004", "Z11K2": "Unresolvable-language label" }'
			. '] },'
			. '"Z2K4": { "Z1K1": "Z32", "Z32K1": [ "Z31" ] },'
			. '"Z2K5": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] }'
			. '}'
		);

		$builder = new ZObjectSearchIndexFieldsBuilder( [ 'en' ], $this->makeLangRegistryFailingFor( 'Z1004' ) );
		$data = $builder->getData( $content );

		// The unresolvable language is dropped from the per-language field ...
		$this->assertSame( [ 'en' => 'English label' ], $data['zobject_labels'] );
		// ... but its string was appended to the catch-all before the (failing) resolution.
		$this->assertContains( 'Unresolvable-language label', $data['zobject_labels_all'] );
	}

	public function testGetDataReturnsEmptyForInvalidContent() {
		$content = new ZObjectContent( '{ "Z1K1": "Z2" }' );
		$this->assertFalse( $content->isValid(), 'Fixture is deliberately not a valid ZObject' );

		$builder = new ZObjectSearchIndexFieldsBuilder( [ 'en' ], ZLangRegistry::singleton() );

		$this->assertSame( [], $builder->getData( $content ) );
	}

	/**
	 * Build a ZLangRegistry that resolves Z1002 to 'en' but throws (as the real registry does for
	 * an unknown ZID) for the given language ZID.
	 *
	 * @param string $failingZid
	 * @return ZLangRegistry
	 */
	private function makeLangRegistryFailingFor( string $failingZid ): ZLangRegistry {
		$error = $this->createMock( ZError::class );
		$error->method( 'getMessage' )->willReturn( '' );

		$registry = $this->createMock( ZLangRegistry::class );
		$registry->method( 'getLanguageCodeFromZid' )
			->willReturnCallback( static function ( $zid ) use ( $failingZid, $error ) {
				if ( $zid === $failingZid ) {
					throw new ZErrorException( $error );
				}
				if ( $zid === 'Z1002' ) {
					return 'en';
				}
				throw new ZErrorException( $error );
			} );
		return $registry;
	}

	public function testGetDataBuildsFunctionSignatureFields() {
		$this->registerLangs( [ 'en' ] );
		$this->insertZids( [
			'Z2', 'Z6', 'Z8', 'Z9', 'Z7', 'Z11', 'Z12', 'Z14', 'Z17', 'Z20', 'Z31', 'Z32', 'Z40', 'Z881'
		] );

		// A function with two input arguments — a simple reference (Z6) and a compound
		// function-call type Z881(Z6) (typed list of strings) — and a simple return type Z40.
		$content = new ZObjectContent(
			'{'
			. '"Z1K1": "Z2",'
			. '"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
			. '"Z2K2": {'
			. '  "Z1K1": "Z8",'
			. '  "Z8K1": [ "Z17",'
			. '    { "Z1K1": "Z17", "Z17K1": "Z6", "Z17K2": "Z0K1",'
			. '      "Z17K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } },'
			. '    { "Z1K1": "Z17", "Z17K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z6" }, "Z17K2": "Z0K2",'
			. '      "Z17K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }'
			. '  ],'
			. '  "Z8K2": "Z40",'
			. '  "Z8K3": [ "Z20" ],'
			. '  "Z8K4": [ "Z14" ],'
			. '  "Z8K5": "Z0"'
			. '},'
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11",'
			. '  { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "My function" }'
			. '] },'
			. '"Z2K4": { "Z1K1": "Z32", "Z32K1": [ "Z31" ] },'
			. '"Z2K5": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] }'
			. '}'
		);
		$this->assertTrue( $content->isValid(), 'The function fixture is a valid ZObject' );

		$builder = new ZObjectSearchIndexFieldsBuilder( [ 'en' ], ZLangRegistry::singleton() );
		$data = $builder->getData( $content );

		$this->assertSame( 'Z8', $data['zobject_type'] );

		// Both the head token and the fingerprint of each input type, de-duplicated
		$this->assertContains( 'Z6', $data['function_input_types'] );
		$this->assertContains( 'Z881', $data['function_input_types'] );
		$this->assertContains( 'Z881(Z6)', $data['function_input_types'] );
		$this->assertSame(
			array_values( array_unique( $data['function_input_types'] ) ),
			$data['function_input_types'],
			'Input types are de-duplicated and re-indexed'
		);

		// A simple reference output type has head == fingerprint, so it dedupes to one entry
		$this->assertSame( [ 'Z40' ], $data['function_output_type'] );
	}

	public function testGetFieldsReturnsStructuredCirrusFields() {
		$this->skipIfNoCirrusSearch();

		// CirrusSearch is loaded here but is not the default active engine; force it so the field
		// factory and getMapping() run against a real CirrusSearch engine.
		$this->overrideConfigValue( MainConfigNames::SearchType, 'CirrusSearch' );
		$engine = $this->getServiceContainer()->getSearchEngineFactory()->create();
		if ( !( $engine instanceof \CirrusSearch\CirrusSearch ) ) {
			$this->markTestSkipped( 'The active search engine is not CirrusSearch' );
		}

		$builder = new ZObjectSearchIndexFieldsBuilder( [ 'en', 'es' ], ZLangRegistry::singleton() );
		$fields = $builder->getFields( $engine );

		$this->assertSame(
			[
				'zobject_type',
				'zobject_labels_all',
				'zobject_labels',
				'zobject_aliases',
				'zobject_descriptions',
				'function_input_types',
				'function_output_type',
			],
			array_keys( $fields ),
			'getFields returns exactly the seven expected index fields'
		);

		$this->assertInstanceOf( ZObjectMultilingualIndexField::class, $fields['zobject_labels'] );
		$this->assertInstanceOf( ZObjectMultilingualIndexField::class, $fields['zobject_aliases'] );
		$this->assertInstanceOf( ZObjectMultilingualIndexField::class, $fields['zobject_descriptions'] );

		$mapping = $fields['zobject_labels']->getMapping( $engine );
		$this->assertSame( 'object', $mapping['type'] );
		$this->assertSame(
			[ 'en', 'es' ],
			array_keys( $mapping['properties'] ),
			'The multilingual field exposes exactly the allowlisted language codes'
		);
		$this->assertArrayHasKey( 'plain', $mapping['properties']['en']['fields'] );

		$this->assertSame(
			'text_search',
			$mapping['properties']['en']['search_analyzer'],
			'Each index-time analyser has its paired search-time analyser'
		);
		$this->assertSame(
			'plain_search',
			$mapping['properties']['en']['fields']['plain']['search_analyzer'],
			'The plain sub-field has its paired search-time analyser'
		);

		$this->assertSame(
			[ CirrusIndexField::NOOP_HINT => 'equals' ],
			$fields['zobject_labels']->getEngineHints( $engine )
		);
	}
}
