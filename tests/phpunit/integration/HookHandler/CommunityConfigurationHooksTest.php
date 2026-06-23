<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\HookHandler;

use MediaWiki\Content\JsonContent;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaAbstractClientIntegrationTestCase;
use MediaWiki\Registration\ExtensionRegistry;

/**
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\CommunityConfigurationHooks
 * @group Database
 */
class CommunityConfigurationHooksTest extends WikiLambdaAbstractClientIntegrationTestCase {

	private const TITLE = 'MediaWiki:AbstractWikiOptedInArticles.json';

	protected function setUp(): void {
		parent::setUp();

		// CommunityConfiguration is required
		if ( !ExtensionRegistry::getInstance()->isLoaded( 'CommunityConfiguration' ) ) {
			$this->markTestSkipped( 'CommunityConfiguration extension is not loaded' );
		}
		$this->setUpAsAbstractClientMode();
	}

	public function testLogOptinAction(): void {
		$user = $this->getTestUser()->getUser();

		$oldData = [ 'OptedInArticles' => [] ];
		$newData = [ 'OptedInArticles' => [ [ 'title' => [ 'Douglas Adams' ], 'qid' => 'Q42', ] ] ];

		// Store old version:
		$this->editPage( self::TITLE, new JsonContent( json_encode( $oldData ) ), '', NS_MAIN, $user );
		// Store updated version to get the diff:
		$this->editPage( self::TITLE, new JsonContent( json_encode( $newData ) ), '', NS_MAIN, $user );

		// Check the log
		$dbr = $this->getDb();
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'log_type', 'log_action', 'log_namespace', 'log_title', 'log_params' ] )
			->from( 'logging' )
			->where( [ 'log_type' => 'abstractwiki' ] )
			->fetchResultSet();

		// Only one entry logged
		$this->assertSame( 1, $rows->numRows() );

		$row = $rows->fetchObject();
		$this->assertSame( 'Douglas_Adams', $row->log_title );
		$this->assertSame( 'optin', $row->log_action );

		$params = unserialize( $row->log_params );
		$this->assertSame( 'Q42', $params['4::qid'] );
		$this->assertSame( '', $params['5::redirect'] );
	}

	public function testLogOptoutAction(): void {
		$user = $this->getTestUser()->getUser();

		// Initial setup
		$oldData = [ 'OptedInArticles' => [ [ 'title' => [ 'Douglas Adams' ], 'qid' => 'Q42' ] ] ];
		$this->editPage( self::TITLE, new JsonContent( json_encode( $oldData ) ), '', NS_MAIN, $user );

		$this->truncateTable( 'logging' );

		// Test edit
		$newData = [ 'OptedInArticles' => [] ];
		$this->editPage( self::TITLE, new JsonContent( json_encode( $newData ) ), '', NS_MAIN, $user );

		$rows = $this->getDb()->newSelectQueryBuilder()
			->select( [ 'log_type', 'log_action', 'log_namespace', 'log_title', 'log_params' ] )
			->from( 'logging' )
			->where( [ 'log_type' => 'abstractwiki' ] )
			->fetchResultSet();

		// Only one entry logged
		$this->assertSame( 1, $rows->numRows() );

		$row = $rows->fetchObject();
		$this->assertSame( 'Douglas_Adams', $row->log_title );
		$this->assertSame( 'optout', $row->log_action );

		$params = unserialize( $row->log_params );
		$this->assertSame( 'Q42', $params['4::qid'] );
	}

	public function testLogOptinAction_redirect(): void {
		$user = $this->getTestUser()->getUser();

		// Initial setup
		$oldData = [ 'OptedInArticles' => [ [ 'title' => [ 'Douglas Adams' ], 'qid' => 'Q42' ] ] ];
		$this->editPage( self::TITLE, new JsonContent( json_encode( $oldData ) ), '', NS_MAIN, $user );

		$this->truncateTable( 'logging' );

		// Test edit
		$newData = [ 'OptedInArticles' => [ [
			'title' => [ 'Douglas Adams', 'Douglas Noël Adams' ],
			'qid' => 'Q42'
		] ] ];
		$this->editPage( self::TITLE, new JsonContent( json_encode( $newData ) ), '', NS_MAIN, $user );

		$rows = $this->getDb()->newSelectQueryBuilder()
			->select( [ 'log_type', 'log_action', 'log_namespace', 'log_title', 'log_params' ] )
			->from( 'logging' )
			->where( [ 'log_type' => 'abstractwiki' ] )
			->fetchResultSet();

		// Only one entry logged
		$this->assertSame( 1, $rows->numRows() );

		$row = $rows->fetchObject();
		$this->assertSame( 'Douglas_Noël_Adams', $row->log_title );
		$this->assertSame( 'optin', $row->log_action );

		$params = unserialize( $row->log_params );
		$this->assertSame( 'Q42', $params['4::qid'] );
		$this->assertSame( 'Douglas Adams', $params['5::redirect'] );
	}
}
