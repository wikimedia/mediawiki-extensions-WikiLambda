<?php

/**
 * WikiLambda integration test suite for hook handlers that affect page editing
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\HookHandler;

use MediaWiki\Config\HashConfig;
use MediaWiki\Extension\WikiLambda\HookHandler\PagePostSaveHandler;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\RecentChanges\RecentChange;
use MediaWiki\Title\Title;
use Wikimedia\Rdbms\IConnectionProvider;
use Wikimedia\Rdbms\IReadableDatabase;
use Wikimedia\Rdbms\SelectQueryBuilder;

/**
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\PagePostSaveHandler
 * @group Database
 */
class PagePostSaveHandlerTest extends WikiLambdaIntegrationTestCase {

	/**
	 * Mock HashConfig saying that WikiLambdaEnableRepoMode is true
	 */
	private object $mockHashConfigRepoMode;

	/**
	 * Mock HashConfig saying that WikiLambdaEnableRepoMode is false
	 */
	private object $mockHashConfigNotRepoMode;

	private IReadableDatabase $mockDBr;
	private IConnectionProvider $mockICP;

	protected function setUp(): void {
		parent::setUp();

		$this->mockHashConfigRepoMode = $this->createMock( HashConfig::class );
		$this->mockHashConfigRepoMode->method( 'get' )->willReturnMap( [
			[ 'WikiLambdaEnableRepoMode', true ],
			[ 'WikiLambdaEnableAbstractMode', false ],
		] );

		$this->mockHashConfigNotRepoMode = $this->createMock( HashConfig::class );
		$this->mockHashConfigNotRepoMode->method( 'get' )->willReturnMap( [
			[ 'WikiLambdaEnableRepoMode', false ],
			[ 'WikiLambdaEnableAbstractMode', false ],
		] );

		$mockSQB = $this->createMock( SelectQueryBuilder::class );
		$mockSQB->method( 'select' )->willReturnSelf();
		$mockSQB->method( 'from' )->willReturnSelf();
		$mockSQB->method( 'where' )->willReturnSelf();
		$mockSQB->method( 'join' )->willReturnSelf();
		$mockSQB->method( 'caller' )->willReturnSelf();
		$mockSQB->method( 'fetchField' )->willReturn( 'This is not actually being fetched from the DB.' );

		$this->mockDBr = $this->createMock( IReadableDatabase::class );
		$this->mockDBr->method( 'newSelectQueryBuilder' )->willReturn( $mockSQB );

		$this->mockICP = $this->createMock( IConnectionProvider::class );
		$this->mockICP->method( 'getReplicaDatabase' )->willReturn( $this->mockDBr );
	}

	public function testOnRecentChange_nonRepo_mocked() {
		$pagePostSaveHandlerRepoModeOff = new PagePostSaveHandler(
			$this->mockICP,
			$this->mockHashConfigNotRepoMode,
			$this->createNoOpMock( ZObjectStore::class )
		);

		$jobQueue = $this->getServiceContainer()->getJobQueueGroup()->get( 'wikifunctionsClientFanOutQueue' );
		$this->assertTrue( $jobQueue->isEmpty(), 'Queue begins empty' );

		$response = $pagePostSaveHandlerRepoModeOff->onRecentChange_save( new RecentChange() );

		$this->assertNull( $response, 'Handler returns null when not in repo mode' );
		$this->assertTrue( $jobQueue->isEmpty(), 'No fan-out jobs have been inserted' );
	}

	public function testOnRecentChange_editNonFunction_mocked() {
		$title = Title::newFromText( 'Z400', NS_MAIN );

		$mockZObjectStore = $this->createMock( ZObjectStore::class );
		$mockZObjectStore->method( 'fetchZObjectByTitle' )
			->willReturn( ZObjectContentHandler::makeContent( ZTestType::TEST_ENCODING, $title ) );

		$pagePostSaveHandler = new PagePostSaveHandler(
			$this->mockICP,
			$this->mockHashConfigRepoMode,
			$mockZObjectStore
		);

		$mockRecentChange = $this->createMock( RecentChange::class );
		$mockRecentChange->method( 'getPage' )->willReturn( $title );
		$mockRecentChange->method( 'getAttribute' )
			->willReturn( $this->returnCallback( __CLASS__ . '::mockRCAttribsEditCallback' ) );

		$jobQueue = $this->getServiceContainer()->getJobQueueGroup()->get( 'wikifunctionsClientFanOutQueue' );
		$this->assertTrue( $jobQueue->isEmpty(), 'Queue begins empty' );

		$response = $pagePostSaveHandler->onRecentChange_save( $mockRecentChange );

		$this->assertNull( $response, 'Handler does not care about the edit for a non-Function ZObject' );
		$this->assertTrue( $jobQueue->isEmpty(), 'No fan-out jobs have been inserted' );
	}

	public function testOnRecentChange_createFunction_mocked() {
		// Create the raw Types we're using here, to make ZObjectFactory happy
		$this->insertZids( [ 'Z8', 'Z11', 'Z12', 'Z14', 'Z17', 'Z20' ] );

		$title = Title::newFromText( 'Z400', NS_MAIN );

		$mockZObjectStore = $this->createMock( ZObjectStore::class );
		$mockZObjectStore->method( 'fetchZObjectByTitle' )->willReturn(
			$this->returnCallback( __CLASS__ . '::mockFetchZObjectByTitle' )
		);

		$pagePostSaveHandler = new PagePostSaveHandler(
			$this->mockICP,
			$this->mockHashConfigRepoMode,
			$mockZObjectStore
		);

		$mockRecentChange = $this->createMock( RecentChange::class );
		$mockRecentChange->method( 'getPage' )->willReturn( $title );
		$mockRecentChange->method( 'getAttribute' )
			->willReturn( $this->returnCallback( __CLASS__ . '::mockRCAttribsCreationCallback' ) );

		$jobQueue = $this->getServiceContainer()->getJobQueueGroup()->get( 'wikifunctionsClientFanOutQueue' );
		$this->assertTrue( $jobQueue->isEmpty(), 'Queue begins empty' );

		$response = $pagePostSaveHandler->onRecentChange_save( $mockRecentChange );

		$this->assertTrue( $response, 'Handler does care about the creation for a Function ZObject' );
		// FIXME: The job is getting created, but it's getting processed before we reach this point
		// $this->assertSame( 1, $jobQueue->getSize(), 'A fan-out job was inserted' );
	}

	public function testOnRecentChange_undeletionFunction_mocked() {
		// Create the raw Types we're using here, to make ZObjectFactory happy
		$this->insertZids( [ 'Z8', 'Z11', 'Z12', 'Z14', 'Z17', 'Z20' ] );

		$title = Title::newFromText( 'Z400', NS_MAIN );

		$mockZObjectStore = $this->createMock( ZObjectStore::class );
		$mockZObjectStore->method( 'fetchZObjectByTitle' )->willReturn(
			$this->returnCallback( __CLASS__ . '::mockFetchZObjectByTitle' )
		);

		$pagePostSaveHandler = new PagePostSaveHandler(
			$this->mockICP,
			$this->mockHashConfigRepoMode,
			$mockZObjectStore
		);

		$mockRecentChange = $this->createMock( RecentChange::class );
		$mockRecentChange->method( 'getPage' )->willReturn( $title );
		$mockRecentChange->method( 'getAttribute' )
		->willReturn( $this->returnCallback( __CLASS__ . '::mockRCAttribsUndeletionCallback' ) );

		$jobQueue = $this->getServiceContainer()->getJobQueueGroup()->get( 'wikifunctionsClientFanOutQueue' );
		$this->assertTrue( $jobQueue->isEmpty(), 'Queue begins empty' );

		$response = $pagePostSaveHandler->onRecentChange_save( $mockRecentChange );

		$this->assertTrue( $response, 'Handler does care about the undeletion of a Function ZObject' );
		// FIXME: The job is getting created, but it's getting processed before we reach this point
		// $this->assertSame( 1, $jobQueue->getSize(), 'A fan-out job was inserted' );
	}

	public function testOnRecentChange_revDeletionFunction_mocked() {
		// Create the raw Types we're using here, to make ZObjectFactory happy
		$this->insertZids( [ 'Z8', 'Z11', 'Z12', 'Z14', 'Z17', 'Z20' ] );

		$title = Title::newFromText( 'Z400', NS_MAIN );

		$mockZObjectStore = $this->createMock( ZObjectStore::class );
		$mockZObjectStore->method( 'fetchZObjectByTitle' )->willReturn(
			$this->returnCallback( __CLASS__ . '::mockFetchZObjectByTitle' )
		);

		$pagePostSaveHandler = new PagePostSaveHandler(
			$this->mockICP,
			$this->mockHashConfigRepoMode,
			$mockZObjectStore
		);

		$mockRecentChange = $this->createMock( RecentChange::class );
		$mockRecentChange->method( 'getPage' )->willReturn( $title );
		$mockRecentChange->method( 'getAttribute' )
		->willReturn( $this->returnCallback( __CLASS__ . '::mockRCAttribsRevDeletionCallback' ) );

		$jobQueue = $this->getServiceContainer()->getJobQueueGroup()->get( 'wikifunctionsClientFanOutQueue' );
		$this->assertTrue( $jobQueue->isEmpty(), 'Queue begins empty' );

		$response = $pagePostSaveHandler->onRecentChange_save( $mockRecentChange );

		$this->assertNull( $response, 'Handler does not care about the revision deletion of a Function ZObject' );
		$this->assertTrue( $jobQueue->isEmpty(), 'No fan-out jobs have been inserted' );
	}

	public function testOnRecentChange_editFunctionLabels_mocked() {
		// Create the raw Types we're using here, to make ZObjectFactory happy
		$this->insertZids( [ 'Z8', 'Z11', 'Z12', 'Z14', 'Z17', 'Z20' ] );

		$title = Title::newFromText( 'Z400', NS_MAIN );

		$mockZObjectStore = $this->createMock( ZObjectStore::class );
		$mockZObjectStore->method( 'fetchZObjectByTitle' )->willReturn(
			$this->returnCallback( __CLASS__ . '::mockFetchZObjectByTitle' )
		);

		$pagePostSaveHandler = new PagePostSaveHandler(
			$this->mockICP,
			$this->mockHashConfigRepoMode,
			$mockZObjectStore
		);

		$mockRecentChange = $this->createMock( RecentChange::class );
		$mockRecentChange->method( 'getPage' )->willReturn( $title );
		$mockRecentChange->method( 'getAttribute' )
			->willReturn( $this->returnCallback( __CLASS__ . '::mockRCAttribsLabelsOnlyEditCallback' ) );

		$jobQueue = $this->getServiceContainer()->getJobQueueGroup()->get( 'wikifunctionsClientFanOutQueue' );
		$this->assertTrue( $jobQueue->isEmpty(), 'Queue begins empty' );

		$response = $pagePostSaveHandler->onRecentChange_save( $mockRecentChange );

		$this->assertNull( $response, 'Handler does not care about a label-only edit for a Function ZObject' );
		$this->assertTrue( $jobQueue->isEmpty(), 'No fan-out jobs have been inserted' );
	}

	public function testOnRecentChange_editFunction_mocked() {
		// Create the raw Types we're using here, to make ZObjectFactory happy
		$this->insertZids( [ 'Z8', 'Z11', 'Z12', 'Z14', 'Z17', 'Z20', 'Z548' ] );

		$title = Title::newFromText( 'Z400', NS_MAIN );

		$mockZObjectStore = $this->createMock( ZObjectStore::class );
		$mockZObjectStore->method( 'fetchZObjectByTitle' )->willReturn(
			$this->returnCallback( __CLASS__ . '::mockFetchZObjectByTitle' )
		);

		$pagePostSaveHandler = new PagePostSaveHandler(
			$this->mockICP,
			$this->mockHashConfigRepoMode,
			$mockZObjectStore
		);

		$mockRecentChange = $this->createMock( RecentChange::class );
		$mockRecentChange->method( 'getPage' )->willReturn( $title );
		$mockRecentChange->method( 'getAttribute' )
			->willReturn( $this->returnCallback( __CLASS__ . '::mockRCAttribsEditCallback' ) );

		$jobQueue = $this->getServiceContainer()->getJobQueueGroup()->get( 'wikifunctionsClientFanOutQueue' );
		$this->assertTrue( $jobQueue->isEmpty(), 'Queue begins empty' );

		$response = $pagePostSaveHandler->onRecentChange_save( $mockRecentChange );

		$this->assertTrue( $response, 'Handler does care about a non-label edit to a Function ZObject' );
		// FIXME: The job is getting created, but it's getting processed before we reach this point
		// $this->assertSame( 1, $jobQueue->getSize(), 'A fan-out job was inserted' );
	}

	public function testOnRecentChange_editFunctionDrop_mocked() {
		// Create the raw Types we're using here, to make ZObjectFactory happy
		$this->insertZids( [ 'Z8', 'Z11', 'Z12', 'Z14', 'Z17', 'Z20' ] );

		$title = Title::newFromText( 'Z400', NS_MAIN );

		$mockZObjectStore = $this->createMock( ZObjectStore::class );
		$mockZObjectStore->method( 'fetchZObjectByTitle' )->willReturn(
			$this->returnCallback( __CLASS__ . '::mockFetchZObjectByTitle' )
		);

		$pagePostSaveHandler = new PagePostSaveHandler(
			$this->mockICP,
			$this->mockHashConfigRepoMode,
			$mockZObjectStore
		);

		$mockRecentChange = $this->createMock( RecentChange::class );
		$mockRecentChange->method( 'getPage' )->willReturn( $title );
		$mockRecentChange->method( 'getAttribute' )
			->willReturn( $this->returnCallback( __CLASS__ . '::mockRCAttribsDropImplementationEditCallback' ) );

		$jobQueue = $this->getServiceContainer()->getJobQueueGroup()->get( 'wikifunctionsClientFanOutQueue' );
		$this->assertTrue( $jobQueue->isEmpty(), 'Queue begins empty' );

		$response = $pagePostSaveHandler->onRecentChange_save( $mockRecentChange );

		$this->assertTrue( $response, 'Handler does care about dropping an Implementation from a Function ZObject' );
		// FIXME: The job is getting created, but it's getting processed before we reach this point
		// $this->assertSame( 1, $jobQueue->getSize(), 'A fan-out job was inserted' );
	}

	public function testOnRecentChange_editFunctionSwap_mocked() {
		// Create the raw Types we're using here, to make ZObjectFactory happy
		$this->insertZids( [ 'Z8', 'Z11', 'Z12', 'Z14', 'Z17', 'Z20' ] );

		$title = Title::newFromText( 'Z400', NS_MAIN );

		$mockZObjectStore = $this->createMock( ZObjectStore::class );
		$mockZObjectStore->method( 'fetchZObjectByTitle' )->willReturn(
			$this->returnCallback( __CLASS__ . '::mockFetchZObjectByTitle' )
		);

		$pagePostSaveHandler = new PagePostSaveHandler(
			$this->mockICP,
			$this->mockHashConfigRepoMode,
			$mockZObjectStore
		);

		$mockRecentChange = $this->createMock( RecentChange::class );
		$mockRecentChange->method( 'getPage' )->willReturn( $title );
		$mockRecentChange->method( 'getAttribute' )
			->willReturn( $this->returnCallback( __CLASS__ . '::mockRCAttribsSwapTesterEditCallback' ) );

		$jobQueue = $this->getServiceContainer()->getJobQueueGroup()->get( 'wikifunctionsClientFanOutQueue' );
		$this->assertTrue( $jobQueue->isEmpty(), 'Queue begins empty' );

		$response = $pagePostSaveHandler->onRecentChange_save( $mockRecentChange );

		$this->assertTrue( $response, 'Handler does care about swapping a Tester in a Function ZObject' );
		// FIXME: The job is getting created, but it's getting processed before we reach this point
		// $this->assertSame( 1, $jobQueue->getSize(), 'A fan-out job was inserted' );
	}

	// Remaining RC test cases – edit to an implementation, edit to a tester.

	// phpcs:disable Generic.Files.LineLength.TooLong
	public static function mockFetchZObjectByTitle( $title, $revision ) {
		switch ( $revision ) {
			// A Function with no labels and no connected Implementations or Testers
			case 123:
				return ZObjectContentHandler::makeContent(
					'{ "Z1K1": "Z2", "Z2K1": "Z0", "Z2K2": { "Z1K1": "Z8", '
						. '"Z8K1": [ "Z17", { "Z1K1": "Z17", "Z17K1": "Z6", "Z17K2": "Z0K1", "Z17K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } } ], '
						. '"Z8K2": "Z6", "Z8K3": [ "Z20" ], "Z8K4": [ "Z14" ], "Z8K5": "Z0" }, '
						. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] }, '
						. '"Z2K4": { "Z1K1": "Z32", "Z32K1": [ "Z31" ] }, '
						. '"Z2K5": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }',
					$title
				);
			// A Function with no labels and one connected Implementation
			case 1234:
				return ZObjectContentHandler::makeContent(
					'{ "Z1K1": "Z2", "Z2K1": "Z0", "Z2K2": { "Z1K1": "Z8", '
						. '"Z8K1": [ "Z17", { "Z1K1": "Z17", "Z17K1": "Z6", "Z17K2": "Z0K1", "Z17K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } } ], '
						. '"Z8K2": "Z6", "Z8K3": [ "Z20" ], "Z8K4": [ "Z14", "Z402" ], "Z8K5": "Z0" }, '
						. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] }, '
						. '"Z2K4": { "Z1K1": "Z32", "Z32K1": [ "Z31" ] }, '
						. '"Z2K5": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }',
					$title
				);
			// A Function with no labels, one connected Implementation, and one connected Tester
			case 12345:
				return ZObjectContentHandler::makeContent(
					'{ "Z1K1": "Z2", "Z2K1": "Z0", "Z2K2": { "Z1K1": "Z8", '
						. '"Z8K1": [ "Z17", { "Z1K1": "Z17", "Z17K1": "Z6", "Z17K2": "Z0K1", "Z17K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } } ], '
						. '"Z8K2": "Z6", "Z8K3": [ "Z20", "Z401" ], "Z8K4": [ "Z14", "Z402" ], "Z8K5": "Z0" }, '
						. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] }, '
						. '"Z2K4": { "Z1K1": "Z32", "Z32K1": [ "Z31" ] }, '
						. '"Z2K5": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }',
					$title
				);
			// A Function with labels, aliases, and descriptions in English, one connected Implementation, and one connected Tester
			case 123456:
				return ZObjectContentHandler::makeContent(
					'{ "Z1K1": "Z2", "Z2K1": "Z0", "Z2K2": { "Z1K1": "Z8", '
						. '"Z8K1": [ "Z17", { "Z1K1": "Z17", "Z17K1": "Z6", "Z17K2": "Z0K1", "Z17K3": { "Z1K1": "Z12", "Z12K1": [ "Z11", { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "Input" } ] } } ], '
						. '"Z8K2": "Z6", "Z8K3": [ "Z20", "Z401" ], "Z8K4": [ "Z14", "Z402" ], "Z8K5": "Z0" }, '
						. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11", { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "Function" } ] }, '
						. '"Z2K4": { "Z1K1": "Z32", "Z32K1": [ "Z31", { "Z1K1": "Z31", "Z31K1": "Z1002", "Z31K2": [ "Z6", "Alias name" ] } ] }, '
						. '"Z2K5": { "Z1K1": "Z12", "Z12K1": [ "Z11", { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "This is a Function" } ] } }',
					$title
				);
			// A Function with labels, aliases, and descriptions in English, no connected Implementations, and one connected Tester
			case 1234567:
				return ZObjectContentHandler::makeContent(
					'{ "Z1K1": "Z2", "Z2K1": "Z0", "Z2K2": { "Z1K1": "Z8", '
						. '"Z8K1": [ "Z17", { "Z1K1": "Z17", "Z17K1": "Z6", "Z17K2": "Z0K1", "Z17K3": { "Z1K1": "Z12", "Z12K1": [ "Z11", { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "Input" } ] } } ], '
						. '"Z8K2": "Z6", "Z8K3": [ "Z20", "Z401" ], "Z8K4": [ "Z14" ], "Z8K5": "Z0" }, '
						. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11", { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "Function" } ] }, '
						. '"Z2K4": { "Z1K1": "Z32", "Z32K1": [ "Z31", { "Z1K1": "Z31", "Z31K1": "Z1002", "Z31K2": [ "Z6", "Alias name" ] } ] }, '
						. '"Z2K5": { "Z1K1": "Z12", "Z12K1": [ "Z11", { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "This is a Function" } ] } }',
					$title
				);
			// A Function with labels, aliases, and descriptions in English, no connected Implementations, and a changed connected Tester
			case 12345678:
				return ZObjectContentHandler::makeContent(
					'{ "Z1K1": "Z2", "Z2K1": "Z0", "Z2K2": { "Z1K1": "Z8", '
						. '"Z8K1": [ "Z17", { "Z1K1": "Z17", "Z17K1": "Z6", "Z17K2": "Z0K1", "Z17K3": { "Z1K1": "Z12", "Z12K1": [ "Z11", { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "Input" } ] } } ], '
						. '"Z8K2": "Z6", "Z8K3": [ "Z20", "Z403" ], "Z8K4": [ "Z14" ], "Z8K5": "Z0" }, '
						. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11", { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "Function" } ] }, '
						. '"Z2K4": { "Z1K1": "Z32", "Z32K1": [ "Z31", { "Z1K1": "Z31", "Z31K1": "Z1002", "Z31K2": [ "Z6", "Alias name" ] } ] }, '
						. '"Z2K5": { "Z1K1": "Z12", "Z12K1": [ "Z11", { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "This is a Function" } ] } }',
					$title
				);
			default:
				return null;
		}
	}

	// phpcs:enable Generic.Files.LineLength.TooLong

	public static function mockRCAttribsCreationCallback( $attrib ) {
		switch ( $attrib ) {
			case 'rc_log_type':
				return null;
			case 'rc_last_oldid':
				return null;
			case 'rc_this_oldid':
				return 12345;
			case 'rc_timestamp':
				return 20250301000000;
			case 'rc_comment_text':
				return 'Creating a new Function';
			case 'rc_bot':
				return false;
			default:
				return null;
		}
	}

	public static function mockRCAttribsUndeletionCallback( $attrib ) {
		switch ( $attrib ) {
			case 'rc_log_type':
				return 'delete';
			case 'rc_log_action':
				return 'restore';
			case 'rc_last_oldid':
				return null;
			case 'rc_this_oldid':
				return 12345;
			case 'rc_timestamp':
				return 20250301000000;
			case 'rc_comment_text':
				return 'Restoring as it is useful';
			case 'rc_bot':
				return false;
			default:
				return null;
		}
	}

	public static function mockRCAttribsRevDeletionCallback( $attrib ) {
		switch ( $attrib ) {
			case 'rc_log_type':
				return 'delete';
			case 'rc_log_action':
				return 'revisiondelete';
			case 'rc_last_oldid':
				return null;
			case 'rc_this_oldid':
				return 12345;
			case 'rc_timestamp':
				return 20250301000000;
			case 'rc_comment_text':
				return 'Hiding naughty content';
			case 'rc_bot':
				return false;
			default:
				return null;
		}
	}

	public static function mockRCAttribsEditCallback( $attrib ) {
		switch ( $attrib ) {
			case 'rc_log_type':
				return null;
			case 'rc_last_oldid':
				return 123;
			case 'rc_this_oldid':
				return 12345;
			case 'rc_timestamp':
				return 20250301000000;
			case 'rc_comment_text':
				return 'Adding a label in French';
			case 'rc_bot':
				return false;
			default:
				return null;
		}
	}

	public static function mockRCAttribsLabelsOnlyEditCallback( $attrib ) {
		switch ( $attrib ) {
			case 'rc_log_type':
				return null;
			case 'rc_last_oldid':
				return 12345;
			case 'rc_this_oldid':
				return 123456;
			case 'rc_timestamp':
				return 20250301000000;
			case 'rc_comment_text':
				return 'Adding a label in French';
			case 'rc_bot':
				return false;
			default:
				return null;
		}
	}

	public static function mockRCAttribsDropImplementationEditCallback( $attrib ) {
		switch ( $attrib ) {
			case 'rc_log_type':
				return null;
			case 'rc_last_oldid':
				return 123456;
			case 'rc_this_oldid':
				return 1234567;
			case 'rc_timestamp':
				return 20250301000000;
			case 'rc_comment_text':
				return 'Drop bad Implementation';
			case 'rc_bot':
				return false;
			default:
				return null;
		}
	}

	public static function mockRCAttribsSwapTesterEditCallback( $attrib ) {
		switch ( $attrib ) {
			case 'rc_log_type':
				return null;
			case 'rc_last_oldid':
				return 1234567;
			case 'rc_this_oldid':
				return 12345678;
			case 'rc_timestamp':
				return 20250301000000;
			case 'rc_comment_text':
				return 'Swap out bad Tester for good one';
			case 'rc_bot':
				return false;
			default:
				return null;
		}
	}

}
