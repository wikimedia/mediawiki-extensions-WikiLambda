<?php

/**
 * WikiLambda integration test suite for hook handlers that affect page editing
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\HookHandler;

use MediaWiki\Config\HashConfig;
use MediaWiki\Content\TextContent;
use MediaWiki\Extension\WikiLambda\HookHandler\PageEditingHandler;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\RecentChanges\RecentChange;
use MediaWiki\Revision\RenderedRevision;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Revision\RevisionSlots;
use MediaWiki\Status\Status;
use MediaWiki\Title\Title;
use MediaWiki\User\User;
use Wikimedia\Rdbms\IConnectionProvider;
use Wikimedia\Rdbms\IReadableDatabase;
use Wikimedia\Rdbms\SelectQueryBuilder;

/**
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\PageEditingHandler
 * @group Database
 */
class PageEditingHandlerTest extends WikiLambdaIntegrationTestCase {

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

	public function testOnNamespaceIsMovable_mocked() {
		$pageEditingHandler = new PageEditingHandler(
			$this->mockHashConfigRepoMode,
			$this->mockICP,
			$this->createNoOpMock( ZObjectStore::class )
		);

		$result = true;
		$response = $pageEditingHandler->onNamespaceIsMovable( NS_MAIN, $result );
		$this->assertFalse( $response, 'Handler returns for main namespace movability when in repo mode' );
		$this->assertFalse( $result, 'Main namespace is set as unmovable when in repo mode' );

		$result = true;
		$response = $pageEditingHandler->onNamespaceIsMovable( NS_TALK, $result );
		$this->assertNull( $response, 'Handler does not return for talk namespace movability when in repo mode' );
		$this->assertTrue( $result, 'Talk namespace is set as unmovable when in repo mode' );

		$pageEditingHandlerRepoModeOff = new PageEditingHandler(
			$this->mockHashConfigNotRepoMode,
			$this->mockICP,
			$this->createNoOpMock( ZObjectStore::class )
		);

		$result = false;
		$response = $pageEditingHandlerRepoModeOff->onNamespaceIsMovable( NS_MAIN, $result );
		$this->assertNull( $response, 'Handler does not return for main namespace movability when not in repo mode' );
		$this->assertFalse( $result, 'Main namespace is not set as unmovable when not in repo mode' );

		$result = true;
		$response = $pageEditingHandlerRepoModeOff->onNamespaceIsMovable( NS_TALK, $result );
		$this->assertNull( $response, 'Handler does not return for talk namespace movability when not in repo mode' );
		$this->assertTrue( $result, 'Talk namespace is set as unmovable when not in repo mode' );
	}

	public function testOnNamespaceIsMovable_real() {
		$zObjectTitle = Title::newFromText( 'Z1' );
		$this->assertFalse( $zObjectTitle->isMovable() );

		$zObjectTalkTitle = Title::newFromText( 'Z1', NS_TALK );
		$this->assertTrue( $zObjectTalkTitle->isMovable() );
	}

	public function testOnMultiContentSave_real_otherNameSpace() {
		$invalidTitleText = 'This is a title';

		$invalidZIDStatus = $this->editPage(
			$invalidTitleText,
			ZTestType::TEST_ENCODING,
			'Test content',
			NS_PROJECT
		);

		$this->assertTrue( $invalidZIDStatus->isOK() );

		$invalidTitle = Title::newFromText( $invalidTitleText, NS_PROJECT );
		$this->assertTrue( $invalidTitle->exists() );
	}

	public function testOnMultiContentSave_real_badTitle() {
		$invalidTitleText = 'Bad page title';

		$invalidZIDStatus = $this->editPage(
			$invalidTitleText,
			ZTestType::TEST_ENCODING,
			'Test bad title',
			NS_MAIN
		);

		$this->assertFalse( $invalidZIDStatus->isOK() );
		$this->assertTrue( $invalidZIDStatus->hasMessage( 'wikilambda-invalidzobjecttitle' ) );

		$invalidTitle = Title::newFromText( $invalidTitleText, NS_MAIN );
		$this->assertFalse( $invalidTitle->exists() );
	}

	public function testOnMultiContentSave_real_badContent() {
		$invalidContent = '{"Z1K1": "Z3"}';

		$invalidZIDStatus = $this->editPage(
			ZTestType::TEST_ZID,
			$invalidContent,
			'Test bad content',
			NS_MAIN
		);

		$this->assertFalse( $invalidZIDStatus->isOK() );
		$this->assertTrue( $invalidZIDStatus->hasMessage( 'wikilambda-invalidzobject' ) );
	}

	public function testOnMultiContentSave_mocked_nonRepo() {
		$pageEditingHandlerRepoModeOff = new PageEditingHandler(
			$this->mockHashConfigNotRepoMode,
			$this->mockICP,
			$this->createNoOpMock( ZObjectStore::class )
		);

		$mockRenderedRevision = $this->createNoOpMock( RenderedRevision::class );

		$response = $pageEditingHandlerRepoModeOff->onMultiContentSave(
			$mockRenderedRevision, User::newFromName( 'Test user' ), '', 0, new Status()
		);
		$this->assertNull( $response, 'Handler returns null when not in repo mode' );
	}

	public function testOnMultiContentSave_mocked_repo() {
		$title = Title::newFromText( 'Z400', NS_MAIN );

		$mockRevisionSlots = $this->createMock( RevisionSlots::class );
		$mockRevisionSlots->method( 'getContent' )
			->willReturn( ZObjectContentHandler::makeContent( ZTestType::TEST_ENCODING, $title ) );

		$mockRevision = $this->createMock( RevisionRecord::class );
		$mockRevision->method( 'getPageAsLinkTarget' )->willReturn( $title );
		$mockRevision->method( 'getSlots' )->willReturn( $mockRevisionSlots );

		$mockRenderedRevision = $this->createMock( RenderedRevision::class );
		$mockRenderedRevision->method( 'getRevision' )->willReturn( $mockRevision );

		$mockZObjectStore = $this->createMock( ZObjectStore::class );
		$mockZObjectStore->method( 'findZObjectLabelConflicts' )->willReturn( [] );

		$pageEditingHandler = new PageEditingHandler(
			$this->mockHashConfigRepoMode,
			$this->mockICP,
			$mockZObjectStore
		);

		$response = $pageEditingHandler->onMultiContentSave(
			$mockRenderedRevision, User::newFromName( 'Test user' ), '', 0, new Status()
		);
		$this->assertTrue( $response, 'Handler allows the edit for ZObject when in repo mode' );
	}

	public function testOnMultiContentSave_mocked_unlabelled() {
		$title = Title::newFromText( 'Z400', NS_MAIN );

		$mockZObjectContent = $this->createMock( ZObjectContent::class );
		$mockZObjectContent->method( 'getLabels' )->willReturn( new ZMultilingualString( [] ) );
		$mockZObjectContent->method( 'isValid' )->willReturn( true );

		$mockRevisionSlotsNoLabels = $this->createMock( RevisionSlots::class );
		$mockRevisionSlotsNoLabels->method( 'getContent' )->willReturn( $mockZObjectContent );

		$mockRevisionNoLabels = $this->createMock( RevisionRecord::class );
		$mockRevisionNoLabels->method( 'getPageAsLinkTarget' )->willReturn( $title );
		$mockRevisionNoLabels->method( 'getSlots' )->willReturn( $mockRevisionSlotsNoLabels );

		$mockRenderedRevisionNoLabels = $this->createMock( RenderedRevision::class );
		$mockRenderedRevisionNoLabels->method( 'getRevision' )->willReturn( $mockRevisionNoLabels );

		$pageEditingHandlerNoLabels = new PageEditingHandler(
			$this->mockHashConfigRepoMode,
			$this->mockICP,
			$this->createNoOpMock( ZObjectStore::class )
		);

		$status = new Status();
		$response = $pageEditingHandlerNoLabels->onMultiContentSave(
			$mockRenderedRevisionNoLabels, User::newFromName( 'Test user' ), '', 0, $status
		);
		$this->assertTrue( $response, 'Handler allows the edit for an unlabelled ZObject' );
		$this->assertTrue(
			$status->isOK(), 'Handler has not adjusted the status in an edit for an unlabelled ZObject'
		);
	}

	public function testOnMultiContentSave_mocked_nonZObject() {
		$title = Title::newFromText( 'Z400', NS_MAIN );

		$mockRevisionSlots = $this->createMock( RevisionSlots::class );
		$mockRevisionSlots->method( 'getContent' )->willReturn( new TextContent( 'hello!' ) );

		$mockRevision = $this->createMock( RevisionRecord::class );
		$mockRevision->method( 'getPageAsLinkTarget' )->willReturn( $title );
		$mockRevision->method( 'getSlots' )->willReturn( $mockRevisionSlots );

		$mockRenderedRevision = $this->createMock( RenderedRevision::class );
		$mockRenderedRevision->method( 'getRevision' )->willReturn( $mockRevision );

		$pageEditingHandlerWithConflicts = new PageEditingHandler(
			$this->mockHashConfigRepoMode,
			$this->mockICP,
			$this->createNoOpMock( ZObjectStore::class )
		);

		$status = new Status();
		$response = $pageEditingHandlerWithConflicts->onMultiContentSave(
			$mockRenderedRevision, User::newFromName( 'Test user' ), '', 0, $status
		);
		$this->assertFalse( $response, 'Handler prevents the edit for a non-ZObject in the ZObject namespace' );
		$this->assertFalse(
			$status->isOK(), 'Handler has set the status correctly when a non-ZObject edit is attempted'
		);
		$statusMessageValue = $status->getMessages( 'error' )[0];
		$this->assertSame(
			'wikilambda-invalidcontenttype', $statusMessageValue->getKey(),
			'Handler has set the status error message correctly when a non-ZObject edit is attempted'
		);
	}

	public function testOnMultiContentSave_mocked_badZObject() {
		$title = Title::newFromText( 'Z400', NS_MAIN );

		$mockZObjectContent = $this->createMock( ZObjectContent::class );
		$mockZObjectContent->method( 'isValid' )->willReturn( false );

		$mockRevisionSlots = $this->createMock( RevisionSlots::class );
		$mockRevisionSlots->method( 'getContent' )->willReturn( $mockZObjectContent );

		$mockRevision = $this->createMock( RevisionRecord::class );
		$mockRevision->method( 'getPageAsLinkTarget' )->willReturn( $title );
		$mockRevision->method( 'getSlots' )->willReturn( $mockRevisionSlots );

		$mockRenderedRevision = $this->createMock( RenderedRevision::class );
		$mockRenderedRevision->method( 'getRevision' )->willReturn( $mockRevision );

		$pageEditingHandlerWithConflicts = new PageEditingHandler(
			$this->mockHashConfigRepoMode,
			$this->mockICP,
			$this->createNoOpMock( ZObjectStore::class )
		);

		$status = new Status();
		$response = $pageEditingHandlerWithConflicts->onMultiContentSave(
			$mockRenderedRevision, User::newFromName( 'Test user' ), '', 0, $status
		);
		$this->assertFalse( $response, 'Handler prevents the edit for a broken ZObject in the ZObject namespace' );
		$this->assertFalse(
			$status->isOK(), 'Handler has set the status correctly when a broken ZObject edit is attempted'
		);
		$statusMessageValue = $status->getMessages( 'error' )[0];
		$this->assertSame(
			'wikilambda-invalidzobject', $statusMessageValue->getKey(),
			'Handler has set the status error message correctly when a broken ZObject edit is attempted'
		);
	}

	public function testOnMultiContentSave_mocked_clashes() {
		$title = Title::newFromText( 'Z400', NS_MAIN );

		$mockRevisionSlots = $this->createMock( RevisionSlots::class );
		$mockRevisionSlots->method( 'getContent' )
			->willReturn( ZObjectContentHandler::makeContent( ZTestType::TEST_ENCODING, $title ) );

		$mockRevision = $this->createMock( RevisionRecord::class );
		$mockRevision->method( 'getPageAsLinkTarget' )->willReturn( $title );
		$mockRevision->method( 'getSlots' )->willReturn( $mockRevisionSlots );

		$mockRenderedRevision = $this->createMock( RenderedRevision::class );
		$mockRenderedRevision->method( 'getRevision' )->willReturn( $mockRevision );

		$mockZObjectStoreWithConflicts = $this->createMock( ZObjectStore::class );
		$mockZObjectStoreWithConflicts->method( 'findZObjectLabelConflicts' )->willReturn( [ 'hello' => 'world' ] );

		$pageEditingHandlerWithConflicts = new PageEditingHandler(
			$this->mockHashConfigRepoMode,
			$this->mockICP,
			$mockZObjectStoreWithConflicts
		);

		$status = new Status();
		$response = $pageEditingHandlerWithConflicts->onMultiContentSave(
			$mockRenderedRevision, User::newFromName( 'Test user' ), '', 0, $status
		);
		$this->assertFalse( $response, 'Handler prevents the edit for a ZObject when a label conflict occurs' );
		$this->assertFalse( $status->isOK(), 'Handler has set the status correctly when a label conflict occurs' );
		$statusMessageValue = $status->getMessages( 'error' )[0];
		$this->assertSame(
			'wikilambda-labelclash', $statusMessageValue->getKey(),
			'Handler has set the status error message correctly when a label conflict occurs'
		);
		$this->assertSame(
			[ 'text' => 'world' ], $statusMessageValue->getParams()[0]->toJsonArray(),
			'Handler has set the status error data correctly when a label conflict occurs'
		);
		$this->assertSame(
			[ 'text' => 'hello' ], $statusMessageValue->getParams()[1]->toJsonArray(),
			'Handler has set the status error data correctly when a label conflict occurs'
		);
	}

	public function testOnGetUserPermissionsErrors_mocked() {
		$pageEditingHandler = new PageEditingHandler(
			$this->mockHashConfigRepoMode,
			$this->mockICP,
			$this->createNoOpMock( ZObjectStore::class )
		);

		$zObjectTitle = Title::newFromText( 'Z400', NS_MAIN );
		$talkTitle = Title::newFromText( 'Z400', NS_TALK );

		$result = 'hello';
		$response = $pageEditingHandler->onGetUserPermissionsErrors(
			$zObjectTitle, User::newFromName( 'Test user' ), 'edit', $result
		);
		$this->assertTrue( $response, 'Handler allows an edit to a ZObject when in repo mode' );
		$this->assertSame( 'hello', $result, 'Response object is unchanged when editing a ZObject in repo mode' );

		$result = 'hello';
		$response = $pageEditingHandler->onGetUserPermissionsErrors(
			$talkTitle, User::newFromName( 'Test user' ), 'edit', $result
		);
		$this->assertNull( $response, 'Handler does not return for an edit to a non-ZObject when in repo mode' );
		$this->assertSame( 'hello', $result, 'Response object is unchanged when editing a non-ZObject in repo mode' );

		$result = 'hello';
		$response = $pageEditingHandler->onGetUserPermissionsErrors(
			$zObjectTitle, User::newFromName( 'Test user' ), 'create', $result
		);
		$this->assertTrue( $response, 'Handler allows a create of a ZObject when in repo mode' );
		$this->assertSame( 'hello', $result, 'Response object is unchanged when creating a ZObject in repo mode' );

		$result = 'hello';
		$response = $pageEditingHandler->onGetUserPermissionsErrors(
			$zObjectTitle, User::newFromName( 'Test user' ), 'julian', $result
		);
		$this->assertNull( $response, 'Handler does not return on an unknown action on a ZObject when in repo mode' );
		$this->assertSame(
			'hello', $result,
			'Response object is unchanged when doing an unknown action on a ZObject in repo mode'
		);

		$zObjectInvalidTitle = Title::newFromText( 'hello', NS_MAIN );
		$result = 'hello';
		$response = $pageEditingHandler->onGetUserPermissionsErrors(
			$zObjectInvalidTitle, User::newFromName( 'Test user' ), 'edit', $result
		);
		$this->assertFalse( $response, 'Handler returns to prevent an edit to an unallowed title ZObject' );
		$this->assertSame(
			'wikilambda-invalidzobjecttitle', $result->getKey(),
			'Response object is set correctly when editing aan unallowed title ZObject'
		);

		$pageEditingHandlerRepoModeOff = new PageEditingHandler(
			$this->mockHashConfigNotRepoMode,
			$this->mockICP,
			$this->createNoOpMock( ZObjectStore::class )
		);

		$result = 'hello';
		$response = $pageEditingHandlerRepoModeOff->onGetUserPermissionsErrors(
			$zObjectTitle, User::newFromName( 'Test user' ), 'edit', $result
		);
		$this->assertNull( $response, 'Handler does not return on an edit to a ZObject when in non-repo mode' );
		$this->assertSame( 'hello', $result, 'Response object is unchanged when editing a ZObject in non-repo mode' );

		$result = 'hello';
		$response = $pageEditingHandlerRepoModeOff->onGetUserPermissionsErrors(
			$talkTitle, User::newFromName( 'Test user' ), 'edit', $result
		);
		$this->assertNull( $response, 'Handler does not return on an edit to a non-ZObject when in non-repo mode' );
		$this->assertSame(
			'hello', $result,
			'Response object is unchanged when editing a non-ZObject in non-repo mode'
		);
	}

	public function testOnRecentChange_nonRepo_mocked() {
		$pageEditingHandlerRepoModeOff = new PageEditingHandler(
			$this->mockHashConfigNotRepoMode,
			$this->mockICP,
			$this->createNoOpMock( ZObjectStore::class )
		);

		$jobQueue = $this->getServiceContainer()->getJobQueueGroup()->get( 'wikifunctionsClientFanOutQueue' );
		$this->assertTrue( $jobQueue->isEmpty(), 'Queue begins empty' );

		$response = $pageEditingHandlerRepoModeOff->onRecentChange_save( new RecentChange() );

		$this->assertNull( $response, 'Handler returns null when not in repo mode' );
		$this->assertTrue( $jobQueue->isEmpty(), 'No fan-out jobs have been inserted' );
	}

	public function testOnRecentChange_editNonFunction_mocked() {
		$title = Title::newFromText( 'Z400', NS_MAIN );

		$mockZObjectStore = $this->createMock( ZObjectStore::class );
		$mockZObjectStore->method( 'fetchZObjectByTitle' )
			->willReturn( ZObjectContentHandler::makeContent( ZTestType::TEST_ENCODING, $title ) );

		$pageEditingHandler = new PageEditingHandler(
			$this->mockHashConfigRepoMode,
			$this->mockICP,
			$mockZObjectStore
		);

		$mockRecentChange = $this->createMock( RecentChange::class );
		$mockRecentChange->method( 'getPage' )->willReturn( $title );
		$mockRecentChange->method( 'getAttribute' )
			->willReturn( $this->returnCallback( __CLASS__ . '::mockRCAttribsEditCallback' ) );

		$jobQueue = $this->getServiceContainer()->getJobQueueGroup()->get( 'wikifunctionsClientFanOutQueue' );
		$this->assertTrue( $jobQueue->isEmpty(), 'Queue begins empty' );

		$response = $pageEditingHandler->onRecentChange_save( $mockRecentChange );

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

		$pageEditingHandler = new PageEditingHandler(
			$this->mockHashConfigRepoMode,
			$this->mockICP,
			$mockZObjectStore
		);

		$mockRecentChange = $this->createMock( RecentChange::class );
		$mockRecentChange->method( 'getPage' )->willReturn( $title );
		$mockRecentChange->method( 'getAttribute' )
			->willReturn( $this->returnCallback( __CLASS__ . '::mockRCAttribsCreationCallback' ) );

		$jobQueue = $this->getServiceContainer()->getJobQueueGroup()->get( 'wikifunctionsClientFanOutQueue' );
		$this->assertTrue( $jobQueue->isEmpty(), 'Queue begins empty' );

		$response = $pageEditingHandler->onRecentChange_save( $mockRecentChange );

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

		$pageEditingHandler = new PageEditingHandler(
			$this->mockHashConfigRepoMode,
			$this->mockICP,
			$mockZObjectStore
		);

		$mockRecentChange = $this->createMock( RecentChange::class );
		$mockRecentChange->method( 'getPage' )->willReturn( $title );
		$mockRecentChange->method( 'getAttribute' )
		->willReturn( $this->returnCallback( __CLASS__ . '::mockRCAttribsUndeletionCallback' ) );

		$jobQueue = $this->getServiceContainer()->getJobQueueGroup()->get( 'wikifunctionsClientFanOutQueue' );
		$this->assertTrue( $jobQueue->isEmpty(), 'Queue begins empty' );

		$response = $pageEditingHandler->onRecentChange_save( $mockRecentChange );

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

		$pageEditingHandler = new PageEditingHandler(
			$this->mockHashConfigRepoMode,
			$this->mockICP,
			$mockZObjectStore
		);

		$mockRecentChange = $this->createMock( RecentChange::class );
		$mockRecentChange->method( 'getPage' )->willReturn( $title );
		$mockRecentChange->method( 'getAttribute' )
		->willReturn( $this->returnCallback( __CLASS__ . '::mockRCAttribsRevDeletionCallback' ) );

		$jobQueue = $this->getServiceContainer()->getJobQueueGroup()->get( 'wikifunctionsClientFanOutQueue' );
		$this->assertTrue( $jobQueue->isEmpty(), 'Queue begins empty' );

		$response = $pageEditingHandler->onRecentChange_save( $mockRecentChange );

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

		$pageEditingHandler = new PageEditingHandler(
			$this->mockHashConfigRepoMode,
			$this->mockICP,
			$mockZObjectStore
		);

		$mockRecentChange = $this->createMock( RecentChange::class );
		$mockRecentChange->method( 'getPage' )->willReturn( $title );
		$mockRecentChange->method( 'getAttribute' )
			->willReturn( $this->returnCallback( __CLASS__ . '::mockRCAttribsLabelsOnlyEditCallback' ) );

		$jobQueue = $this->getServiceContainer()->getJobQueueGroup()->get( 'wikifunctionsClientFanOutQueue' );
		$this->assertTrue( $jobQueue->isEmpty(), 'Queue begins empty' );

		$response = $pageEditingHandler->onRecentChange_save( $mockRecentChange );

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

		$pageEditingHandler = new PageEditingHandler(
			$this->mockHashConfigRepoMode,
			$this->mockICP,
			$mockZObjectStore
		);

		$mockRecentChange = $this->createMock( RecentChange::class );
		$mockRecentChange->method( 'getPage' )->willReturn( $title );
		$mockRecentChange->method( 'getAttribute' )
			->willReturn( $this->returnCallback( __CLASS__ . '::mockRCAttribsEditCallback' ) );

		$jobQueue = $this->getServiceContainer()->getJobQueueGroup()->get( 'wikifunctionsClientFanOutQueue' );
		$this->assertTrue( $jobQueue->isEmpty(), 'Queue begins empty' );

		$response = $pageEditingHandler->onRecentChange_save( $mockRecentChange );

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

		$pageEditingHandler = new PageEditingHandler(
			$this->mockHashConfigRepoMode,
			$this->mockICP,
			$mockZObjectStore
		);

		$mockRecentChange = $this->createMock( RecentChange::class );
		$mockRecentChange->method( 'getPage' )->willReturn( $title );
		$mockRecentChange->method( 'getAttribute' )
			->willReturn( $this->returnCallback( __CLASS__ . '::mockRCAttribsDropImplementationEditCallback' ) );

		$jobQueue = $this->getServiceContainer()->getJobQueueGroup()->get( 'wikifunctionsClientFanOutQueue' );
		$this->assertTrue( $jobQueue->isEmpty(), 'Queue begins empty' );

		$response = $pageEditingHandler->onRecentChange_save( $mockRecentChange );

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

		$pageEditingHandler = new PageEditingHandler(
			$this->mockHashConfigRepoMode,
			$this->mockICP,
			$mockZObjectStore
		);

		$mockRecentChange = $this->createMock( RecentChange::class );
		$mockRecentChange->method( 'getPage' )->willReturn( $title );
		$mockRecentChange->method( 'getAttribute' )
			->willReturn( $this->returnCallback( __CLASS__ . '::mockRCAttribsSwapTesterEditCallback' ) );

		$jobQueue = $this->getServiceContainer()->getJobQueueGroup()->get( 'wikifunctionsClientFanOutQueue' );
		$this->assertTrue( $jobQueue->isEmpty(), 'Queue begins empty' );

		$response = $pageEditingHandler->onRecentChange_save( $mockRecentChange );

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
