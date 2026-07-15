<?php

/**
 * WikiLambda unit test suite for the DiffKeyLabeller
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests;

use MediaWiki\Extension\WikiLambda\Diff\DiffKeyLabeller;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Language\Language;
use MediaWikiUnitTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Diff\DiffKeyLabeller
 */
class DiffKeyLabellerTest extends MediaWikiUnitTestCase {

	private function newLabeller( ZObjectStore $store ): DiffKeyLabeller {
		return new DiffKeyLabeller( $store, $this->createMock( Language::class ) );
	}

	/**
	 * @dataProvider provideNonGlobalKeys
	 */
	public function testNonGlobalKeyIsReturnedUnchangedWithoutFetching( string $segment ) {
		$store = $this->createMock( ZObjectStore::class );
		$store->expects( $this->never() )->method( 'fetchZObject' );

		$this->assertSame( $segment, $this->newLabeller( $store )->getKeyLabel( $segment ) );
	}

	public static function provideNonGlobalKeys() {
		return [
			'list index' => [ '1' ],
			'bare local key' => [ 'K1' ],
			'plain reference' => [ 'Z6' ],
			'empty' => [ '' ],
		];
	}

	public function testUnresolvableDefinitionFallsBackToKey() {
		$store = $this->createMock( ZObjectStore::class );
		$store->method( 'fetchZObject' )->willReturn( false );

		$this->assertSame( 'Z8K1', $this->newLabeller( $store )->getKeyLabel( 'Z8K1' ) );
	}

	public function testDefinitionIsFetchedOncePerZid() {
		$store = $this->createMock( ZObjectStore::class );
		$store->expects( $this->once() )
			->method( 'fetchZObject' )
			->with( 'Z8' )
			->willReturn( false );

		$labeller = $this->newLabeller( $store );
		// Two keys owned by the same ZID must share a single fetch.
		$labeller->getKeyLabel( 'Z8K1' );
		$labeller->getKeyLabel( 'Z8K2' );
	}
}
