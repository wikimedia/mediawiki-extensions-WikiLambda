<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Api;

use ApiTestCase;
use DeferredUpdates;
use MediaWiki\MediaWikiServices;
use MediaWiki\Title\Title;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\API\ApiZObjectFetcher
 * @group Database
 * @group API
 */
class ApiZObjectFetcherTest extends ApiTestCase {

	protected function setUp(): void {
		parent::setUp();

		$this->tablesUsed[] = 'wikilambda_zobject_labels';
		$this->tablesUsed[] = 'wikilambda_zobject_label_conflicts';
		$this->tablesUsed[] = 'wikilambda_zobject_function_join';
		$this->tablesUsed[] = 'page';
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiZObjectFetcher::execute
	 * @covers \MediaWiki\Extension\WikiLambda\API\WikiLambdaApiBase::dieWithZError
	 */
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
			'language' => 'en',
		] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiZObjectFetcher::execute
	 */
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
			'language' => 'en',
		] );
	}

	/**
	 * @coversNothing (only core param validation)
	 */
	public function testFailsWithEmptyZid() {
		$this->setExpectedApiException( [ 'apierror-missingparam', 'zids' ] );
		$this->doApiRequest( [
			'action' => 'wikilambda_fetch',
			'zids' => '|',
			'language' => 'en',
		] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiZObjectFetcher::execute
	 */
	public function testSucceedsWithValidZids() {
		// Insert necessary ZIDs
		$dataPath = dirname( __DIR__, 4 ) . '/function-schemata/data/definitions/';

		$z1_object = file_get_contents( $dataPath . 'Z1.json' );
		$this->editPage( 'Z1', $z1_object, 'Test creation', NS_MAIN );
		$this->titlesTouched[] = 'Z1';

		$z3_object = file_get_contents( $dataPath . 'Z3.json' );
		$this->editPage( 'Z3', $z3_object, 'Test creation', NS_MAIN );
		$this->titlesTouched[] = 'Z3';

		DeferredUpdates::doUpdates();
		MediaWikiServices::getInstance()->getDBLoadBalancerFactory()->waitForReplication();
		$result = $this->doApiRequest( [
			'action' => 'wikilambda_fetch',
			'zids' => 'z1|z3',
			'language' => 'en',
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

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiZObjectFetcher::execute
	 */
	public function testSucceedsWithZidAndRevision() {
		// Insert necessary ZIDs
		$dataPath = dirname( __DIR__, 4 ) . '/function-schemata/data/definitions/';

		$z1_object = file_get_contents( $dataPath . 'Z1.json' );
		$this->editPage( 'Z1', $z1_object, 'Test creation', NS_MAIN );
		$this->titlesTouched[] = 'Z1';

		DeferredUpdates::doUpdates();
		MediaWikiServices::getInstance()->getDBLoadBalancerFactory()->waitForReplication();

		$z1Title = Title::newFromText( 'Z1' );
		$z1TitleRev = $z1Title->getLatestRevID();

		$result = $this->doApiRequest( [
			'action' => 'wikilambda_fetch',
			'zids' => 'z1',
			'revisions' => $z1TitleRev,
			'language' => 'en',
		] );

		$this->assertEquals(
			json_encode( json_decode( $z1_object ) ),
			json_encode( json_decode( $result[0]["z1"]["wikilambda_fetch"] ) )
		);
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiZObjectFetcher::execute
	 */
	public function testSilentlyEmptyWithMismatchedRevision() {
		// Insert necessary ZIDs
		$dataPath = dirname( __DIR__, 4 ) . '/function-schemata/data/definitions/';

		$z1_object = file_get_contents( $dataPath . 'Z1.json' );
		$this->editPage( 'Z1', $z1_object, 'Test creation', NS_MAIN );
		$this->titlesTouched[] = 'Z1';

		DeferredUpdates::doUpdates();
		MediaWikiServices::getInstance()->getDBLoadBalancerFactory()->waitForReplication();

		$result = $this->doApiRequest( [
			'action' => 'wikilambda_fetch',
			'zids' => 'Z1',
			'revisions' => '-1',
			'language' => 'en',
		] );

		$this->assertNull( $result[0]["Z1"]["wikilambda_fetch"] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiZObjectFetcher::execute
	 */
	public function testFailsWithTwoZidsButOneRevision() {
		// Insert necessary ZIDs
		$dataPath = dirname( __DIR__, 4 ) . '/function-schemata/data/definitions/';

		$z1_object = file_get_contents( $dataPath . 'Z1.json' );
		$this->editPage( 'Z1', $z1_object, 'Test creation', NS_MAIN );
		$this->titlesTouched[] = 'Z1';

		$z3_object = file_get_contents( $dataPath . 'Z3.json' );
		$this->editPage( 'Z3', $z3_object, 'Test creation', NS_MAIN );
		$this->titlesTouched[] = 'Z3';

		DeferredUpdates::doUpdates();
		MediaWikiServices::getInstance()->getDBLoadBalancerFactory()->waitForReplication();

		$z1Title = Title::newFromText( 'Z1' );
		$z1TitleRev = $z1Title->getLatestRevID();

		$this->setExpectedApiException( [ 'wikilambda-zerror', '' ], 'Z549', [] );

		$result = $this->doApiRequest( [
			'action' => 'wikilambda_fetch',
			'zids' => 'Z1|Z3',
			'revisions' => $z1TitleRev,
			'language' => 'en',
		] );
	}
}
