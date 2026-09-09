<?php

/**
 * WikiLambda integration test for WikifunctionsFragmentStore service wiring
 *
 * This file covers the one piece that can only be exercised against
 * the real service container: that the service resolves to the
 * MainStash-backed WikifunctionsFragmentStore implementation.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ClientStorage;

use MediaWiki\Extension\WikiLambda\ClientStorage\MainStashWikifunctionsFragmentStore;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWikiIntegrationTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\WikiLambdaServices::buildWikifunctionsFragmentStore
 */
class WikifunctionsFragmentStoreWiringTest extends MediaWikiIntegrationTestCase {

	public function testResolvesToMainStashWikifunctionsFragmentStore(): void {
		$this->assertInstanceOf(
			MainStashWikifunctionsFragmentStore::class,
			WikiLambdaServices::getWikifunctionsFragmentStore()
		);
	}
}
