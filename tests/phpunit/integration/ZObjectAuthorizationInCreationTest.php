<?php

/**
 * WikiLambda integration test suite for granular edit authorization mechanisms when creating
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Authorization\ZObjectAuthorization;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Authorization\ZObjectAuthorization
 * @covers \MediaWiki\Extension\WikiLambda\Authorization\AuthorizationStatus
 * @covers \MediaWiki\Extension\WikiLambda\Authorization\ZObjectFilterInRange
 * @covers \MediaWiki\Extension\WikiLambda\Authorization\ZObjectFilterIsRunnable
 * @covers \MediaWiki\Extension\WikiLambda\Authorization\ZObjectFilterTypeChanged
 * @covers \MediaWiki\Extension\WikiLambda\Authorization\ZObjectFilterIsAttached
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectStore
 * @group Database
 */
class ZObjectAuthorizationInCreationTest extends WikiLambdaIntegrationTestCase {

	/** @var ZObjectStore */
	protected $zobjectStore;

	/** @var ZObjectAuthorization */
	protected $zobjectAuthorization;

	protected function setUp(): void {
		parent::setUp();

		$this->zobjectStore = WikiLambdaServices::getZObjectStore();
		$this->zobjectAuthorization = WikiLambdaServices::getZObjectAuthorization();

		$this->insertZids( [ 'Z1', 'Z2', 'Z6', 'Z3', 'Z4' ] );
	}

	/**
	 * @dataProvider provideCreateNew
	 *
	 * @param string $userType One of 'basic', 'functioneer', 'maintainer', 'sysop'
	 * @param string $zid
	 * @param string $content
	 * @param array $expectedRights
	 * @param bool $expectedAllowed
	 */
	public function testCreateNew(
		string $userType, string $zid, string $content, array $expectedRights, bool $expectedAllowed
		) {
		switch ( $userType ) {
			case 'basic':
				$user = $this->getTestUser()->getUser();
				break;

			case 'functioneer':
				$user = $this->getTestUser( [ 'functioneer' ] )->getUser();
				break;

			case 'maintainer':
				$user = $this->getTestUser( [ 'functioneer', 'functionmaintainer' ] )->getUser();
				break;

			case 'sysop':
				$user = $this->getTestSysop()->getUser();
				break;

			default:
				$this->assertFalse(
					true,
					"userType must be one of 'basic', 'functioneer', 'maintainer', 'sysop', instead set to '$userType'."
				);
		}

		$title = Title::newFromText( $zid, NS_MAIN );

		$contentObject = new ZObjectContent( $content );

		// Assert that the correct rights are detected
		$actualRights = $this->zobjectAuthorization->getRequiredCreateRights( $contentObject, $title );

		$this->assertContains( 'edit', $actualRights );
		$this->assertContains( 'wikilambda-create', $actualRights );
		foreach ( $expectedRights as $key => $value ) {
			$this->assertContains( $value, $actualRights, "Attempted creation should require the '$value' right" );
		}

		// Attempt to make the creation
		$attemptedCreation = $this->zobjectStore->updateZObject(
			$zid,
			$content,
			'Insert new object',
			$user,
			EDIT_NEW
		);

		if ( $expectedAllowed ) {
			$this->assertTrue(
				$attemptedCreation->isOK(),
				"A $userType user should be allowed to create this ZObject as ZID $zid."
			);
		} else {
			$this->assertFalse(
				$attemptedCreation->isOK(),
				"A $userType user should not be allowed to create this ZObject as ZID $zid."
			);
		}
	}

	public function provideCreateNew() {
		$typesToTry = [
			'type (Z4 instance)' => [
				'content' =>
					'{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" }, "Z2K2": { '
						. '"Z1K1": "Z4", "Z4K1": "Z0", "Z4K2": [ "Z3", '
							. '{ "Z1K1": "Z3", "Z3K1": "Z6", "Z3K2": "Z0K1", "Z3K3": '
							. '{ "Z1K1": "Z12", "Z12K1": [ "Z11" ] } } ], '
						. '"Z4K3": "Z101" }, '
					. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }',
				'rights' => [ 'wikilambda-create-type' ],
				'allowed' => [
					'basic' => true, 'functioneer' => true, 'maintainer' => true, 'sysop' => true
				],
				'allowedPredefined' => [
					'basic' => false, 'functioneer' => false, 'maintainer' => true, 'sysop' => false
				],
			],

			// TODO: Pre-defined (ZID < 10k) function (Z8 instance)
			// TODO: User-defined (ZID > 10k) function (Z8 instance)
			// TODO: Pre-defined (ZID < 10k) implementation (Z14 instance)
			// TODO: User-defined (ZID > 10k) implementation (Z14 instance)
			// TODO: Pre-defined (ZID < 10k) tester (Z20 instance)
			// TODO: User-defined (ZID > 10k) tester (Z20 instance)
			// TODO: Pre-defined (ZID < 10k) language (Z60 instance)
			// TODO: User-defined (ZID > 10k) language (Z60 instance)
			// TODO: Pre-defined (ZID < 10k) programming language (Z61 instance)
			// TODO: User-defined (ZID > 10k) programming language (Z61 instance)
			// TODO: User-defined (ZID > 10k) boolean (Z40 instance)
			// TODO: Pre-defined (ZID < 10k) boolean (Z40 instance)
			// TODO: User-defined (ZID > 10k) unit (Z21 instance)
			// TODO: Pre-defined (ZID < 10k) unit (Z21 instance)

		];

		$userZid = 10000;
		$reservedZid = 400;

		foreach ( $typesToTry as $type => $attemptObject ) {
			foreach ( $attemptObject['allowedPredefined'] ?? [] as $userType => $expectedAllowed ) {

				yield "Pre-defined (ZID < 10k) $type, $userType user" => [
					$userType,
					'Z' . $reservedZid,
					str_replace( 'Z0', 'Z' . $reservedZid, $attemptObject['content'] ),
					$attemptObject['rights'],
					$expectedAllowed
				];

				if ( $expectedAllowed ) {
					$reservedZid++;
				}
			}
			foreach ( $attemptObject['allowed'] ?? [] as $userType => $expectedAllowed ) {
				yield "User-defined (ZID > 10k) $type, $userType user" => [
					$userType,
					'Z' . $userZid,
					str_replace( 'Z0', 'Z' . $userZid, $attemptObject['content'] ),
					$attemptObject['rights'],
					$expectedAllowed
				];

				if ( $expectedAllowed ) {
					$userZid++;
				}
			}
		}
	}

	// TODO: Edits to pre-existing content, especially:
	// TODO: Pre-defined (ZID < 10k) label change
	// TODO: User-defined (ZID > 10k) label change
}
