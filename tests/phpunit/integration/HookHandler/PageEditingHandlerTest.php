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

/**
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\PageEditingHandler
 * @group Database
 */
class PageEditingHandlerTest extends WikiLambdaIntegrationTestCase {

	public function testOnNamespaceIsMovable_mocked() {
		$mockHashConfigRepoMode = $this->createMock( HashConfig::class );
		$mockHashConfigRepoMode->method( 'get' )->with( 'WikiLambdaEnableRepoMode' )->willReturn( true );

		$pageEditingHandler = new PageEditingHandler(
			$mockHashConfigRepoMode,
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

		$mockHashConfigNotRepoMode = $this->createMock( HashConfig::class );
		$mockHashConfigNotRepoMode->method( 'get' )->with( 'WikiLambdaEnableRepoMode' )->willReturn( false );

		$pageEditingHandlerRepoModeOff = new PageEditingHandler(
			$mockHashConfigNotRepoMode,
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
		$mockHashConfigNotRepoMode = $this->createMock( HashConfig::class );
		$mockHashConfigNotRepoMode->method( 'get' )->with( 'WikiLambdaEnableRepoMode' )->willReturn( false );

		$pageEditingHandlerRepoModeOff = new PageEditingHandler(
			$mockHashConfigNotRepoMode,
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

		$mockHashConfigRepoMode = $this->createMock( HashConfig::class );
		$mockHashConfigRepoMode->method( 'get' )->with( 'WikiLambdaEnableRepoMode' )->willReturn( true );

		$mockZObjectStore = $this->createMock( ZObjectStore::class );
		$mockZObjectStore->method( 'findZObjectLabelConflicts' )->willReturn( [] );

		$pageEditingHandler = new PageEditingHandler(
			$mockHashConfigRepoMode,
			$mockZObjectStore
		);

		$response = $pageEditingHandler->onMultiContentSave(
			$mockRenderedRevision, User::newFromName( 'Test user' ), '', 0, new Status()
		);
		$this->assertTrue( $response, 'Handler allows the edit for ZObject when in repo mode' );
	}

	public function testOnMultiContentSave_mocked_unlabelled() {
		$title = Title::newFromText( 'Z400', NS_MAIN );

		$mockHashConfigRepoMode = $this->createMock( HashConfig::class );
		$mockHashConfigRepoMode->method( 'get' )->with( 'WikiLambdaEnableRepoMode' )->willReturn( true );

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
			$mockHashConfigRepoMode,
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

		$mockHashConfigRepoMode = $this->createMock( HashConfig::class );
		$mockHashConfigRepoMode->method( 'get' )->with( 'WikiLambdaEnableRepoMode' )->willReturn( true );

		$pageEditingHandlerWithConflicts = new PageEditingHandler(
			$mockHashConfigRepoMode,
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

		$mockHashConfigRepoMode = $this->createMock( HashConfig::class );
		$mockHashConfigRepoMode->method( 'get' )->with( 'WikiLambdaEnableRepoMode' )->willReturn( true );

		$pageEditingHandlerWithConflicts = new PageEditingHandler(
			$mockHashConfigRepoMode,
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

		$mockHashConfigRepoMode = $this->createMock( HashConfig::class );
		$mockHashConfigRepoMode->method( 'get' )->with( 'WikiLambdaEnableRepoMode' )->willReturn( true );

		$mockZObjectStoreWithConflicts = $this->createMock( ZObjectStore::class );
		$mockZObjectStoreWithConflicts->method( 'findZObjectLabelConflicts' )->willReturn( [ 'hello' => 'world' ] );

		$pageEditingHandlerWithConflicts = new PageEditingHandler(
			$mockHashConfigRepoMode,
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
		$mockHashConfigRepoMode = $this->createMock( HashConfig::class );
		$mockHashConfigRepoMode->method( 'get' )->with( 'WikiLambdaEnableRepoMode' )->willReturn( true );

		$pageEditingHandler = new PageEditingHandler(
			$mockHashConfigRepoMode,
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

		$mockHashConfigNotRepoMode = $this->createMock( HashConfig::class );
		$mockHashConfigNotRepoMode->method( 'get' )->with( 'WikiLambdaEnableRepoMode' )->willReturn( false );

		$pageEditingHandlerRepoModeOff = new PageEditingHandler(
			$mockHashConfigNotRepoMode,
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
