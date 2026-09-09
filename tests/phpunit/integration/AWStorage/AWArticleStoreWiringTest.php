<?php

/**
 * WikiLambda integration test for AWArticleStore service wiring
 *
 * The MainStashAWArticleStore class itself is covered by its unit tests
 * against HashBagOStuff. This file covers the one piece that can only be
 * exercised against the real service container: that the service resolves
 * to the MainStash-backed AWArticleStore implementation.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\AWStorage;

use MediaWiki\Extension\WikiLambda\AWStorage\MainStashAWArticleStore;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWikiIntegrationTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\WikiLambdaServices::buildAWArticleStore
 */
class AWArticleStoreWiringTest extends MediaWikiIntegrationTestCase {

	public function testResolvesToMainStashAWArticleStore(): void {
		$this->assertInstanceOf(
			MainStashAWArticleStore::class,
			WikiLambdaServices::getAWArticleStore()
		);
	}
}
