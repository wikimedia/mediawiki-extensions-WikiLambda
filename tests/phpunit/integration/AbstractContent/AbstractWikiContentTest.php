<?php

/**
 * WikiLambda integration test suite for the Abstract Wiki Content class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use InvalidArgumentException;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent
 * @group Database
 */
class AbstractWikiContentTest extends WikiLambdaIntegrationTestCase {

	private const TEST_ABSTRACT_NS = 2300;

	public function testCreateInvalidString() {
		$this->expectException( InvalidArgumentException::class );
		$testObject = new AbstractWikiContent( true );
	}

	public function testCreateInvalidJson() {
		$this->expectException( InvalidArgumentException::class );
		$testObject = new AbstractWikiContent( "{'invalid': JSON]" );
	}

	public function testCreate() {
		$validJson = '{"qid": "Q42"}';

		$testObject = new AbstractWikiContent( $validJson );

		$this->assertSame( $validJson, $testObject->getText() );
		$this->assertEquals( json_decode( $validJson ), $testObject->getObject() );
	}

	public function testMakeEmptyContent() {
		$emptyContent = AbstractWikiContent::makeEmptyContent();
		$emptyObject = $emptyContent->getObject();

		$this->assertSame( 'Q0', $emptyObject->qid );
		$this->assertTrue( property_exists(
			$emptyObject->sections,
			AbstractWikiContent::ABSTRACTCONTENT_SECTION_LEDE
		) );

		$ledeSection = $emptyObject->sections->{ AbstractWikiContent::ABSTRACTCONTENT_SECTION_LEDE };

		$this->assertSame( 0, $ledeSection->index );
		$this->assertCount( 1, $ledeSection->fragments );
	}

	public function testEmptyContentIsValid() {
		$emptyObject = AbstractWikiContent::makeEmptyContent();

		$this->assertTrue( $emptyObject->isValid() );
	}

	public function testAbstractContentIsValidForTitle() {
		$titleQ29 = Title::newFromText( 'Q29', self::TEST_ABSTRACT_NS );

		$abstractContentQ42 = new AbstractWikiContent(
			'{ "qid": "Q42", "sections": { "Q8776414": { "index": 0, "fragments": [ "Z89" ] } } }',
		);

		$this->assertTrue( $abstractContentQ42->isValid() );
		$this->assertFalse( $abstractContentQ42->isValidForTitle( $titleQ29 ) );
	}

	/**
	 * @dataProvider provideAbstractContentIsValid
	 */
	public function testAbstractContentIsValid( $jsonContent, $expectedValid, $expectedErrorMessage = null ) {
		$testObject = new AbstractWikiContent( $jsonContent );

		$this->assertSame( $expectedValid, $testObject->isValid() );

		// Assert error message
		if ( !$expectedValid ) {
			$this->assertFalse( $testObject->getStatus()->isOK() );
			$this->assertTrue( $testObject->getStatus()->hasMessage( $expectedErrorMessage ) );
		}
	}

	public static function provideAbstractContentIsValid() {
		yield 'abstract content has no qid' => [
			'{ "tis": "bad content" }',
			false,
			'wikilambda-abstract-error-bad-qid'
		];

		yield 'qid is not a string' => [
			'{ "qid": { "something": "else" } }',
			false,
			'wikilambda-abstract-error-bad-qid'
		];

		yield 'qid is not a valid qid' => [
			'{ "qid": "Douglas Adams" }',
			false,
			'wikilambda-abstract-error-bad-qid'
		];

		yield 'content object has no sections' => [
			'{ "qid": "Q42" }',
			false,
			'wikilambda-abstract-error-missing-sections'
		];

		yield 'sections is empty' => [
			'{ "qid": "Q42", "sections": {} }',
			false,
			'wikilambda-abstract-error-missing-lede-section'
		];

		yield 'sections has no lede' => [
			'{ "qid": "Q42", "sections": { "Q1111": { "index": 0, "fragments": [ "Z89" ] } } }',
			false,
			'wikilambda-abstract-error-missing-lede-section'
		];

		yield 'sections has non-qid keys' => [
			'{ "qid": "Q42", "sections": {'
				. ' "Q8776414": { "index": 0, "fragments": [ "Z89" ] },'
				. ' "somekey": { "index": 1, "fragments": [ "Z89" ] } } }',
			false,
			'wikilambda-abstract-error-bad-section-qid'
		];

		yield 'section has no index' => [
			'{ "qid": "Q42", "sections": { "Q8776414": { "fragments": [ "Z89" ] } } }',
			false,
			'wikilambda-abstract-error-bad-section-index'
		];

		yield 'section index not well-formed' => [
			'{ "qid": "Q42", "sections": { "Q8776414": { "index": "one", "fragments": [ "Z89" ] } } }',
			false,
			'wikilambda-abstract-error-bad-section-index'
		];

		yield 'section content is not well-formed' => [
			'{ "qid": "Q42", "sections": { "Q8776414": "bad section" } }',
			false,
			'wikilambda-abstract-error-bad-section-content'
		];

		yield 'section has no fragments' => [
			'{ "qid": "Q42", "sections": { "Q8776414": { "index": 0 } } }',
			false,
			'wikilambda-abstract-error-missing-section-fragments'
		];

		yield 'fragments is not a list' => [
			'{ "qid": "Q42", "sections": { "Q8776414": { "index": 0, "fragments": {} } } }',
			false,
			'wikilambda-abstract-error-missing-section-fragments'
		];

		yield 'fragments is not a benjamin array' => [
			'{ "qid": "Q42", "sections": { "Q8776414": { "index": 0, "fragments": [] } } }',
			false,
			'wikilambda-abstract-error-bad-fragments-type'
		];

		yield 'fragments is not a list of the correct type' => [
			'{ "qid": "Q42", "sections": { "Q8776414": { "index": 0, "fragments": [ "Z6" ] } } }',
			false,
			'wikilambda-abstract-error-bad-fragments-type'
		];

		yield 'object has valid lede section' => [
			'{ "qid": "Q42", "sections": { "Q8776414": { "index": 0, "fragments": [ "Z89" ] } } }',
			true
		];

		yield 'object has valid lede and other valid sections' => [
			'{ "qid": "Q42", "sections": {'
				. ' "Q8776414": { "index": 0, "fragments": [ "Z89" ] },'
				. ' "Q1111111": { "index": 1, "fragments": [ "Z89" ] } } }',
			true
		];
	}
}
