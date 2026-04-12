<?php

/**
 * WikiLambda integration test suite for granular edit authorization mechanisms when creating
 *
 * The bulk of the rights-detection logic is tested in the unit test
 * ZObjectAuthorizationCreateRightsTest. This integration test covers:
 * - End-to-end creation attempts that exercise the full authorization + persistence pipeline
 * - The enum-value creation path, which requires a real DB to look up the enum type
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Authorization;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\Authorization\ZObjectAuthorization;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Json\FormatJson;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Authorization\ZObjectAuthorization
 * @covers \MediaWiki\Extension\WikiLambda\Authorization\AuthorizationStatus
 * @covers \MediaWiki\Extension\WikiLambda\Authorization\ZObjectFilterInRange
 * @covers \MediaWiki\Extension\WikiLambda\Authorization\ZObjectFilterIsEnumValue
 * @covers \MediaWiki\Extension\WikiLambda\Authorization\ZObjectFilterIsRunnable
 * @covers \MediaWiki\Extension\WikiLambda\Authorization\ZObjectFilterTypeChanged
 * @covers \MediaWiki\Extension\WikiLambda\Authorization\ZObjectFilterIsAttached
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectStore
 * @group Database
 */
class ZObjectAuthorizationInCreationTest extends WikiLambdaIntegrationTestCase {

	private ZObjectStore $zobjectStore;
	private ZObjectAuthorization $zobjectAuthorization;

	protected function setUp(): void {
		parent::setUp();

		$this->zobjectStore = WikiLambdaServices::getZObjectStore();
		$this->zobjectAuthorization = WikiLambdaServices::getZObjectAuthorization();

		$this->insertZids( [
			'Z1', 'Z2', 'Z6', 'Z7', 'Z3', 'Z4', 'Z8', 'Z17', 'Z14', 'Z16',
			'Z20', 'Z24', 'Z40', 'Z46', 'Z60', 'Z61', 'Z64', 'Z801', 'Z6884', 'Z6095'
		] );
	}

	/**
	 * @dataProvider provideCreateNew
	 *
	 * @param string $userType One of 'basic', 'functioneer', 'maintainer'
	 * @param string $zid
	 * @param string $testedType
	 * @param string $createContent
	 * @param bool $expectedCreateAllowed
	 * @param bool $systemBlocksAsInvalid
	 */
	public function testCreateNew(
		string $userType, string $zid, string $testedType,
		string $createContent,
		bool $expectedCreateAllowed, bool $systemBlocksAsInvalid
	) {
		$user = match ( $userType ) {
			'basic' => $this->getTestUser()->getUser(),
			'functioneer' => $this->getTestUser( [ 'functioneer' ] )->getUser(),
			'maintainer' => $this->getTestUser( [ 'functioneer', 'functionmaintainer' ] )->getUser(),
		};

		$contentObject = new ZObjectContent( $createContent );

		if ( $systemBlocksAsInvalid ) {
			$this->assertFalse(
				$contentObject->isValid(),
				"The system should block the content of a '$testedType' as invalid"
			);
			return;
		}

		$this->assertTrue(
			$contentObject->isValid(),
			"The system should recognise the content of a '$testedType' as valid"
		);

		// Attempt to make the creation
		$attemptedCreation = $this->zobjectStore->updateZObject(
			RequestContext::getMain(),
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

	/**
	 * Representative end-to-end creation attempts. Not exhaustive — the full type→rights mapping
	 * is tested in the unit test ZObjectAuthorizationCreateRightsTest.
	 *
	 * These cases exercise the DB-backed creation pipeline and verify that rights actually gate
	 * the operation for a representative set of types, user roles, and ZID ranges.
	 */
	public static function provideCreateNew() {
		// ─── User-defined (ZID > 10k) ─────────────────────────────

		// Function: all users can create
		yield 'User-defined function (Z8), basic user — allowed' => [
			'basic', 'Z10000', 'Z8',
			'{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z10000" }, "Z2K2": { "Z1K1": "Z8", '
				. '"Z8K1": [ "Z17", { "Z1K1": "Z17", '
					. '"Z17K1": "Z6", '
					. '"Z17K2": "Z10000K1", '
					. '"Z17K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } } ], '
				. '"Z8K2": "Z6", '
				. '"Z8K3": [ "Z20" ], '
				. '"Z8K4": [ "Z14" ], '
				. '"Z8K5": "Z10000" }, '
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }',
			/* $expectedCreateAllowed */ true,
			/* $systemBlocksAsInvalid */ false,
		];

		// Tester: all users can create
		yield 'User-defined tester (Z20), basic user — allowed' => [
			'basic', 'Z10001', 'Z20',
			'{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z10001" }, "Z2K2": { "Z1K1": "Z20", '
				. '"Z20K1": "Z801", '
				. '"Z20K2": { "Z1K1": "Z7", "Z7K1": "Z801", "Z801K1": "test input" }, '
				. '"Z20K3": { "Z1K1": "Z7", "Z7K1": "Z866", '
					. '"Z866K2": "test input" } }, '
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }',
			/* $expectedCreateAllowed */ true,
			/* $systemBlocksAsInvalid */ false,
		];

		// Type: basic user cannot create, functioneer can
		yield 'User-defined type (Z4), basic user — blocked' => [
			'basic', 'Z10002', 'Z4',
			'{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z10002" }, "Z2K2": { "Z1K1": "Z4", '
				. '"Z4K1": "Z10002", '
				. '"Z4K2": [ "Z3", '
					. '{ "Z1K1": "Z3", "Z3K1": "Z6", "Z3K2": "Z10002K1", "Z3K3": '
					. '{ "Z1K1": "Z12", "Z12K1": [ "Z11" ] } } ], '
				. '"Z4K3": "Z101" }, '
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }',
			/* $expectedCreateAllowed */ false,
			/* $systemBlocksAsInvalid */ false,
		];

		yield 'User-defined type (Z4), functioneer user — allowed' => [
			'functioneer', 'Z10002', 'Z4',
			'{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z10002" }, "Z2K2": { "Z1K1": "Z4", '
				. '"Z4K1": "Z10002", '
				. '"Z4K2": [ "Z3", '
					. '{ "Z1K1": "Z3", "Z3K1": "Z6", "Z3K2": "Z10002K1", "Z3K3": '
					. '{ "Z1K1": "Z12", "Z12K1": [ "Z11" ] } } ], '
				. '"Z4K3": "Z101" }, '
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }',
			/* $expectedCreateAllowed */ true,
			/* $systemBlocksAsInvalid */ false,
		];

		// Language: only maintainer can create
		yield 'User-defined language (Z60), functioneer user — blocked' => [
			'functioneer', 'Z10003', 'Z60',
			'{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z10003" }, '
				. '"Z2K2": { "Z1K1": "Z60", "Z60K1": "en-test" }, '
				. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }',
			/* $expectedCreateAllowed */ false,
			/* $systemBlocksAsInvalid */ false,
		];

		yield 'User-defined language (Z60), maintainer user — allowed' => [
			'maintainer', 'Z10003', 'Z60',
			'{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z10003" }, '
				. '"Z2K2": { "Z1K1": "Z60", "Z60K1": "en-test" }, '
				. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }',
			/* $expectedCreateAllowed */ true,
			/* $systemBlocksAsInvalid */ false,
		];

		// Unit: system blocks as invalid (nobody can create)
		yield 'User-defined unit (Z21), maintainer user — system blocks' => [
			'maintainer', 'Z10004', 'Z21',
			'{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z10004" }, '
				. '"Z2K2": { "Z1K1": "Z21" }, '
				. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }',
			/* $expectedCreateAllowed */ false,
			/* $systemBlocksAsInvalid */ true,
		];

		// ─── Pre-defined (ZID < 10k) ──────────────────────────────

		// Function: only maintainer can create predefined
		yield 'Predefined function (Z8), functioneer user — blocked' => [
			'functioneer', 'Z400', 'Z8',
			'{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z400" }, "Z2K2": { "Z1K1": "Z8", '
				. '"Z8K1": [ "Z17", { "Z1K1": "Z17", '
					. '"Z17K1": "Z6", '
					. '"Z17K2": "Z400K1", '
					. '"Z17K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } } ], '
				. '"Z8K2": "Z6", '
				. '"Z8K3": [ "Z20" ], '
				. '"Z8K4": [ "Z14" ], '
				. '"Z8K5": "Z400" }, '
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }',
			/* $expectedCreateAllowed */ false,
			/* $systemBlocksAsInvalid */ false,
		];

		yield 'Predefined function (Z8), maintainer user — allowed' => [
			'maintainer', 'Z400', 'Z8',
			'{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z400" }, "Z2K2": { "Z1K1": "Z8", '
				. '"Z8K1": [ "Z17", { "Z1K1": "Z17", '
					. '"Z17K1": "Z6", '
					. '"Z17K2": "Z400K1", '
					. '"Z17K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } } ], '
				. '"Z8K2": "Z6", '
				. '"Z8K3": [ "Z20" ], '
				. '"Z8K4": [ "Z14" ], '
				. '"Z8K5": "Z400" }, '
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }',
			/* $expectedCreateAllowed */ true,
			/* $systemBlocksAsInvalid */ false,
		];

		// Wikidata enum: functioneer can create user-defined, not predefined
		yield 'User-defined wikidata enum (Z7→Z6884), functioneer — allowed' => [
			'functioneer', 'Z10005', 'Z7',
			'{"Z1K1":"Z2","Z2K1":{"Z1K1":"Z6","Z6K1":"Z10005"},'
				. '"Z2K2":{"Z1K1":"Z7","Z7K1":"Z6884","Z6884K1":"Z6095","Z6884K2":["Z6095",'
				. '{"Z1K1":"Z6095","Z6095K1":"L313289"},'
				. '{"Z1K1":"Z6095","Z6095K1":"L313272"},'
				. '{"Z1K1":"Z6095","Z6095K1":"L338656"}],"Z6884K3":"Z10005"},'
				. '"Z2K3":{"Z1K1":"Z12","Z12K1":["Z11"]}}',
			/* $expectedCreateAllowed */ true,
			/* $systemBlocksAsInvalid */ false,
		];

		yield 'Predefined wikidata enum (Z7→Z6884), functioneer — blocked' => [
			'functioneer', 'Z401', 'Z7',
			'{"Z1K1":"Z2","Z2K1":{"Z1K1":"Z6","Z6K1":"Z401"},'
				. '"Z2K2":{"Z1K1":"Z7","Z7K1":"Z6884","Z6884K1":"Z6095","Z6884K2":["Z6095",'
				. '{"Z1K1":"Z6095","Z6095K1":"L313289"},'
				. '{"Z1K1":"Z6095","Z6095K1":"L313272"},'
				. '{"Z1K1":"Z6095","Z6095K1":"L338656"}],"Z6884K3":"Z401"},'
				. '"Z2K3":{"Z1K1":"Z12","Z12K1":["Z11"]}}',
			/* $expectedCreateAllowed */ false,
			/* $systemBlocksAsInvalid */ false,
		];
	}

	public function testCreateEnumValue() {
		$functioneer = $this->getTestUser( [ 'functioneer' ] )->getUser();

		// SETUP:
		// Insert enum type
		$filePath = dirname( __DIR__, 2 ) . '/test_data/authorization/enum-type.json';
		$fileData = json_decode( file_get_contents( $filePath ) );
		$month = $fileData->month;
		$typePage = $this->zobjectStore->createNewZObject(
			RequestContext::getMain(),
			FormatJson::encode( $month ),
			'Insert month type',
			$functioneer
		);
		$this->assertTrue( $typePage->isOK() );
		$typeZid = $typePage->getTitle()->getBaseText();

		// TEST:
		// Prepare to insert a new enum value
		$january = json_decode( str_replace(
			'TYPEZID',
			$typeZid,
			json_encode( $fileData->january )
		) );
		$title = Title::newFromText( $january->zid, NS_MAIN );
		$contentObject = new ZObjectContent( json_encode( $january->newValue ) );

		// Assert that the correct creation rights are detected
		$actualRights = $this->zobjectAuthorization->getRequiredCreateRights( $contentObject, $title );
		$this->assertContains( 'wikilambda-create-enum-value', $actualRights );
	}

	// TODO (T342357): Edits to pre-existing content, using the modifyContent/modifyRights/labelRights test rigging.
	// TODO (T342357): Pre-defined (ZID < 10k) label change
	// TODO (T342357): User-defined (ZID > 10k) label change
}
