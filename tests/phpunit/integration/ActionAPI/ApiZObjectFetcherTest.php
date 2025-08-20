<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI;

use MediaWiki\Deferred\DeferredUpdates;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\ApiZObjectFetcher
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\WikiLambdaApiBase
 * @group Database
 * @group API
 */
class ApiZObjectFetcherTest extends WikiLambdaApiTestCase {

	public function testFailsWithMalformedTitle() {
		$unnamable = 'nope; can\'t name it';

		$expectedData = '{"message":"Unknown error Z549","zerror":{"Z1K1":"Z5","Z5K1":"Z549","Z5K2":' .
			'{"Z1K1":{"Z1K1":"Z7","Z7K1":"Z885","Z885K1":"Z549"},"K1":"' .
			$unnamable .
			'"}},"labelled":{"Z1K1":"Z5","Z5K1":"Z549","Z5K2":{"Z1K1":{"Z1K1":"Z7","Z7K1":"Z885",' .
			'"Z885K1":"Z549"},"K1":"' . $unnamable . '"}}}';

		$this->setExpectedApiException( [ 'wikilambda-zerror', '' ], 'Z549', [ json_decode( $expectedData ) ] );

		$this->doApiRequest( [
			'action' => 'wikilambda_fetch',
			'zids' => $unnamable,
		] );
	}

	public function testFailsWithUnknownReference() {
		$unknownZid = 'Z199999';
		$this->assertFalse(
			Title::newFromText( $unknownZid, NS_MAIN )->exists(),
			'no title should exist for the string "' . $unknownZid . '"' );

		$expectedData = '{"message":"Unknown error Z550","zerror":{"Z1K1":"Z5",' .
			'"Z5K1":"Z550","Z5K2":{"Z1K1":{"Z1K1":"Z7","Z7K1":"Z885","Z885K1":"Z550"},"K1":"' .
			$unknownZid .
			'"}},"labelled":{"Z1K1":"Z5","Z5K1":"Z550","Z5K2":{"Z1K1":{"Z1K1":"Z7","Z7K1":"Z885",' .
			'"Z885K1":"Z550"},"K1":"' .
			$unknownZid .
			'"}}}';

		$this->setExpectedApiException( [ 'wikilambda-zerror', '' ], 'Z550', [ json_decode( $expectedData ) ] );

		$this->doApiRequest( [
			'action' => 'wikilambda_fetch',
			'zids' => $unknownZid,
		] );
	}

	public function testFailsWithEmptyZid() {
		$this->setExpectedApiException( [ 'apierror-missingparam', 'zids' ] );
		$this->doApiRequest( [
			'action' => 'wikilambda_fetch',
			'zids' => '|',
		] );
	}

	public function testSucceedsWithValidZids() {
		// Insert necessary ZIDs
		$dataPath = dirname( __DIR__, 4 ) . '/function-schemata/data/definitions/';

		$z1_object = file_get_contents( $dataPath . 'Z1.json' );
		$this->editPage( 'Z1', $z1_object, 'Test creation', NS_MAIN );

		$z3_object = file_get_contents( $dataPath . 'Z3.json' );
		$this->editPage( 'Z3', $z3_object, 'Test creation', NS_MAIN );

		DeferredUpdates::doUpdates();
		$result = $this->doApiRequest( [
			'action' => 'wikilambda_fetch',
			'zids' => 'z1|z3',
		] );

		$this->assertEquals(
			json_encode( json_decode( $z1_object ) ),
			json_encode( json_decode( $result[0]["z1"]["wikilambda_fetch"] ) )
		);
		$this->assertEquals(
			json_encode( json_decode( $z3_object ) ),
			json_encode( json_decode( $result[0]["z3"]["wikilambda_fetch"] ) )
		);
	}

	public function testSucceedsWithZidAndRevision() {
		// Insert necessary ZIDs
		$dataPath = dirname( __DIR__, 4 ) . '/function-schemata/data/definitions/';

		$z1_object = file_get_contents( $dataPath . 'Z1.json' );
		$this->editPage( 'Z1', $z1_object, 'Test creation', NS_MAIN );

		DeferredUpdates::doUpdates();

		$z1Title = Title::newFromText( 'Z1' );
		$z1TitleRev = $z1Title->getLatestRevID();

		$result = $this->doApiRequest( [
			'action' => 'wikilambda_fetch',
			'zids' => 'z1',
			'revisions' => $z1TitleRev,
		] );

		$this->assertEquals(
			json_encode( json_decode( $z1_object ) ),
			json_encode( json_decode( $result[0]["z1"]["wikilambda_fetch"] ) )
		);
	}

	public function testSilentlyEmptyWithMismatchedRevision() {
		// Insert necessary ZIDs
		$dataPath = dirname( __DIR__, 4 ) . '/function-schemata/data/definitions/';

		$z1_object = file_get_contents( $dataPath . 'Z1.json' );
		$this->editPage( 'Z1', $z1_object, 'Test creation', NS_MAIN );

		DeferredUpdates::doUpdates();

		$result = $this->doApiRequest( [
			'action' => 'wikilambda_fetch',
			'zids' => 'Z1',
			'revisions' => '-1',
		] );

		$this->assertNull( $result[0]["Z1"]["wikilambda_fetch"] );
	}

	public function testFailsWithTwoZidsButOneRevision() {
		// Insert necessary ZIDs
		$dataPath = dirname( __DIR__, 4 ) . '/function-schemata/data/definitions/';

		$z1_object = file_get_contents( $dataPath . 'Z1.json' );
		$this->editPage( 'Z1', $z1_object, 'Test creation', NS_MAIN );

		$z3_object = file_get_contents( $dataPath . 'Z3.json' );
		$this->editPage( 'Z3', $z3_object, 'Test creation', NS_MAIN );

		DeferredUpdates::doUpdates();

		$z1Title = Title::newFromText( 'Z1' );
		$z1TitleRev = $z1Title->getLatestRevID();

		$this->setExpectedApiException( [ 'wikilambda-zerror', '' ], 'Z549', [] );

		$result = $this->doApiRequest( [
			'action' => 'wikilambda_fetch',
			'zids' => 'Z1|Z3',
			'revisions' => $z1TitleRev,
		] );
	}
}
