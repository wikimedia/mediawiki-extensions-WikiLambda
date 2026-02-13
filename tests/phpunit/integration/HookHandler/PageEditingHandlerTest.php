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
}
