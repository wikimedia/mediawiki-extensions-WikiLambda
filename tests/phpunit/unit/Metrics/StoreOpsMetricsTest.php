<?php

/**
 * WikiLambda unit test suite for the StoreOpsMetrics class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Unit\Metrics;

use MediaWiki\Extension\WikiLambda\Metrics\StoreOpsMetrics;
use MediaWikiUnitTestCase;
use Wikimedia\Stats\StatsFactory;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Metrics\StoreOpsMetrics
 */
class StoreOpsMetricsTest extends MediaWikiUnitTestCase {

	public function testRecordOp_emitsCounterAndTimingWithExpectedLabels(): void {
		$statsHelper = StatsFactory::newUnitTestingHelper()->withComponent( 'WikiLambda' );
		$metrics = new StoreOpsMetrics( 'mainstash', $statsHelper->getStatsFactory() );

		$metrics->recordOp( 'aw_article', 'get', 'hit', hrtime( true ) );

		$this->assertSame(
			1,
			$statsHelper->count(
				'store_ops_total{store="aw_article",storage="mainstash",op="get",outcome="hit"}'
			)
		);
		$this->assertSame(
			1,
			$statsHelper->count(
				'store_op_seconds{store="aw_article",storage="mainstash",op="get"}'
			)
		);
	}

	public function testRecordOp_labelsShowDifferentOutcomes(): void {
		$statsHelper = StatsFactory::newUnitTestingHelper()->withComponent( 'WikiLambda' );
		$metrics = new StoreOpsMetrics( 'memcached', $statsHelper->getStatsFactory() );

		$metrics->recordOp( 'aw_fragment', 'set', 'success', hrtime( true ) );
		$metrics->recordOp( 'aw_fragment', 'set', 'failure', hrtime( true ) );

		$this->assertSame(
			1,
			$statsHelper->count( 'store_ops_total{op="set",outcome="success"}' )
		);
		$this->assertSame(
			1,
			$statsHelper->count( 'store_ops_total{op="set",outcome="failure"}' )
		);
	}

	public function testRecordFragmentStatus_emitsCounterWithExpectedLabels(): void {
		$statsHelper = StatsFactory::newUnitTestingHelper()->withComponent( 'WikiLambda' );
		$metrics = new StoreOpsMetrics( 'mainstash', $statsHelper->getStatsFactory() );

		$metrics->recordFragmentStatus( 'aw_fragment', 'fresh_ok' );

		$this->assertSame(
			1,
			$statsHelper->count(
				'aw_fragment_status_total{store="aw_fragment",storage="mainstash",status="fresh_ok"}'
			)
		);
	}

	public function testDefaultStatsFactoryIsNoOpAndDoesNotThrow(): void {
		$metrics = new StoreOpsMetrics( 'mainstash' );

		$metrics->recordOp( 'aw_article', 'get', 'hit', hrtime( true ) );
		$metrics->recordFragmentStatus( 'aw_fragment', 'missing' );

		$this->addToAssertionCount( 1 );
	}
}
