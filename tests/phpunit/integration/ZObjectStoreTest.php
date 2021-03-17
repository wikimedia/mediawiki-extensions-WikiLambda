<?php

/**
 * WikiLambda unit test suite for the ZObjectStore file
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObjectContent;
use MediaWiki\MediaWikiServices;
use Status;
use Title;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjectStore
 */
class ZObjectStoreTest extends \MediaWikiIntegrationTestCase {

	/**
	 * @covers ::__construct
	 * @covers ::getNextAvailableZid
	 */
	public function testGetNextAvailableZid_first() {
		$store = WikiLambdaServices::getZObjectStore();
		$zid = $store->getNextAvailableZid();
		$this->assertEquals( 'Z10000', $zid );
	}

	// FIXME: create another testGetNextAvailableZid when there are other Z10000n objects in the database

	/**
	 * @covers ::createZObject
	 * @covers ::fetchZObjectByTitle
	 */
	public function testFetchZObjectByTitle_valid() {
		$store = WikiLambdaServices::getZObjectStore();
		$zid = $store->getNextAvailableZid();
		$sysopUser = $this->getTestSysop()->getUser();

		$input = '{ "Z1K1": "Z2", "Z2K1": "Z100001", "Z2K2": "hello", "Z2K3": {"Z1K1": "Z12", "Z12K1": [] } }';
		$status = $store->createZObject( $input, 'Create summary', $sysopUser );

		$title = Title::newFromText( $zid, NS_ZOBJECT );
		$zobject = $store->fetchZObjectByTitle( $title );
		$this->assertTrue( $zobject instanceof ZObjectContent );
		// TODO: when we change ZObjectContent to keep information of the ZPersistentObject,
		// we shall assert that the $zid is equal to $zobject->getId() this way:
		// $this->assertEquals( $zobject->getId(), $zid );
	}

	/**
	 * @covers ::fetchZObjectByTitle
	 */
	public function testFetchZObjectByTitle_invalid() {
		$store = WikiLambdaServices::getZObjectStore();
		$zid = 'Z0999';
		$title = Title::newFromText( $zid, NS_ZOBJECT );
		$zobject = $store->fetchZObjectByTitle( $title );

		$this->assertFalse( $zobject instanceof ZObjectContent );
		$this->assertFalse( $zobject );
	}

	/**
	 * @dataProvider provideCreateZObject
	 * @covers ::createZObject
	 */
	public function testCreateZObject( $input, $expected ) {
		$store = WikiLambdaServices::getZObjectStore();
		$sysopUser = $this->getTestSysop()->getUser();
		$status = $store->createZObject( $input, 'Create summary', $sysopUser );
		$this->assertTrue( $status instanceof Status );
		$this->assertEquals( $status->isOK(), $expected );
	}

	public function provideCreateZObject() {
		return [
			'incorrect JSON' => [ '{ "Z1K1"; Z2 ]', false ],
			'incorrect ZObject' => [ '{ "Z1K1": "Z2" }', false ],
			'correct ZObject' => [
				'{ "Z1K1": "Z2", "Z2K1": "Z100001", "Z2K2": "hello", "Z2K3": {"Z1K1": "Z12", "Z12K1": [] } }',
				true
			],
		];
	}

	/**
	 * @covers ::insertZObjectLabels
	 */
	public function testInsertZObjectLabels() {
		$store = WikiLambdaServices::getZObjectStore();
		$labels = [
			'en' => 'label',
			'es' => 'etiqueta',
			'fr' => 'marque'
		];

		$response = $store->insertZObjectLabels( 'Z222', 'Z4', $labels );
		$this->assertTrue( $response );

		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancer()->getConnectionRef( DB_MASTER );
		$res = $dbr->select(
			/* FROM */ 'wikilambda_zobject_labels',
			/* SELECT */ [ 'wlzl_language', 'wlzl_label' ],
			/* WHERE */ [
				'wlzl_zobject_zid' => 'Z222',
				'wlzl_type' => 'Z4'
			]
		);
		$this->assertEquals( $res->numRows(), 3 );

		$conflicts = $store->findZObjectLabelConflicts( 'Z333', 'Z4', $labels );
		$this->assertEquals( count( $conflicts ), 3 );
	}

	/**
	 * @covers ::insertZObjectLabels
	 * @covers ::findZObjectLabelConflicts
	 */
	public function testFindZObjectLabelConflicts() {
		$store = WikiLambdaServices::getZObjectStore();
		$labels = [
			'en' => 'label',
			'es' => 'etiqueta',
			'fr' => 'marque'
		];

		$response = $store->insertZObjectLabels( 'Z222', 'Z4', $labels );
		$this->assertTrue( $response );

		$conflicts = $store->findZObjectLabelConflicts( 'Z333', 'Z4', $labels );
		$this->assertEquals( count( $conflicts ), 3 );
	}

	/**
	 * @covers ::insertZObjectLabelConflicts
	 */
	public function testInsertZObjectLabelConflicts() {
		$store = WikiLambdaServices::getZObjectStore();
		$conflicts = [
			'en' => 'Z222',
			'es' => 'Z222',
			'fr' => 'Z222'
		];

		$response = $store->insertZObjectLabelConflicts( 'Z333', $conflicts );
		$this->assertTrue( $response );

		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancer()->getConnectionRef( DB_MASTER );
		$res = $dbr->select(
			/* FROM */ 'wikilambda_zobject_label_conflicts',
			/* SELECT */ [ 'wlzlc_language' ],
			/* WHERE */ [
				'wlzlc_existing_zid' => 'Z222',
				'wlzlc_conflicting_zid' => 'Z333',
			]
		);
		$this->assertEquals( $res->numRows(), 3 );
	}

	/**
	 * @covers ::insertZObjectLabels
	 * @covers ::deleteZObjectLabelsByZid
	 */
	public function testDeleteZObjectLabelsByZid() {
		$store = WikiLambdaServices::getZObjectStore();
		$labels = [
			'en' => 'label',
			'es' => 'etiqueta',
			'fr' => 'marque'
		];

		$response = $store->insertZObjectLabels( 'Z222', 'Z4', $labels );
		$this->assertTrue( $response );

		$store->deleteZObjectLabelsByZid( 'Z222' );

		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancer()->getConnectionRef( DB_MASTER );
		$res = $dbr->select(
			/* FROM */ 'wikilambda_zobject_labels',
			/* SELECT */ [ 'wlzl_language', 'wlzl_label' ],
			/* WHERE */ [
				'wlzl_zobject_zid' => 'Z222',
				'wlzl_type' => 'Z4'
			]
		);
		$this->assertEquals( $res->numRows(), 0 );
	}

	/**
	 * @covers ::insertZObjectLabelConflicts
	 * @covers ::deleteZObjectLabelConflictsByZid
	 */
	public function testDeleteZObjectLabelConflictsByZid() {
		$store = WikiLambdaServices::getZObjectStore();

		$store->insertZObjectLabelConflicts( 'Z222', [ 'en' => 'Z333' ] );
		$store->insertZObjectLabelConflicts( 'Z333', [ 'es' => 'Z444' ] );

		$store->deleteZObjectLabelConflictsByZid( 'Z333' );

		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancer()->getConnectionRef( DB_MASTER );
		$res = $dbr->select(
			/* FROM */ 'wikilambda_zobject_label_conflicts',
			/* SELECT */ [ 'wlzlc_language' ],
			/* WHERE */ $dbr->makeList(
				[
					'wlzlc_existing_zid' => 'Z333',
					'wlzlc_conflicting_zid' => 'Z333',
				],
				$dbr::LIST_OR
			)
		);
		$this->assertEquals( $res->numRows(), 0 );
	}

}
