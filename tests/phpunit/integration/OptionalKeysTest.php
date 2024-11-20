<?php

/**
 * WikiLambda integration test suite to check ZObject can be created
 * with optional keys.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory
 * @group Database
 */
class OptionalKeysTest extends WikiLambdaIntegrationTestCase {

	/**
	 * This test proves that an on-wiki implementation can be made of a PHP-backed but non-built-in ZType.
	 */
	public function testInstanceOfTypeWithOptionalKeys() {
		// Create ZOptionalType (Z10101)
		$baseTypeTitleText = 'Z10101';
		$baseTypeContent = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z10101" },
	"Z2K2": {
		"Z1K1": "Z4",
		"Z4K1": "Z10101",
		"Z4K2": [
			"Z3",
			{
				"Z1K1": "Z3",
				"Z3K1": "Z6",
				"Z3K2": "Z10101K1",
				"Z3K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] }
			},
			{
				"Z1K1": "Z3",
				"Z3K1": "Z6",
				"Z3K2": "Z10101K2",
				"Z3K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] }
			},
			{
				"Z1K1": "Z3",
				"Z3K1": "Z6",
				"Z3K2": "Z10101K3",
				"Z3K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] }
			}
		],
		"Z4K3": "Z10102"
	},
	"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11", { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "ZOptions" } ] },
	"Z2K4": { "Z1K1": "Z32", "Z32K1": [ "Z31", { "Z1K1": "Z31", "Z31K1": "Z1002", "Z31K2": [ "Z6", "Options!" ] } ] }
}
EOT;

		$baseTypeStatus = $this->editPage(
			$baseTypeTitleText, $baseTypeContent, 'Create ZOptions', NS_MAIN
		);
		$this->assertTrue(
			$baseTypeStatus->isOK(),
			'ZOptions creation was successful'
		);

		$baseTypeTitle = Title::newFromText( $baseTypeTitleText, NS_MAIN );
		$this->assertTrue(
			$baseTypeTitle->exists(),
			'ZOptions page was created in the DB'
		);

		// Create a valid instance of ZOptions using only 1st key (Z10102)
		$instanceTitleText = 'Z10102';
		$instanceContent = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },
	"Z2K2": {
		"Z1K1": "Z10101",
		"Z10101K2": "second key only"
	},
	"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] },
	"Z2K4": { "Z1K1": "Z32", "Z32K1": [ "Z31"] }
}
EOT;

		$instanceStatus = $this->editPage(
			$instanceTitleText, $instanceContent, 'Test ZOptions instance', NS_MAIN
		);
		$this->assertTrue(
			$instanceStatus->isOK(),
			'ZOptions instance creation was successful'
		);

		$instanceTitle = Title::newFromText( $instanceTitleText, NS_MAIN );
		$this->assertTrue(
			$instanceTitle->exists(),
			'ZOptions instance page was created in the DB'
		);
		$this->assertTrue(
			$instanceTitle->getContentModel() === CONTENT_MODEL_ZOBJECT,
			'ZOptions instance comes back as the right content model'
		);
	}
}
