<?php
/**
 * WikiLambda observability helper for MainStash/Memcached-backed stores
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Metrics;

use Wikimedia\Stats\StatsFactory;

/**
 * Observability: emits read/write op and AW fragment status metrics for a single storage implementation
 * (e.g. MainStash or Memcached), shared by every WikiLambda store.
 * One instance is held per storage implementation; the calling store passes
 * its own 'store' label (e.g. 'aw_article', 'aw_fragment') per call.
 */
class StoreOpsMetrics {

	private readonly StatsFactory $statsFactory;

	/**
	 * @param string $storage Fixed storage label for this instance, e.g. 'mainstash' or 'memcached'
	 * @param ?StatsFactory $statsFactory
	 */
	public function __construct(
		private readonly string $storage,
		?StatsFactory $statsFactory = null
	) {
		$this->statsFactory = ( $statsFactory ?? StatsFactory::newNull() )->withComponent( 'WikiLambda' );
	}

	/**
	 * Records a store operation's outcome and latency.
	 *
	 * @param string $store Store name, e.g. 'aw_article', 'aw_fragment', 'client_functioncall'
	 * @param string $op One of 'get', 'set', 'delete'
	 * @param string $outcome One of 'hit', 'miss', 'success', 'failure', 'skipped'
	 * @param int $startTimeNs As returned by hrtime( true ) at the start of the operation
	 */
	public function recordOp( string $store, string $op, string $outcome, int $startTimeNs ): void {
		$this->statsFactory->getCounter( 'store_ops_total' )
			->setLabel( 'store', $store )
			->setLabel( 'storage', $this->storage )
			->setLabel( 'op', $op )
			->setLabel( 'outcome', $outcome )
			->increment();

		$this->statsFactory->getTiming( 'store_op_seconds' )
			->setLabel( 'store', $store )
			->setLabel( 'storage', $this->storage )
			->setLabel( 'op', $op )
			->observeNanoseconds( hrtime( true ) - $startTimeNs );
	}

	/**
	 * Records an AW fragment's hit/miss/recency/render-outcome status.
	 *
	 * @param string $store Store name, e.g. 'aw_fragment'
	 * @param string $status One of the AWFragment::STATUS_* literals
	 */
	public function recordFragmentStatus( string $store, string $status ): void {
		$this->statsFactory->getCounter( 'aw_fragment_status_total' )
			->setLabel( 'store', $store )
			->setLabel( 'storage', $this->storage )
			->setLabel( 'status', $status )
			->increment();
	}
}
