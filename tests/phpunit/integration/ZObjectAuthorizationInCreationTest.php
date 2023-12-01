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

		$this->insertZids( [ 'Z1', 'Z2', 'Z6', 'Z3', 'Z4', 'Z8', 'Z17', 'Z14', 'Z16', 'Z61', 'Z801' ] );
	}

	/**
	 * @dataProvider provideCreateNew
	 *
	 * @param string $userType One of 'basic', 'functioneer', 'maintainer', 'sysop'
	 * @param string $zid
	 * @param string $testedType
	 * @param string $createContent
	 * @param array $expectedCreateRights
	 * @param bool $expectedCreateAllowed
	 */
	public function testCreateNew(
		string $userType, string $zid, string $testedType,
		string $createContent, array $expectedCreateRights, bool $expectedCreateAllowed
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

		$contentObject = new ZObjectContent( $createContent );

		$this->assertTrue(
			$contentObject->isValid(),
			"The system should recognise the content of a '$testedType' as valid"
		);

		// Assert that the correct creation rights are detected
		$actualRights = $this->zobjectAuthorization->getRequiredCreateRights( $contentObject, $title );

		foreach ( $expectedCreateRights as $key => $value ) {
			$this->assertContains(
				$value,
				$actualRights,
				"Attempted creation of a '$testedType' should require the '$value' right"
			);
		}

		// Attempt to make the creation
		$attemptedCreation = $this->zobjectStore->updateZObject(
			$zid,
			$createContent,
			'Insert new object',
			$user,
			EDIT_NEW
		);

		if ( $expectedCreateAllowed ) {
			$this->assertTrue(
				$attemptedCreation->isOK(),
				"A $userType user should be allowed to create this '$testedType' ZObject as ZID $zid."
			);
		} else {
			$this->assertFalse(
				$attemptedCreation->isOK(),
				"A $userType user should not be allowed to create this '$testedType' ZObject as ZID $zid."
			);
		}
	}

	public function provideCreateNew() {
		$typesToTry = [
			'type (Z4 instance)' => [
				'testedType' => 'Z4',
				'createContent' =>
					'{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" }, "Z2K2": { "Z1K1": "Z4", '
						. '"Z4K1": "Z0", '
						. '"Z4K2": [ "Z3", '
							. '{ "Z1K1": "Z3", "Z3K1": "Z6", "Z3K2": "Z0K1", "Z3K3": '
							. '{ "Z1K1": "Z12", "Z12K1": [ "Z11" ] } } ], '
						. '"Z4K3": "Z101" }, '
					. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }',
				'createRights' => [ 'wikilambda-create-type' ],
				'createAllowed' => [
					'basic' => false, 'functioneer' => true, 'maintainer' => true, 'sysop' => false
				],
				'createAllowedPredefined' => [
					'basic' => false, 'functioneer' => false, 'maintainer' => true, 'sysop' => false
				],
				// TODO (T342357): Wire up this test rigging; currently unused
				'modifyContent' =>
					'{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" }, "Z2K2": { "Z1K1": "Z4", '
						. '"Z4K1": "Z0", '
						. '"Z4K2": [ "Z3", '
							. '{ "Z1K1": "Z3", "Z3K1": "Z40", "Z3K2": "Z0K1", "Z3K3": '
							. '{ "Z1K1": "Z12", "Z12K1": [ "Z11" ] } } ], '
						. '"Z4K3": "Z101" }, '
					. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }',
				'modifyRights' => [ 'wikilambda-edit-type' ],
				'modifyAllowed' => [
					'basic' => false, 'functioneer' => false, 'maintainer' => true, 'sysop' => false
				],
				'modifyAllowedPredefined' => [
					'basic' => false, 'functioneer' => false, 'maintainer' => true, 'sysop' => false
				],
				'labelRights' => [ 'wikilambda-edit-object-label' ],
				'labelAllowed' => [
					'basic' => true, 'functioneer' => true, 'maintainer' => true, 'sysop' => true
				],
				'labelAllowedPredefined' => [
					'basic' => true, 'functioneer' => true, 'maintainer' => true, 'sysop' => true
				],
			],

			'function (Z8 instance)' => [
				'testedType' => 'Z8',
				'createContent' =>
					'{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" }, "Z2K2": { "Z1K1": "Z8", '
						. '"Z8K1": [ "Z17", { "Z1K1": "Z17", '
							. '"Z17K1": "Z6", '
							. '"Z17K2": "Z0K1", '
							. '"Z17K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } } ], '
						. '"Z8K2": "Z6", '
						. '"Z8K3": [ "Z20" ], '
						. '"Z8K4": [ "Z14" ], '
						. '"Z8K5": "Z0" }, '
					. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }',
				'createRights' => [ 'wikilambda-create-function' ],
				'createAllowed' => [
					'basic' => true, 'functioneer' => true, 'maintainer' => true, 'sysop' => true
				],
				'createAllowedPredefined' => [
					'basic' => false, 'functioneer' => false, 'maintainer' => true, 'sysop' => false
				],
			],

			'implementation (Z14 instance)' => [
				'testedType' => 'Z14',
				'createContent' =>
					'{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" }, "Z2K2": { "Z1K1": "Z14", '
						. '"Z14K1": "Z801", "Z14K3": { "Z1K1": "Z16", '
							. '"Z16K1": { "Z1K1": "Z61", "Z61K1": "Z601" }, '
							. '"Z16K2": "function Z0( input ) {\n\treturn input;\n}" } }, '
					. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }',
				'createRights' => [ 'wikilambda-create-implementation' ],
				'createAllowed' => [
					'basic' => true, 'functioneer' => true, 'maintainer' => true, 'sysop' => true
				],
				'createAllowedPredefined' => [
					'basic' => false, 'functioneer' => false, 'maintainer' => true, 'sysop' => false
				],
			],

			// TODO: Pre-defined (ZID < 10k) tester (Z20 instance)
			// TODO: User-defined (ZID > 10k) tester (Z20 instance)

			'language (Z60 instance)' => [
				'testedType' => 'Z60',
				'content' =>
					'{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" }, '
						. '"Z2K2": { "Z1K1": "Z60", "Z60K1": "en-test" }, '
						. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }',
				'createRights' => [ 'wikilambda-create-language' ],
				'allowed' => [
					'basic' => false, 'functioneer' => false, 'maintainer' => true, 'sysop' => false
				],
				'allowedPredefined' => [
					'basic' => false, 'functioneer' => false, 'maintainer' => true, 'sysop' => false
				],
			],

			'programming language (Z61 instance)' => [
				'testedType' => 'Z61',
				'createContent' =>
					'{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" }, '
						. '"Z2K2": { "Z1K1": "Z61", "Z61K1": "test-programming-language" }, '
						. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } } ',
				'createRights' => [ 'wikilambda-create-programming' ],
				'createAllowed' => [
					'basic' => false, 'functioneer' => false, 'maintainer' => true, 'sysop' => false
				],
				'createAllowedPredefined' => [
					'basic' => false, 'functioneer' => false, 'maintainer' => true, 'sysop' => false
				],
			],

			// TODO: User-defined (ZID > 10k) boolean (Z40 instance)
			// TODO: Pre-defined (ZID < 10k) boolean (Z40 instance)
			// TODO: User-defined (ZID > 10k) unit (Z21 instance)
			// TODO: Pre-defined (ZID < 10k) unit (Z21 instance)

		];

		$userZid = 10000;
		$reservedZid = 400;

		foreach ( $typesToTry as $type => $attemptObject ) {
			$expectedCreateRights = $attemptObject['createRights'] + [ 'edit', 'wikilambda-create' ];

			foreach ( $attemptObject['createAllowedPredefined'] ?? [] as $userType => $expectedCreateAllowed ) {
				$createReservedContent = str_replace( 'Z0', 'Z' . $reservedZid, $attemptObject['createContent'] );

				yield "Pre-defined (ZID < 10k) $type, $userType user" => [
					/* $userType */ $userType,
					/* $zid */ 'Z' . $reservedZid,
					/* $testedType */ $attemptObject['testedType'],
					/* $createContent */ $createReservedContent,
					/* $expectedCreateRights */ $expectedCreateRights + [ 'wikilambda-create-predefined' ],
					/* $expectedCreateAllowed */ $expectedCreateAllowed
				];

				if ( $expectedCreateAllowed ) {
					$reservedZid++;
				}
			}

			foreach ( $attemptObject['createAllowed'] ?? [] as $userType => $expectedCreateAllowed ) {
				$createUserContent = str_replace( 'Z0', 'Z' . $userZid, $attemptObject['createContent'] );

				yield "User-defined (ZID > 10k) $type, $userType user" => [
					/* $userType */ $userType,
					/* $zid */ 'Z' . $userZid,
					/* $testedType */ $attemptObject['testedType'],
					/* $createContent */ $createUserContent,
					/* $expectedCreateRights */ $expectedCreateRights,
					/* $expectedCreateAllowed */ $expectedCreateAllowed
				];

				if ( $expectedCreateAllowed ) {
					$userZid++;
				}
			}
		}
	}

	// TODO (T342357): Edits to pre-existing content, especially:
	// TODO: Pre-defined (ZID < 10k) label change
	// TODO: User-defined (ZID > 10k) label change
}
