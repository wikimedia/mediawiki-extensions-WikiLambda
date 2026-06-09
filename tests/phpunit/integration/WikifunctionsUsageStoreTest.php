<?php

/**
 * WikiLambda integration test suite for WikifunctionsUsageStore.
 *
 * Exercises the shared cross-wiki `wikifunctions_usage` table (the GlobalUsage-style
 * record of which pages on which wikis use which Functions). Requires the table to have
 * been installed during PHPUnit bootstrap — which in CI/docker happens because
 * LocalSettings.php enables client or repo mode before `onLoadExtensionSchemaUpdates`
 * runs. If you see "no such table wikifunctions_usage" locally, enable client or repo
 * mode in your dev config.
 *
 * In tests the 'virtual-wikifunctions-usage' virtual domain maps to the wiki's own
 * database (db => false), so no real x1 cluster is needed; wiki IDs are therefore just
 * opaque strings here and are not validated against WikiMap.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\WikifunctionsUsageStore;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;

/**
 * @covers \MediaWiki\Extension\WikiLambda\WikifunctionsUsageStore
 *
 * @group Database
 */
class WikifunctionsUsageStoreTest extends WikiLambdaClientIntegrationTestCase {

	private WikifunctionsUsageStore $store;

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsClientMode();
		$this->store = WikiLambdaServices::getWikifunctionsUsageStore();
	}

	public function testInsertUsage_storesAndReturnsTheRow() {
		$this->store->insertUsage( 'Z10001', 'enwiki', 42, NS_TEMPLATE, 'Template', 'Greeting' );

		$this->assertSame(
			[
				[
					'wiki' => 'enwiki',
					'pageId' => 42,
					'namespaceId' => NS_TEMPLATE,
					'namespaceText' => 'Template',
					'title' => 'Greeting',
				],
			],
			$this->store->fetchUsage( 'Z10001' )
		);
	}

	public function testInsertUsage_mainNamespaceStoresNullNamespaceText() {
		$this->store->insertUsage( 'Z10002', 'enwiki', 7, NS_MAIN, null, 'Pythagoras' );

		$usage = $this->store->fetchUsage( 'Z10002' );

		$this->assertSame( NS_MAIN, $usage[0]['namespaceId'] );
		$this->assertNull(
			$usage[0]['namespaceText'],
			'The main namespace stores a null namespace text, not an empty string'
		);
	}

	public function testInsertUsage_isIdempotentOnFunctionWikiPage() {
		$this->store->insertUsage( 'Z10003', 'enwiki', 99, NS_MAIN, null, 'Alpha' );
		$this->store->insertUsage( 'Z10003', 'enwiki', 99, NS_MAIN, null, 'Alpha' );

		$this->assertCount(
			1,
			$this->store->fetchUsage( 'Z10003' ),
			'Re-recording the same usage must not duplicate the row'
		);
		$this->assertSame( 1, $this->store->countUsage( 'Z10003' ) );
	}

	public function testInsertUsage_refreshesTitleOnInNamespaceRename() {
		// A rename within the same namespace keeps the (function, wiki_id, page_id) primary
		// key, so the title is refreshed in place rather than duplicated.
		$this->store->insertUsage( 'Z10004', 'enwiki', 55, NS_TEMPLATE, 'Template', 'Foo' );
		$this->store->insertUsage( 'Z10004', 'enwiki', 55, NS_TEMPLATE, 'Template', 'Foo bar' );

		$usage = $this->store->fetchUsage( 'Z10004' );

		$this->assertCount( 1, $usage, 'An in-namespace rename updates the existing row rather than adding one' );
		$this->assertSame( NS_TEMPLATE, $usage[0]['namespaceId'] );
		$this->assertSame( 'Foo bar', $usage[0]['title'] );
	}

	public function testInsertUsage_namespaceMoveNeedsDeleteToAvoidStaleRow() {
		// The namespace is part of the row's identity (it is encoded in wfu_wiki_id), so a
		// cross-namespace move is modelled as delete-then-reinsert; the write path clears the
		// page's old rows first. deleteUsageForPage() spans every namespace for the page.
		$this->store->insertUsage( 'Z10010', 'enwiki', 60, NS_USER, 'User', 'Foo' );
		$this->store->deleteUsageForPage( 'enwiki', 60 );
		$this->store->insertUsage( 'Z10010', 'enwiki', 60, NS_TEMPLATE, 'Template', 'Foo bar' );

		$usage = $this->store->fetchUsage( 'Z10010' );

		$this->assertCount( 1, $usage, 'The pre-move delete leaves only the new namespace row' );
		$this->assertSame( NS_TEMPLATE, $usage[0]['namespaceId'] );
		$this->assertSame( 'Template', $usage[0]['namespaceText'] );
		$this->assertSame( 'Foo bar', $usage[0]['title'] );
	}

	public function testFetchUsage_ordersByWikiThenPageId() {
		$this->store->insertUsage( 'Z10005', 'enwiki', 9, NS_MAIN, null, 'Nine' );
		$this->store->insertUsage( 'Z10005', 'dewiki', 5, NS_MAIN, null, 'Fünf' );
		$this->store->insertUsage( 'Z10005', 'enwiki', 2, NS_MAIN, null, 'Two' );

		$wikiAndPage = array_map(
			static fn ( array $row ): array => [ $row['wiki'], $row['pageId'] ],
			$this->store->fetchUsage( 'Z10005' )
		);

		$this->assertSame(
			[ [ 'dewiki', 5 ], [ 'enwiki', 2 ], [ 'enwiki', 9 ] ],
			$wikiAndPage
		);
	}

	public function testFetchUsage_filtersByNamespace() {
		$this->store->insertUsage( 'Z10006', 'enwiki', 1, NS_MAIN, null, 'Article' );
		$this->store->insertUsage( 'Z10006', 'enwiki', 2, NS_TEMPLATE, 'Template', 'Tpl' );

		$templates = $this->store->fetchUsage( 'Z10006', NS_TEMPLATE );

		$this->assertCount( 1, $templates );
		$this->assertSame( 'Tpl', $templates[0]['title'] );
		$this->assertSame( 2, $this->store->countUsage( 'Z10006' ) );
		$this->assertSame( 1, $this->store->countUsage( 'Z10006', NS_TEMPLATE ) );
	}

	public function testFetchUsage_returnsEmptyWhenNoRows() {
		$this->assertSame( [], $this->store->fetchUsage( 'Z99999' ) );
		$this->assertSame( 0, $this->store->countUsage( 'Z99999' ) );
	}

	public function testDeleteUsageForPage_removesEveryFunctionForThatPage() {
		$this->store->insertUsage( 'Z10007', 'enwiki', 30, NS_MAIN, null, 'Multi' );
		$this->store->insertUsage( 'Z10008', 'enwiki', 30, NS_MAIN, null, 'Multi' );

		$this->store->deleteUsageForPage( 'enwiki', 30 );

		$this->assertSame( [], $this->store->fetchUsage( 'Z10007' ) );
		$this->assertSame( [], $this->store->fetchUsage( 'Z10008' ) );
	}

	public function testDeleteUsageForPage_isScopedToTheGivenWiki() {
		// The same page_id on two different wikis must not collide.
		$this->store->insertUsage( 'Z10009', 'enwiki', 12, NS_MAIN, null, 'Same id' );
		$this->store->insertUsage( 'Z10009', 'dewiki', 12, NS_MAIN, null, 'Gleiche id' );

		$this->store->deleteUsageForPage( 'enwiki', 12 );

		$remaining = $this->store->fetchUsage( 'Z10009' );
		$this->assertCount( 1, $remaining );
		$this->assertSame( 'dewiki', $remaining[0]['wiki'] );
	}
}
