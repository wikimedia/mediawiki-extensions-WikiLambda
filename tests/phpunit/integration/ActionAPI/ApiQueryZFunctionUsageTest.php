<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI;

use MediaWiki\Api\ApiUsageException;
use MediaWiki\Extension\WikiLambda\ActionAPI\ApiQueryZFunctionUsage;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\ApiQueryZFunctionUsage
 * @group Database
 * @group API
 */
class ApiQueryZFunctionUsageTest extends WikiLambdaApiTestCase {

	private const TARGET = 'Z801';

	/**
	 * Create the target Function's page. The module reads the query's page set, so the
	 * page has to exist; seeding a builtin needs its own dependencies seeded first.
	 */
	private function seedTargetFunction(): void {
		$this->insertBuiltinObjects( [ 'Z11', 'Z12', 'Z17', 'Z31', 'Z32', self::TARGET ] );
	}

	/**
	 * Ask for the usage of a page, and return just this module's part of the response.
	 *
	 * @param string $title
	 * @return array|null The usage counts, or null if the module said nothing about the page
	 */
	private function fetchUsage( string $title ): ?array {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'prop' => 'wikilambdafn_usage',
			'titles' => $title,
		] );

		$pages = $result[0]['query']['pages'] ?? [];
		$page = reset( $pages );
		return $page['wikilambdafn_usage'] ?? null;
	}

	public function testUsage_reportsBothCounts() {
		$this->seedTargetFunction();

		$store = WikiLambdaServices::getWikifunctionsUsageStore();
		// Two pages on one wiki, in different namespaces, plus one on another wiki: three
		// pages from two wikis.
		$store->insertUsage( self::TARGET, 'enwiki', 1, NS_MAIN, null, 'Article' );
		$store->insertUsage( self::TARGET, 'enwiki', 2, NS_TEMPLATE, 'Template', 'Tpl' );
		$store->insertUsage( self::TARGET, 'dewiki', 3, NS_MAIN, null, 'Artikel' );

		$this->assertSame(
			[ 'pages' => 3, 'wikis' => 2, 'pagesLimited' => false ],
			$this->fetchUsage( self::TARGET )
		);
	}

	public function testUsage_reportsZeroesForAnUnusedFunction() {
		$this->seedTargetFunction();

		$this->assertSame(
			[ 'pages' => 0, 'wikis' => 0, 'pagesLimited' => false ],
			$this->fetchUsage( self::TARGET )
		);
	}

	public function testUsage_keysEachAnswerToItsOwnPage() {
		// The module answers over the query's page set, so several Functions at once must
		// each get their own counts rather than sharing one answer.
		$this->insertBuiltinObjects( [ 'Z11', 'Z12', 'Z17', 'Z31', 'Z32', 'Z801', 'Z802' ] );

		$store = WikiLambdaServices::getWikifunctionsUsageStore();
		$store->insertUsage( 'Z801', 'enwiki', 1, NS_MAIN, null, 'One' );
		$store->insertUsage( 'Z802', 'enwiki', 2, NS_MAIN, null, 'Two' );
		$store->insertUsage( 'Z802', 'dewiki', 3, NS_MAIN, null, 'Drei' );

		$result = $this->doApiRequest( [
			'action' => 'query',
			'prop' => 'wikilambdafn_usage',
			'titles' => 'Z801|Z802',
		] );

		$byTitle = [];
		foreach ( $result[0]['query']['pages'] as $page ) {
			$byTitle[ $page['title'] ] = $page['wikilambdafn_usage'];
		}

		$this->assertSame( [ 'pages' => 1, 'wikis' => 1, 'pagesLimited' => false ], $byTitle['Z801'] );
		$this->assertSame( [ 'pages' => 2, 'wikis' => 2, 'pagesLimited' => false ], $byTitle['Z802'] );
	}

	public function testUsage_saysNothingAboutANonZObjectPage() {
		$this->editPage( 'Project:Sandbox', 'Hello', '', NS_PROJECT );

		$this->assertNull(
			$this->fetchUsage( 'Project:Sandbox' ),
			'A page that is not a ZObject gets no usage property at all'
		);
	}

	public function testUsage_refusesTooManyTargetsAtOnce() {
		// Each answer costs a scan on the shared cluster, so the module does not inherit the
		// page set's allowance for users with apihighlimits.
		// The limit is checked over the whole page set, before the ZObject filter, so these
		// need not be ZObjects — which is just as well, as NS_MAIN here only takes those.
		$titles = [];
		for ( $i = 0; $i <= ApiQueryZFunctionUsage::MAX_REQUESTED_ZIDS; $i++ ) {
			$title = "Project:Page $i";
			$this->editPage( $title, 'Content', '', NS_PROJECT );
			$titles[] = $title;
		}

		$this->expectException( ApiUsageException::class );
		$this->expectExceptionMessage( 'which is too many at once' );
		$this->doApiRequest( [
			'action' => 'query',
			'prop' => 'wikilambdafn_usage',
			'titles' => implode( '|', $titles ),
		] );
	}

	public function testUsage_isRejectedOutsideRepoMode() {
		$this->seedTargetFunction();

		// Only the repo may read the shared usage table.
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', false );

		$this->expectException( ApiUsageException::class );
		$this->expectExceptionMessage( 'This API is not available except on the main \'repo\' wiki' );
		$this->fetchUsage( self::TARGET );
	}
}
