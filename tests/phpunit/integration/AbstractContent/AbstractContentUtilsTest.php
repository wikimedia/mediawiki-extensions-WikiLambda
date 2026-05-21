<?php

/**
 * WikiLambda unit test suite for the ZObjectUtils file
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentUtils;
use MediaWiki\Registration\ExtensionRegistry;
use Wikibase\DataModel\Entity\EntityIdParser;
use Wikibase\DataModel\Entity\EntityIdParsingException;
use Wikibase\DataModel\Entity\Item;
use Wikibase\DataModel\Entity\ItemId;
use Wikibase\DataModel\Services\Lookup\EntityLookup;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentUtils
 * @group Database
 */
class AbstractContentUtilsTest extends WikiLambdaIntegrationTestCase {
	/**
	 * @dataProvider provideIsValidWikidataItemReference
	 */
	public function testIsValidWikidataItemReference( $input, $expected ) {
		$this->assertSame( $expected, AbstractContentUtils::isValidWikidataItemReference( $input ) );
	}

	public static function provideIsValidWikidataItemReference() {
		return [
			'empty string' => [ '', false ],
			'ZID' => [ 'Z12345', false ],
			'Lexeme Id' => [ 'L12345', false ],
			'Not wellformed QID' => [ 'Q123-foo', false ],
			'QID with whitespaces' => [ ' Q12345 ', false ],
			'Simple Qid' => [ 'Q12345', true ],
			'Big QID' => [ 'Q1234567890', true ],
			'Null QID' => [ 'Q0', false ],
		];
	}

	public function testIsNullWikidataItemReference() {
		$this->assertFalse( AbstractContentUtils::isNullWikidataItemReference( 'foo' ) );
		$this->assertFalse( AbstractContentUtils::isNullWikidataItemReference( 'Q12345' ) );
		$this->assertTrue( AbstractContentUtils::isNullWikidataItemReference( 'Q0' ) );
	}

	/**
	 * @dataProvider provideIsValidAbstractWikiTitle
	 */
	public function testIsValidAbstractWikiTitle( $input, $expected ) {
		$this->assertSame( $expected, AbstractContentUtils::isValidAbstractWikiTitle( $input ) );
	}

	public static function provideIsValidAbstractWikiTitle() {
		return [
			'empty string' => [ '', false ],
			'ZID' => [ 'Z12345', false ],
			'Lexeme Id' => [ 'L12345', false ],
			'Null QID' => [ 'Q0', false ],
			'namespace:title' => [ 'foo:bar', false ],
			'Vimple QID' => [ 'Q12345', true ],
			'Valid Namespace:QID' => [ 'Abstract Wikipedia:Q12345', true ]
		];
	}

	private function setUpWikibaseClientMocks( string $qid, bool $itemExists ): void {
		$itemId = new ItemId( $qid );

		$mockEntityIdParser = $this->createMock( EntityIdParser::class );
		$mockEntityIdParser->method( 'parse' )->with( $qid )->willReturn( $itemId );

		$mockEntityLookup = $this->createMock( EntityLookup::class );
		$mockEntityLookup->method( 'getEntity' )->with( $itemId )
			->willReturn( $itemExists ? $this->createMock( Item::class ) : null );

		$this->setService( 'WikibaseClient.EntityIdParser', $mockEntityIdParser );
		$this->setService( 'WikibaseClient.EntityLookup', $mockEntityLookup );
	}

	public function testWikidataItemExists_returnsTrueForExistingItem(): void {
		if ( !ExtensionRegistry::getInstance()->isLoaded( 'WikibaseClient' ) ) {
			$this->markTestSkipped( 'WikibaseClient extension is not loaded' );
		}
		$this->setUpWikibaseClientMocks( 'Q42', true );
		$this->assertTrue( AbstractContentUtils::wikidataItemExists( 'Q42' ) );
	}

	public function testWikidataItemExists_returnsFalseForMissingItem(): void {
		if ( !ExtensionRegistry::getInstance()->isLoaded( 'WikibaseClient' ) ) {
			$this->markTestSkipped( 'WikibaseClient extension is not loaded' );
		}
		$this->setUpWikibaseClientMocks( 'Q6', false );
		$this->assertFalse( AbstractContentUtils::wikidataItemExists( 'Q6' ) );
	}

	public function testWikidataItemExists_returnsFalseForInvalidQid(): void {
		if ( !ExtensionRegistry::getInstance()->isLoaded( 'WikibaseClient' ) ) {
			$this->markTestSkipped( 'WikibaseClient extension is not loaded' );
		}
		$mockEntityIdParser = $this->createMock( EntityIdParser::class );
		$mockEntityIdParser->method( 'parse' )
			->willThrowException( new EntityIdParsingException() );
		$this->setService( 'WikibaseClient.EntityIdParser', $mockEntityIdParser );

		$this->assertFalse( AbstractContentUtils::wikidataItemExists( 'not-a-qid' ) );
	}

	/**
	 * @dataProvider provideMakeCacheForAbstractFragment
	 */
	public function testMakeCacheForAbstractFragment( $input, $expected ) {
		// test as stdClass
		$this->assertEquals( $expected, AbstractContentUtils::makeCacheKeyForAbstractFragment(
			json_decode( $input )
		) );
		// test as associative array
		$this->assertEquals( $expected, AbstractContentUtils::makeCacheKeyForAbstractFragment(
			json_decode( $input, true )
		) );
	}

	public static function provideMakeCacheForAbstractFragment() {
		yield 'Literal html' => [
			'{ "Z1K1": "Z89", "Z89K1": "<b>Testing</b>" }',
			'Z1K1|Z89,Z89K1|<b>Testing</b>,'
		];

		yield 'Simple fragment' => [
			'{ "Z1K1": "Z7", "Z7K1": "Z801", "Z801K1": "<b>Testing</b>" }',
			'Z1K1|Z7,Z7K1|Z801,Z801K1|<b>Testing</b>,'
		];

		yield 'More complex fragment' => [
			'{ "Z1K1": "Z7", "Z7K1": "Z27868",'
				. '"Z27868K1": { "Z1K1": "Z7", "Z7K1": "Z23753",'
				. ' "Z23753K1": { "Z1K1": "Z18", "Z18K1": "Z825K1" },'
				. ' "Z23753K2": { "Z1K1": "Z18", "Z18K1": "Z825K2" } } }',
			'Z1K1|Z7,Z7K1|Z27868,Z27868K1|Z1K1|Z7,Z7K1|Z23753,Z23753K1|Z1K1|Z18,'
				. 'Z18K1|Z825K1,,Z23753K2|Z1K1|Z18,Z18K1|Z825K2,,,'
		];
	}
}
