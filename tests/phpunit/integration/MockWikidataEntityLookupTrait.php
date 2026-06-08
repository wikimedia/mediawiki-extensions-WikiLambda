<?php

/**
 * WikiLambda test trait to mock the WikilambdaEntityLookup service
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\WikidataEntityLookup;

trait MockWikidataEntityLookupTrait {

	/**
	 * Mocks the available WikibaseClient services wrapper WikidataEntityLookup
	 * given an input array of available qids and their labels:
	 *
	 * $this->mockWikidataEntityLookup( [
	 * 		'Q42' => [ 'mul' => 'Douglas Adams' ],
	 * 	  'Q319' => [ 'en' => 'Jupiter' ],
	 * ] );
	 *
	 * If we only care about whether the entity exists, not about the labels,
	 * we can simply call the mock builder with:
	 *
	 * $this->mockWikidataEntityLookup( [	'Q42' => [] ] )
	 *
	 * @param array $qidLabels
	 */
	protected function mockWikidataEntityLookup( array $qidLabels = [] ): WikidataEntityLookup {
		$mockLookup = $this->createMock( WikidataEntityLookup::class );

		$mockLookup
			->method( 'wikidataItemExists' )
			->willReturnCallback( static function ( string $qid ) use ( $qidLabels ): bool {
				return isset( $qidLabels[ $qid ] );
			} );

		$mockLookup
			->method( 'resolveAbstractLabel' )
			->willReturnCallback( static function ( string $qid, string $lang ) use ( $qidLabels ): ?string {
				return $qidLabels[ $qid ][ $lang ] ?? null;
			} );

		$this->setService( 'WikiLambdaWikidataEntityLookup', $mockLookup );

		return $mockLookup;
	}
}
