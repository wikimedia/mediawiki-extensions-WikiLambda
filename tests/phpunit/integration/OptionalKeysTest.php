<?php

/**
 * WikiLambda integration test suite to check ZObject can be created
 * with optional keys.
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use Title;
use WikiPage;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjectFactory
 * @group Database
 */
class OptionalKeysTest extends \MediaWikiIntegrationTestCase {

	/** @var string[] */
	private $titlesTouched = [];

	/**
	 * This test proves that an on-wiki implementation can be made of a PHP-backed but non-built-in ZType.
	 *
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 */
	public function testInstanceOfTypeWithOptionalKeys() {
		// Create ZOptionalType (Z10101)
		$baseTypeTitleText = 'Z10101';
		$baseTypeContent = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": "Z10101",
	"Z2K2": {
		"Z1K1": "Z4",
		"Z4K1": "Z10101",
		"Z4K2": [
			{
				"Z1K1": "Z3",
				"Z3K1": "Z6",
				"Z3K2": "Z10101K1",
				"Z3K3": { "Z1K1": "Z12", "Z12K1": [] }
			},
			{
				"Z1K1": "Z3",
				"Z3K1": "Z6",
				"Z3K2": "Z10101K2",
				"Z3K3": { "Z1K1": "Z12", "Z12K1": [] }
			},
			{
				"Z1K1": "Z3",
				"Z3K1": "Z6",
				"Z3K2": "Z10101K3",
				"Z3K3": { "Z1K1": "Z12", "Z12K1": [] }
			}
		],
		"Z4K3": "Z0"
	},
	"Z2K3": { "Z1K1": "Z12", "Z12K1": [ { "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "ZOptions" } ] }
}
EOT;

		$baseTypeStatus = $this->editPage(
			$baseTypeTitleText, $baseTypeContent, 'Create ZOptions', NS_ZOBJECT
		);
		$this->titlesTouched[] = $baseTypeTitleText;
		$this->assertTrue(
			$baseTypeStatus->isOK(),
			'ZOptions creation was successful'
		);

		$baseTypeTitle = Title::newFromText( $baseTypeTitleText, NS_ZOBJECT );
		$this->assertTrue(
			$baseTypeTitle->exists(),
			'ZOptions page was created in the DB'
		);

		// Create a valid instance of ZOptions using only 1st key (Z10102)
		$instanceTitleText = 'Z10102';
		$instanceContent = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": "Z0",
	"Z2K2": {
		"Z1K1": "Z10101",
		"Z10101K2": "second key only"
	},
	"Z2K3": { "Z1K1": "Z12", "Z12K1": [] }
}
EOT;

		$instanceStatus = $this->editPage(
			$instanceTitleText, $instanceContent, 'Test ZOptions instance', NS_ZOBJECT
		);
		$this->titlesTouched[] = $instanceTitleText;
		$this->assertTrue(
			$instanceStatus->isOK(),
			'ZOptions instance creation was successful'
		);

		$instanceTitle = Title::newFromText( $instanceTitleText, NS_ZOBJECT );
		$this->assertTrue(
			$instanceTitle->exists(),
			'ZOptions instance page was created in the DB'
		);
		$this->assertTrue(
			$instanceTitle->getContentModel() === CONTENT_MODEL_ZOBJECT,
			'ZOptions instance comes back as the right content model'
		);
	}

	protected function tearDown() : void {
		// Cleanup the pages we touched.
		$sysopUser = $this->getTestSysop()->getUser();

		foreach ( $this->titlesTouched as $titleString ) {
			$title = Title::newFromText( $titleString, NS_ZOBJECT );
			$page = WikiPage::factory( $title );
			$page->doDeleteArticleReal( $title, $sysopUser );
		}

		parent::tearDown();
	}

}
