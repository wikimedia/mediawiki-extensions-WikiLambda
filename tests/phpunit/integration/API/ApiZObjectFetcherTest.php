<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Api;

use ApiTestCase;
use DeferredUpdates;
use MediaWiki\MediaWikiServices;
use Title;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\API\ApiZObjectFetcher
 * @group Database
 * @group API
 * @group WikiLambda
 * @group medium
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
	 */
	public function testFailsWithoutTitle() {
		$unnamable = 'nope; can\'t name it';
		$this->assertFalse(
			Title::newFromText( $unnamable, NS_MAIN )->exists(),
			'no title should exist for the string "' . $unnamable . '"' );

		$this->setExpectedApiException( [ 'apierror-wikilambda_fetch-missingzid', $unnamable ] );

		$this->doApiRequest( [
			'action' => 'wikilambda_fetch',
			'zids' => $unnamable,
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
}
