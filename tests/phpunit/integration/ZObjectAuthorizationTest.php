<?php

/**
 * WikiLambda integration test suite for granular edit authorization mechanisms
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use FormatJson;
use MediaWiki\Extension\WikiLambda\Authorization\ZObjectAuthorization;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectPage;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Title\Title;
use User;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Authorization\ZObjectAuthorization
 * @covers \MediaWiki\Extension\WikiLambda\Authorization\ZObjectFilterInRange
 * @covers \MediaWiki\Extension\WikiLambda\Authorization\ZObjectFilterIsRunnable
 * @covers \MediaWiki\Extension\WikiLambda\Authorization\ZObjectFilterTypeChanged
 * @covers \MediaWiki\Extension\WikiLambda\Authorization\ZObjectFilterIsAttached
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectStore
 * @group Database
 */
class ZObjectAuthorizationTest extends WikiLambdaIntegrationTestCase {

	/** @var ZObjectStore */
	protected $zobjectStore;
	/** @var ZObjectAuthorization */
	protected $zobjectAuthorization;

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

		$diffDir = dirname( __DIR__, 1 ) . '/test_data/authorization/content/';
		$allDiffs = scandir( $diffDir );

		foreach ( $allDiffs as $filename ) {
			$filePath = "$diffDir$filename";
			if ( is_dir( $filePath ) ) {
				continue;
			}

			$diffData = json_decode( file_get_contents( $filePath ) );
			$testData[ $filename ] = [
				$diffData->zid,
				$diffData->dependencies,
				$diffData->oldValue,
				$diffData->newValue,
				$diffData->groups,
				$diffData->description,
				$diffData->authorized,
				$diffData->rights
			];
		}
		return $testData;
	}

	public function testAttached() {
		$user = $this->getTestUser()->getUser();
		$functioneer = $this->getTestUser( [ "functioneer" ] )->getUser();

		// SETUP:
		// Insert function Echo
		$this->insertZids( [ 'Z17', 'Z14', 'Z16', 'Z20' ] );

		// Get implementation and tester JSONs
		$filePath = dirname( __DIR__, 1 ) . '/test_data/authorization/function-implementation-tester.json';
		$fileData = json_decode( file_get_contents( $filePath ) );
		$function = $fileData->function;

		// Insert new function
		$functionPage = $this->zobjectStore->createNewZObject(
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

	public function testUnattached() {
		$loggedout = User::newFromId( 0 );
		$user = $this->getTestUser()->getUser();
		$functioneer = $this->getTestUser( [ 'functioneer' ] )->getUser();
		$maintainer = $this->getTestUser( [ 'functioneer','functionmaintainer' ] )->getUser();

		// SETUP:
		$this->insertZids( [ 'Z17', 'Z14', 'Z16', 'Z20' ] );
		$filePath = dirname( __DIR__, 1 ) . '/test_data/authorization/bare-function.json';
		$originalFunction = json_decode( file_get_contents( $filePath ) );

		// Insert new function
		$functionPage = $this->zobjectStore->createNewZObject(
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
			'Logged-out user not is authorized to edit the type of an unattached function'
		);
		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$user,
			$title
		);
		$this->assertTrue(
			$status->isValid(),
			'User is authorized to edit the type of an unattached function'
		);
		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$functioneer,
			$title
		);
		$this->assertTrue(
			$status->isValid(),
			'Functioneer is authorized to edit the type of an unattached function'
		);
		$status = $this->zobjectAuthorization->authorize(
			$oldContent,
			$newContent,
			$maintainer,
			$title
		);
		$this->assertTrue(
			$status->isValid(),
			'Maintainer is authorized to edit the type of an unattached function'
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
		$this->registerLangs( [ 'en','es' ] );

		// Get user
		// FIXME: different type of user to come in the test file
		$user = $this->getTestSysop()->getUser();

		// Try to update the already existing object
		$page = $this->zobjectStore->updateZObject(
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

		$diffDir = dirname( __DIR__, 1 ) . '/test_data/authorization/persisted/';
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
