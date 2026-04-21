<?php

/**
 * WikiLambda integration test suite for granular edit authorisation mechanisms,
 * covering both creation and editing of ZObjects.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Authorization;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\Authorization\ZObjectAuthorization;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectContent\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectContent\ZObjectPage;
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
class ZObjectAuthorizationTest extends WikiLambdaIntegrationTestCase {

	private ZObjectStore $zobjectStore;
	private ZObjectAuthorization $zobjectAuthorization;

	protected function setUp(): void {
		parent::setUp();
		$this->zobjectStore = WikiLambdaServices::getZObjectStore();
		$this->zobjectAuthorization = WikiLambdaServices::getZObjectAuthorization();
	}

	/**
	 * Insert the broad set of type definitions needed by the creation and label-edit tests.
	 */
	private function insertCreationDependencies(): void {
		$this->insertZids( [
			'Z1', 'Z2', 'Z6', 'Z7', 'Z3', 'Z4', 'Z8', 'Z17', 'Z14', 'Z16',
			'Z20', 'Z24', 'Z40', 'Z46', 'Z60', 'Z61', 'Z64', 'Z801', 'Z6884', 'Z6095'
		] );
	}

	/**
	 * Edit rights detection (data-driven from JSON fixtures)
	 *
	 * @dataProvider provideContentDiffs
	 * @param string $zid
	 * @param array $dependencies
	 * @param array $oldValue
	 * @param array $newValue
	 * @param array $groups
	 * @param string $description
	 * @param bool $expectedAuthorized
	 * @param array $expectedRights
	 */
	public function testContentDiffs(
		$zid, $dependencies, $oldValue, $newValue, $groups, $description, $expectedAuthorized, $expectedRights
	) {
		// Insert dependencies
		$this->insertZids( $dependencies );

		// Create title
		$title = Title::newFromText( $zid, NS_MAIN );

		// Create and validate ZObjectContent objects
		$oldContent = new ZObjectContent( FormatJson::encode( $oldValue ) );
		$newContent = new ZObjectContent( FormatJson::encode( $newValue ) );
		$this->assertTrue( $oldContent->isValid() );
		$this->assertTrue( $newContent->isValid() );

		// Get test user belonging to specified groups
		$user = $this->getTestUser( $groups )->getUser();

		// Assert that the correct rights are detected
		$rights = $this->zobjectAuthorization->getRequiredEditRights(
			$oldContent,
			$newContent,
			$title
		);

		$this->assertEqualsCanonicalizing( $expectedRights, $rights );

		// Request authorization finally goes through
		$authorized = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$user,
			$title
		);
		$this->assertEquals( $expectedAuthorized, $authorized->isValid() );
	}

	public static function provideContentDiffs() {
		$testData = [];

		$diffDir = dirname( __DIR__, 2 ) . '/test_data/authorization/content/';
		$allDiffs = scandir( $diffDir );

		foreach ( $allDiffs as $filename ) {
			$filePath = "$diffDir$filename";
			if ( is_dir( $filePath ) ) {
				continue;
			}

			$diffData = json_decode( file_get_contents( $filePath ) );

			foreach ( $diffData->attempts as $attempt ) {
				yield $attempt->description => [
					$diffData->zid,
					$diffData->dependencies,
					$diffData->oldValue,
					$diffData->newValue,
					$attempt->groups,
					$attempt->description,
					$attempt->authorized,
					$diffData->rights
				];
			}
		}
	}

	/**
	 * Attached implementation and tester editing
	 */
	public function testAttachedImplementationAndTest() {
		$user = $this->getTestUser()->getUser();
		$functioneer = $this->getTestUser( [ "functioneer" ] )->getUser();

		// SETUP:
		// Insert function Echo
		$this->insertZids( [ 'Z17', 'Z14', 'Z16', 'Z20' ] );

		// Get implementation and tester JSONs
		$filePath = dirname( __DIR__, 2 ) . '/test_data/authorization/function-implementation-tester.json';
		$fileData = json_decode( file_get_contents( $filePath ) );
		$function = $fileData->function;

		// Insert new function
		$functionPage = $this->zobjectStore->createNewZObject(
			RequestContext::getMain(),
			FormatJson::encode( $function ),
			'Insert function',
			$user
		);
		$this->assertTrue( $functionPage->isOK() );
		$functionZid = $functionPage->getTitle()->getBaseText();

		// TEST IMPLEMENTATION:
		// Replace function Zid and create title
		$implementation = json_decode( str_replace(
			'FUNCTIONZID',
			$functionZid,
			json_encode( $fileData->implementation )
		) );
		$title = Title::newFromText( $implementation->zid, NS_MAIN );

		// Create and validate ZObjectContent objects
		$oldContent = new ZObjectContent( FormatJson::encode( $implementation->oldValue ) );
		$newContent = new ZObjectContent( FormatJson::encode( $implementation->newValue ) );
		$this->assertTrue( $oldContent->isValid() );
		$this->assertTrue( $newContent->isValid() );

		// Assert that the correct rights are detected
		$rights = $this->zobjectAuthorization->getRequiredEditRights(
			$oldContent,
			$newContent,
			$title
		);
		$this->assertEquals( [
			'edit',
			'wikilambda-edit-attached-implementation'
		], $rights );

		// Request authorization finally goes through
		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$user,
			$title
		);
		$this->assertFalse( $status->isValid(), 'User is not authorized to edit attached implementation' );
		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$functioneer,
			$title
		);
		$this->assertTrue( $status->isValid(), 'Functioneer is authorized to edit attached implementation' );

		// TESTER:
		// Create title
		$tester = json_decode( str_replace(
			'FUNCTIONZID',
			$functionZid,
			json_encode( $fileData->tester )
		) );
		$title = Title::newFromText( $tester->zid, NS_MAIN );

		// Create and validate ZObjectContent objects
		$oldContent = new ZObjectContent( FormatJson::encode( $tester->oldValue ) );
		$newContent = new ZObjectContent( FormatJson::encode( $tester->newValue ) );
		$this->assertTrue( $oldContent->isValid() );
		$this->assertTrue( $newContent->isValid() );

		// Assert that the correct rights are detected
		$rights = $this->zobjectAuthorization->getRequiredEditRights(
			$oldContent,
			$newContent,
			$title
		);
		$this->assertEquals( [
			'edit',
			'wikilambda-edit-attached-tester'
		], $rights );

		// Request authorization finally goes through
		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$user,
			$title
		);
		$this->assertFalse( $status->isValid(), 'User is not authorized to edit attached tester' );
		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$functioneer,
			$title
		);
		$this->assertTrue( $status->isValid(), 'Functioneer is authorized to edit attached tester' );
	}

	/**
	 * Detached implementation and tester editing
	 */
	public function testDetachedImplementationAndTest() {
		$user = $this->getTestUser()->getUser();
		$functioneer = $this->getTestUser( [ "functioneer" ] )->getUser();

		// SETUP:
		// Insert function Echo
		$this->insertZids( [ 'Z17', 'Z14', 'Z16', 'Z20' ] );

		// Get implementation and tester JSONs
		$filePath = dirname( __DIR__, 2 ) . '/test_data/authorization/function-implementation-tester.json';
		$fileData = json_decode( file_get_contents( $filePath ) );
		$function = $fileData->function;

		// Insert new function
		$functionPage = $this->zobjectStore->createNewZObject(
			RequestContext::getMain(),
			FormatJson::encode( $function ),
			'Insert function',
			$user
		);
		$this->assertTrue( $functionPage->isOK() );
		$functionZid = $functionPage->getTitle()->getBaseText();

		// TEST IMPLEMENTATION:
		// Replace function Zid and create title
		$implementation = json_decode( str_replace(
			'FUNCTIONZID',
			$functionZid,
			json_encode( $fileData->implementation_detached )
		) );
		$title = Title::newFromText( $implementation->zid, NS_MAIN );

		// Create and validate ZObjectContent objects
		$oldContent = new ZObjectContent( FormatJson::encode( $implementation->oldValue ) );
		$newContent = new ZObjectContent( FormatJson::encode( $implementation->newValue ) );
		$this->assertTrue( $oldContent->isValid() );
		$this->assertTrue( $newContent->isValid() );

		// Assert that the correct rights are detected
		$rights = $this->zobjectAuthorization->getRequiredEditRights(
			$oldContent,
			$newContent,
			$title
		);
		$this->assertEquals( [
			'edit',
			'wikilambda-edit-implementation'
		], $rights );

		// Request authorization finally goes through
		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$user,
			$title
		);
		$this->assertTrue( $status->isValid(), 'User is authorized to edit a datached implementation' );

		// TESTER:
		// Create title
		$tester = json_decode( str_replace(
			'FUNCTIONZID',
			$functionZid,
			json_encode( $fileData->tester_detached )
		) );
		$title = Title::newFromText( $tester->zid, NS_MAIN );

		// Create and validate ZObjectContent objects
		$oldContent = new ZObjectContent( FormatJson::encode( $tester->oldValue ) );
		$newContent = new ZObjectContent( FormatJson::encode( $tester->newValue ) );
		$this->assertTrue( $oldContent->isValid() );
		$this->assertTrue( $newContent->isValid() );

		// Assert that the correct rights are detected
		$rights = $this->zobjectAuthorization->getRequiredEditRights(
			$oldContent,
			$newContent,
			$title
		);
		$this->assertEquals( [
			'edit',
			'wikilambda-edit-tester'
		], $rights );

		// Request authorization finally goes through
		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$user,
			$title
		);
		$this->assertTrue( $status->isValid(), 'User is authorized to edit a detached tester' );
	}

	public function testChangeFunctionZidWhenAttached() {
		$user = $this->getTestUser()->getUser();
		$functioneer = $this->getTestUser( [ "functioneer" ] )->getUser();
		$maintainer = $this->getTestUser( [ 'functioneer', 'functionmaintainer' ] )->getUser();

		// SETUP:
		$this->insertZids( [ 'Z17', 'Z14', 'Z16', 'Z20' ] );

		// Get implementation and tester JSONs
		$filePath = dirname( __DIR__, 2 ) . '/test_data/authorization/function-implementation-tester.json';
		$fileData = json_decode( file_get_contents( $filePath ) );
		$function = $fileData->function;

		// Create function 1 with implementation and tester already referenced (they get created automatically)
		$functionPage1 = $this->zobjectStore->createNewZObject(
			RequestContext::getMain(),
			FormatJson::encode( $function ),
			'Insert function 1',
			$user
		);
		$this->assertTrue( $functionPage1->isOK() );
		$functionZid1 = $functionPage1->getTitle()->getBaseText();

		// Create function 2 (for the new function ZID) without testers and implementations
		$functionWithoutImplAndTester = json_decode( str_replace(
			[ '"Z8K3": [ "Z20", "Z10022" ]', '"Z8K4": [ "Z14", "Z10021" ]' ],
			[ '"Z8K3": [ "Z20" ]', '"Z8K4": [ "Z14" ]' ],
			json_encode( $function )
		) );
		$functionPage2 = $this->zobjectStore->createNewZObject(
			RequestContext::getMain(),
			FormatJson::encode( $functionWithoutImplAndTester ),
			'Insert function 2',
			$user
		);
		$this->assertTrue( $functionPage2->isOK() );
		$functionZid2 = $functionPage2->getTitle()->getBaseText();

		// TEST IMPLEMENTATION:
		// Use oldValue with functionZid1, and create newValue with functionZid2 (changing function ZID)
		$implementationOldValue = json_decode( str_replace(
			'FUNCTIONZID',
			$functionZid1,
			json_encode( $fileData->implementation->oldValue )
		) );
		$implementationNewValue = json_decode( str_replace(
			'FUNCTIONZID',
			$functionZid2,
			json_encode( $fileData->implementation->oldValue )
		) );
		$title = Title::newFromText( $fileData->implementation->zid, NS_MAIN );

		// Create and validate ZObjectContent objects
		$oldContent = new ZObjectContent( FormatJson::encode( $implementationOldValue ) );
		$newContent = new ZObjectContent( FormatJson::encode( $implementationNewValue ) );
		$this->assertTrue( $oldContent->isValid() );
		$this->assertTrue( $newContent->isValid() );

		// Assert that the correct rights are detected
		$rights = $this->zobjectAuthorization->getRequiredEditRights(
			$oldContent,
			$newContent,
			$title
		);
		$this->assertEquals( [
			'edit',
			'wikilambda-edit-function-attached-implementation',
			'wikilambda-edit-attached-implementation'
		], $rights );

		// Request authorization
		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$user,
			$title
		);
		$this->assertFalse(
			$status->isValid(),
			'User is not authorized to change function ZID of attached implementation'
		);

		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$functioneer,
			$title
		);
		$this->assertFalse(
			$status->isValid(),
			'Functioneer is not authorized to change function ZID of attached implementation'
		);

		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$maintainer,
			$title
		);
		$this->assertTrue(
			$status->isValid(),
			'Function maintainer is authorized to change function ZID of attached implementation'
		);

		// TESTER:
		// Use oldValue with functionZid1, and create newValue with functionZid2 (changing function ZID)
		$testerOldValue = json_decode( str_replace(
			'FUNCTIONZID',
			$functionZid1,
			json_encode( $fileData->tester->oldValue )
		) );
		$testerNewValue = json_decode( str_replace(
			'FUNCTIONZID',
			$functionZid2,
			json_encode( $fileData->tester->oldValue )
		) );
		$title = Title::newFromText( $fileData->tester->zid, NS_MAIN );

		// Create and validate ZObjectContent objects
		$oldContent = new ZObjectContent( FormatJson::encode( $testerOldValue ) );
		$newContent = new ZObjectContent( FormatJson::encode( $testerNewValue ) );
		$this->assertTrue( $oldContent->isValid() );
		$this->assertTrue( $newContent->isValid() );

		// Assert that the correct rights are detected
		$rights = $this->zobjectAuthorization->getRequiredEditRights(
			$oldContent,
			$newContent,
			$title
		);
		$this->assertEquals( [
			'edit',
			'wikilambda-edit-function-attached-tester',
			'wikilambda-edit-attached-tester'
		], $rights );

		// Request authorization
		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$user,
			$title
		);
		$this->assertFalse(
			$status->isValid(),
			'User is not authorized to change function ZID of attached tester'
		);

		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$functioneer,
			$title
		);
		$this->assertFalse(
			$status->isValid(),
			'Functioneer is not authorized to change function ZID of attached tester'
		);

		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$maintainer,
			$title
		);
		$this->assertTrue(
			$status->isValid(),
			'Function maintainer is authorized to change function ZID of attached tester'
		);
	}

	// ─── Non-running function editing ──────────────────────────

	public function testNotRunningFunction() {
		$loggedout = $this->getServiceContainer()->getUserFactory()->newAnonymous();
		$user = $this->getTestUser()->getUser();
		$functioneer = $this->getTestUser( [ 'functioneer' ] )->getUser();
		$maintainer = $this->getTestUser( [ 'functioneer', 'functionmaintainer' ] )->getUser();

		// SETUP:
		$this->insertZids( [ 'Z17', 'Z14', 'Z16', 'Z20' ] );
		$filePath = dirname( __DIR__, 2 ) . '/test_data/authorization/bare-function.json';
		$originalFunction = json_decode( file_get_contents( $filePath ) );

		// Insert new function
		$functionPage = $this->zobjectStore->createNewZObject(
			RequestContext::getMain(),
			FormatJson::encode( $originalFunction ),
			'Insert function',
			$user
		);
		$this->assertTrue( $functionPage->isOK() );
		$title = $functionPage->getTitle();

		// Swap out the Z0s
		$zid = $functionPage->getTitle()->getBaseText();
		$originalFunction = json_decode( str_replace( 'Z0', $zid, json_encode( $originalFunction ) ) );

		// Content change: Attempt to change the return type from 'Z40' to 'Z6'
		$typeChangedFunction = json_decode( str_replace( 'Z40', 'Z6', json_encode( $originalFunction ) ) );
		$oldContent = new ZObjectContent( FormatJson::encode( $originalFunction ) );

		$newContent = new ZObjectContent( FormatJson::encode( $typeChangedFunction ) );
		$this->assertTrue( $oldContent->isValid() );
		$this->assertTrue( $newContent->isValid() );

		// Assert that the correct rights are detected
		$rights = $this->zobjectAuthorization->getRequiredEditRights(
			$oldContent,
			$newContent,
			$title
		);
		$this->assertEquals( [
			'edit',
			'wikilambda-edit-user-function'
		], $rights );

		// Request authorization finally goes through
		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$loggedout,
			$title
		);
		$this->assertFalse(
			$status->isValid(),
			'Logged-out user not is authorized to edit the definition of a not-running function'
		);
		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$user,
			$title
		);
		$this->assertTrue(
			$status->isValid(),
			'User is authorized to edit the definition of a not-running function'
		);
		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$functioneer,
			$title
		);
		$this->assertTrue(
			$status->isValid(),
			'Functioneer is authorized to edit the definition of a not-running function'
		);
		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$maintainer,
			$title
		);
		$this->assertTrue(
			$status->isValid(),
			'Maintainer is authorized to edit the definition of an not-running function'
		);

		// Label change: Attempt to add a label (to both the argument and the object)
		$labelledFunction = json_decode(
			str_replace( '"Z11"', '"Z11", { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "Label" }',
			json_encode( $originalFunction ) )
		);
		$oldContent = new ZObjectContent( FormatJson::encode( $originalFunction ) );
		$newContent = new ZObjectContent( FormatJson::encode( $labelledFunction ) );
		$this->assertTrue( $oldContent->isValid() );
		$this->assertTrue( $newContent->isValid() );

		// Assert that the correct rights are detected
		$rights = $this->zobjectAuthorization->getRequiredEditRights(
			$oldContent,
			$newContent,
			$title
		);
		$this->assertEquals( [
			'edit',
			'wikilambda-edit-argument-label',
			'wikilambda-edit-object-label'
		], $rights );

		// Request authorization finally goes through
		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$loggedout,
			$title
		);
		$this->assertFalse(
			$status->isValid(),
			'Logged-out user is not authorized to edit the labels of an unattached function'
		);
		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$user,
			$title
		);
		$this->assertTrue(
			$status->isValid(),
			'User is authorized to edit the labels of an unattached function'
		);
		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$functioneer,
			$title
		);
		$this->assertTrue(
			$status->isValid(),
			'Functioneer is also authorized to edit the labels of an unattached function'
		);
		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$maintainer,
			$title
		);
		$this->assertTrue(
			$status->isValid(),
			'Functioneer is also authorized to edit the labels of an unattached function'
		);
	}

	// ─── Enum value editing ────────────────────────────────────

	public function testEditEnumValue() {
		$user = $this->getTestUser()->getUser();
		$functioneer = $this->getTestUser( [ 'functioneer' ] )->getUser();
		$maintainer = $this->getTestUser( [ 'functioneer', 'functionmaintainer' ] )->getUser();

		// SETUP ENUM:
		$this->insertZids( [ 'Z40' ] );
		// Insert new Enum type
		$filePath = dirname( __DIR__, 2 ) . '/test_data/authorization/enum-type.json';
		$fileData = json_decode( file_get_contents( $filePath ) );
		$month = $fileData->month;

		// Insert new enum type
		$typePage = $this->zobjectStore->createNewZObject(
			RequestContext::getMain(),
			FormatJson::encode( $month ),
			'Insert month type',
			$functioneer
		);
		$this->assertTrue( $typePage->isOK() );
		$typeZid = $typePage->getTitle()->getBaseText();

		// ENUM INSTANCE:
		// Replace type Zid and create title
		$january = json_decode( str_replace(
			'TYPEZID',
			$typeZid,
			json_encode( $fileData->january )
		) );
		$title = Title::newFromText( $january->zid, NS_MAIN );

		// Create and validate ZObjectContent objects
		$oldContent = new ZObjectContent( FormatJson::encode( $january->oldValue ) );
		$newContent = new ZObjectContent( FormatJson::encode( $january->newValue ) );
		$this->assertTrue( $oldContent->isValid() );
		$this->assertTrue( $newContent->isValid() );

		// Assert that the correct rights are detected
		$rights = $this->zobjectAuthorization->getRequiredEditRights(
			$oldContent,
			$newContent,
			$title
		);
		$this->assertEquals( [
			'edit',
			'wikilambda-edit-enum-value'
		], $rights );

		// Request authorization finally goes through
		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$user,
			$title
		);
		$this->assertFalse( $status->isValid(), 'User is not authorized to edit enum value' );
		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$functioneer,
			$title
		);
		$this->assertFalse( $status->isValid(), 'Functioneer is not authorized to edit enum value' );
		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$maintainer,
			$title
		);
		$this->assertTrue( $status->isValid(), 'Function maintainer is authorized to edit enum value' );
	}

	// ─── Connected converter editing ───────────────────────────

	public function testConnectedConverters() {
		$user = $this->getTestUser()->getUser();
		$functioneer = $this->getTestUser( [ 'functioneer' ] )->getUser();
		$maintainer = $this->getTestUser( [ 'functioneer', 'functionmaintainer' ] )->getUser();

		// SETUP:
		$this->insertZids( [ 'Z16', 'Z64', 'Z46' ] );
		$filePath = dirname( __DIR__, 2 ) . '/test_data/authorization/type-converters.json';
		$fileData = json_decode( file_get_contents( $filePath ) );
		$type = $fileData->type;

		// Insert new type
		$typePage = $this->zobjectStore->createNewZObject(
			RequestContext::getMain(),
			FormatJson::encode( $type ),
			'Insert type',
			$functioneer
		);
		$this->assertTrue( $typePage->isOK() );
		$typeZid = $typePage->getTitle()->getBaseText();

		$converters = [ 'deserialiser', 'serialiser' ];

		foreach ( $converters as $converter ) {
			// Replace type Zid and create title
			$converterData = json_decode( str_replace(
				'TYPEZID',
				$typeZid,
				json_encode( $fileData->{ $converter } )
			) );
			$title = Title::newFromText( $converterData->zid, NS_MAIN );

			// Create and validate ZObjectContent objects
			$oldContent = new ZObjectContent( FormatJson::encode( $converterData->oldValue ) );
			$newContent = new ZObjectContent( FormatJson::encode( $converterData->newValue ) );
			$this->assertTrue( $oldContent->isValid() );
			$this->assertTrue( $newContent->isValid() );

			// Assert that the correct rights are detected
			$rights = $this->zobjectAuthorization->getRequiredEditRights(
				$oldContent,
				$newContent,
				$title
			);
			$this->assertEquals( [
				'edit',
				'wikilambda-edit-connected-converter'
			], $rights );

			// Request authorization finally goes through
			$status = $this->zobjectAuthorization->authorize(
				$oldContent,
				$newContent,
				$user,
				$title
			);
			$this->assertFalse( $status->isValid(), 'User is not authorized to edit enum value' );
			$status = $this->zobjectAuthorization->authorize(
				$oldContent,
				$newContent,
				$functioneer,
				$title
			);
			$this->assertFalse( $status->isValid(), 'Functioneer is not authorized to edit enum value' );
			$status = $this->zobjectAuthorization->authorize(
				$oldContent,
				$newContent,
				$maintainer,
				$title
			);
			$this->assertTrue( $status->isValid(), 'Function maintainer is authorized to edit enum value' );
		}
	}

	// ─── Persisted edit round-trips ────────────────────────────

	/**
	 * @dataProvider providePersistedEdits
	 *
	 * @param array $dependencies
	 * @param string $zid
	 * @param array $newValue
	 * @param string $description
	 * @param bool $authorized
	 */
	public function testPersistedEdits( $dependencies, $zid, $newValue, $description, $authorized ) {
		// Setup dependencies and Lang Registry
		$this->insertZids( $dependencies );
		$this->registerLangs( [ 'en', 'es' ] );

		// Get user
		// FIXME (T342357): different type of user to come in the test file
		$user = $this->getTestSysop()->getUser();

		// Try to update the already existing object
		$page = $this->zobjectStore->updateZObject(
			RequestContext::getMain(),
			$zid,
			FormatJson::encode( $newValue ),
			'Update summary',
			$user
		);

		$this->assertTrue( $page instanceof ZObjectPage, 'Update returns a ZObjectPage successfully' );
		$this->assertSame( $authorized, $page->isOK(), $description );

		// Refetch and check that the persisted version is the expected
		$title = Title::newFromText( $zid, NS_MAIN );
		$updated = $this->zobjectStore->fetchZObjectByTitle( $title );
		$this->assertTrue( $updated instanceof ZObjectContent );
		if ( $authorized ) {
			$this->assertEquals(
				FormatJson::decode( FormatJson::encode( $newValue ) ),
				FormatJson::decode( $updated->getText() ),
				'The edit has been successfully authorized'
			);
		} else {
			$this->assertNotEquals(
				FormatJson::decode( FormatJson::encode( $newValue ) ),
				FormatJson::decode( $updated->getText() ),
				'The edit has been successfully unauthorized'
			);
		}
	}

	public static function providePersistedEdits() {
		$testData = [];

		$diffDir = dirname( __DIR__, 2 ) . '/test_data/authorization/persisted/';
		$allDiffs = scandir( $diffDir );

		foreach ( $allDiffs as $filename ) {
			$filePath = "$diffDir$filename";
			if ( is_dir( $filePath ) ) {
				continue;
			}

			$diffData = json_decode( file_get_contents( $filePath ) );
			$testData[ $filename ] = [
				$diffData->dependencies,
				$diffData->zid,
				$diffData->newValue,
				$diffData->description,
				$diffData->authorized
			];
		}
		return $testData;
	}

	// ─── End-to-end creation attempts ──────────────────────────

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
		$this->insertCreationDependencies();

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
	 * is tested in the unit test ZObjectAuthorizationInCreationTest.
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

		// ─── Wikidata enums ───────────────────────────────────────

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

	/**
	 * Enum value creation
	 */
	public function testCreateEnumValue() {
		$this->insertCreationDependencies();
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

	/**
	 * Test that label changes on a predefined object (ZID < 10k) are permitted for all user types.
	 *
	 * The label-change rule (path Z2K3.Z12K1) fires before the predefined-object rule (path Z2K2),
	 * so editing labels does not require wikilambda-edit-predefined.
	 */
	public function testEditLabelPredefined() {
		$this->insertCreationDependencies();

		// Z801 (Echo) is already inserted as a predefined function
		$title = Title::newFromText( 'Z801', NS_MAIN );
		$existingContent = $this->zobjectStore->fetchZObjectByTitle( $title );
		$this->assertNotFalse( $existingContent, 'Z801 should exist in the DB' );

		// Construct a version with an added Spanish label
		$oldObject = FormatJson::decode( $existingContent->getText() );
		$newObject = FormatJson::decode( $existingContent->getText() );
		$newObject->Z2K3->Z12K1[] = (object)[
			'Z1K1' => 'Z11',
			'Z11K1' => 'Z1003',
			'Z11K2' => 'Eco'
		];

		$oldContent = new ZObjectContent( FormatJson::encode( $oldObject ) );
		$newContent = new ZObjectContent( FormatJson::encode( $newObject ) );
		$this->assertTrue( $oldContent->isValid(), 'Old content should be valid' );
		$this->assertTrue( $newContent->isValid(), 'New content should be valid' );

		// Assert that a label change requires only 'edit' and 'wikilambda-edit-object-label'
		$rights = $this->zobjectAuthorization->getRequiredEditRights( $oldContent, $newContent, $title );
		$this->assertEquals( [ 'edit', 'wikilambda-edit-object-label' ], $rights );

		// All user types should be authorized
		$basic = $this->getTestUser()->getUser();
		$status = $this->zobjectAuthorization->authorize( $oldContent, $newContent, $basic, $title );
		$this->assertTrue( $status->isValid(), 'Basic user should be able to edit labels on a predefined object' );
	}

	/**
	 * Test that label changes on a user-defined object (ZID > 10k) are permitted for all user types.
	 */
	public function testEditLabelUserDefined() {
		$this->insertCreationDependencies();
		$functioneer = $this->getTestUser( [ 'functioneer' ] )->getUser();

		// Create a user-defined function to edit
		$functionContent =
			'{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" }, "Z2K2": { "Z1K1": "Z8", '
				. '"Z8K1": [ "Z17", { "Z1K1": "Z17", '
					. '"Z17K1": "Z6", '
					. '"Z17K2": "Z0K1", '
					. '"Z17K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } } ], '
				. '"Z8K2": "Z6", '
				. '"Z8K3": [ "Z20" ], '
				. '"Z8K4": [ "Z14" ], '
				. '"Z8K5": "Z0" }, '
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11", '
				. '{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "Test function" } ] } }';

		$functionPage = $this->zobjectStore->createNewZObject(
			RequestContext::getMain(),
			$functionContent,
			'Insert test function',
			$functioneer
		);
		$this->assertTrue( $functionPage->isOK(), 'Function creation should succeed' );
		$title = $functionPage->getTitle();

		// Fetch the created content and modify its label
		$existingContent = $this->zobjectStore->fetchZObjectByTitle( $title );
		$oldObject = FormatJson::decode( $existingContent->getText() );
		$newObject = FormatJson::decode( $existingContent->getText() );
		$newObject->Z2K3->Z12K1[] = (object)[
			'Z1K1' => 'Z11',
			'Z11K1' => 'Z1003',
			'Z11K2' => 'Función de prueba'
		];

		$oldContent = new ZObjectContent( FormatJson::encode( $oldObject ) );
		$newContent = new ZObjectContent( FormatJson::encode( $newObject ) );
		$this->assertTrue( $oldContent->isValid(), 'Old content should be valid' );
		$this->assertTrue( $newContent->isValid(), 'New content should be valid' );

		// Assert that a label change requires only 'edit' and 'wikilambda-edit-object-label'
		$rights = $this->zobjectAuthorization->getRequiredEditRights( $oldContent, $newContent, $title );
		$this->assertEquals( [ 'edit', 'wikilambda-edit-object-label' ], $rights );

		// A basic user should be authorized to edit labels
		$basic = $this->getTestUser()->getUser();
		$status = $this->zobjectAuthorization->authorize( $oldContent, $newContent, $basic, $title );
		$this->assertTrue( $status->isValid(), 'Basic user should be able to edit labels on a user-defined object' );
	}
}
