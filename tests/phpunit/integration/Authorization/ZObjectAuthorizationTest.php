<?php

/**
 * WikiLambda integration test suite for granular edit authorization mechanisms
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
use MediaWiki\Extension\WikiLambda\ZObjectPage;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Json\FormatJson;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Authorization\ZObjectAuthorization
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
}
