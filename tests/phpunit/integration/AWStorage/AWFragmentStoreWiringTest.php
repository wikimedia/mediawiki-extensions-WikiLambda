<?php

/**
 * WikiLambda integration test for AWFragmentStore service wiring
 *
 * This file covers the one piece that can only be exercised against
 * the real service container: that the service resolves to the
 * MainStash-backed AWFragmentStore implementation.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\AWStorage;

use MediaWiki\Extension\WikiLambda\AWStorage\MainStashAWFragmentStore;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWikiIntegrationTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\WikiLambdaServices::buildAWFragmentStore
 */
class AWFragmentStoreWiringTest extends MediaWikiIntegrationTestCase {

	public function testResolvesToMainStashAWFragmentStore(): void {
		$this->assertInstanceOf(
			MainStashAWFragmentStore::class,
			WikiLambdaServices::getAWFragmentStore()
		);
	}
}
