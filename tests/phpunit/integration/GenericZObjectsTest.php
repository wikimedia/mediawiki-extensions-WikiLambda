<?php

/**
 * WikiLambda integration test suite for generic ZObjects' re-use of in-built
 * and bespoke ZTypes.
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZTypeRegistry;
use Revision;
use Title;
use WikiPage;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZObjectContent
 * @group Database
 */
class GenericZObjectsTest extends \MediaWikiIntegrationTestCase {

	/** @var string[] */
	private $titlesTouched = [];

	/**
	 * This test proves that an on-wiki implementation can be made of a PHP-backed, built-in ZType.
	 *
	 * @coversNothing
	 */
	public function testInstanceOfZString() {
		$instanceTitleText = 'Z90';
		$instanceContent = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": "Z0",
	"Z2K2": {
		"Z1K1": "Z6",
		"Z6K1": "Tést content!"
	},
	"Z2K3": { "Z1K1": "Z12", "Z12K1": [] }
}
EOT;

		$instanceStatus = $this->editPage(
			$instanceTitleText, $instanceContent, 'Test ZString instance', NS_ZOBJECT
		);
		$this->titlesTouched[] = $instanceTitleText;
		$this->assertTrue( $instanceStatus->isOK() );
		$instanceTitle = Title::newFromText( $instanceTitleText, NS_ZOBJECT );
		$this->assertTrue( $instanceTitle->exists() );
		$this->assertTrue( $instanceTitle->getContentModel() === CONTENT_MODEL_ZOBJECT );

		// Test content is correct.
		$instanceWikiPage = WikiPage::factory( $instanceTitle );
		$instance = $instanceWikiPage->getContent( Revision::RAW );
		$this->assertTrue( $instance instanceof ZObjectContent );
		$this->assertTrue( $instance->isValid() );

		// Because ZString is built-in type, it gets special native treatment, unlike a DB-provided type, so this is a
		// ZString and not a ZObject unlike the 'normal' code path.
		$innerObject = $instance->getInnerZObject();
		$this->assertTrue( $innerObject->isValid() );

		$value = $innerObject->getZValue();
		$this->assertEquals( "Tést content!", $value );
	}

	/**
	 * This test proves that an on-wiki implementation can be made of a PHP-backed but non-built-in ZType.
	 *
	 * @coversNothing
	 */
	public function testInstanceOfZTestType() {
		// Create ZTestType (Z111)
		$baseTypeTitleText = ZTestType::TEST_ZID;
		$baseTypeStatus = $this->editPage(
			$baseTypeTitleText, ZTestType::TEST_ENCODING, 'Create ZTestType', NS_ZOBJECT
		);
		$this->titlesTouched[] = $baseTypeTitleText;
		$this->assertTrue( $baseTypeStatus->isOK() );
		$baseTypeTitle = Title::newFromText( $baseTypeTitleText, NS_ZOBJECT );
		$this->assertTrue( $baseTypeTitle->exists() );

		$registry = ZTypeRegistry::singleton();
		$this->assertTrue(
			$registry->isZObjectKeyKnown( ZTestType::TEST_ZID ),
			'ZTestType now known to ZTypeRegistry'
		);
		$this->assertSame(
			$registry->getZObjectTypeFromKey( ZTestType::TEST_ZID ),
			'Demonstration type',
			'ZTestType name known to ZTypeRegistry'
		);

		// Create a valid instance of ZTestType (Z112)
		$instanceTitleText = 'Z112';
		$instanceContent = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": "Z0",
	"Z2K2": {
		"Z1K1": "Z111",
		"Z111K1": "Tést",
		"Z111K2": "content!"
	},
	"Z2K3": { "Z1K1": "Z12", "Z12K1": [] }
}
EOT;

		$instanceStatus = $this->editPage(
			$instanceTitleText, $instanceContent, 'Test ZTestType instance', NS_ZOBJECT
		);
		$this->titlesTouched[] = $instanceTitleText;
		$this->assertTrue( $instanceStatus->isOK() );
		$instanceTitle = Title::newFromText( $instanceTitleText, NS_ZOBJECT );
		$this->assertTrue( $instanceTitle->exists() );
		$this->assertTrue( $instanceTitle->getContentModel() === CONTENT_MODEL_ZOBJECT );

		// Test content is correct.
		$instanceWikiPage = WikiPage::factory( $instanceTitle );
		$instance = $instanceWikiPage->getContent( Revision::RAW );
		$this->assertTrue( $instance instanceof ZObjectContent );
		$this->assertTrue( $instance->isValid() );

		// Though ZTestType is a PHP-provided type, it's not marked as built-in, so it falls back to a ZObject
		// like a DB-provided type would
		$innerObject = $instance->getInnerZObject();
		$this->assertTrue( $innerObject->isValid() );

		$value = $innerObject->getZValue();
		$this->assertCount( 3, $value );
		$this->assertArrayHasKey( 'Z1K1', $value );
		$this->assertEquals( 'Z111', $value[ 'Z1K1' ] );
		$this->assertArrayHasKey( 'Z111K1', $value );
		$this->assertEquals( 'Tést', $value[ 'Z111K1' ] );
		$this->assertArrayHasKey( 'Z111K2', $value );
		$this->assertEquals( 'content!', $value[ 'Z111K2' ] );

		// Create an invalid instance of ZTestType (Z113)
		$invalidInstanceTitleText = 'Z113';
		$invalidInstanceContent = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": "Z0",
	"Z2K2": {
		"Z1K1": "Z111",
		"Z111K1": { "Z1K1": "Z10", "Z10K1": "Invalid", "Z10K2": [ "content", "is", "invalid!" ] },
		"Z111K2": "Valid content!"
	},
	"Z2K3": { "Z1K1": "Z12", "Z12K1": [] }
}
EOT;

		$invalidInstanceStatus = $this->editPage(
			$invalidInstanceTitleText, $invalidInstanceContent, 'Invalid instance of ZTestType', NS_ZOBJECT
		);
		$this->titlesTouched[] = $invalidInstanceTitleText; // Just for safety; this should create.
		$this->assertFalse( $invalidInstanceStatus->isOK() );
		$invalidInstanceTitle = Title::newFromText( $invalidInstanceTitleText, NS_ZOBJECT );
		$this->assertFalse( $invalidInstanceTitle->exists() );
	}

	/**
	 * This test proves that no PHP backing is needed to create an on-wiki  ZType and an on-wiki implementation of it.
	 *
	 * NOTE: Fundamentally this is still based on ZString; we don't have a mechanism to define a type in other terms.
	 *
	 * @coversNothing
	 */
	public function testInstanceOfBespokeNonGeneric() {
		// Create ZInteger (Z91)
		$baseTypeTitleText = 'Z91';
		$baseTypeContent = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": "Z0",
	"Z2K2": {
		"Z1K1": "Z4",
		"Z4K1": "Z91",
		"Z4K2": [
			{
				"Z1K1": "Z3",
				"Z3K1": "Z6",
				"Z3K2": "Z91K1",
				"Z3K3": { "Z1K1": "Z12", "Z12K1": [] }
			}
		],
		"Z4K3": "Z0"
	},
	"Z2K3": { "Z1K1": "Z12", "Z12K1": [ { "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "ZInteger" } ] }
}
EOT;

		$baseTypeStatus = $this->editPage(
			$baseTypeTitleText, $baseTypeContent, 'Create ZInteger', NS_ZOBJECT
		);
		$this->titlesTouched[] = $baseTypeTitleText;
		$this->assertTrue(
			$baseTypeStatus->isOK(),
			'ZInteger creation was successful'
		);

		$baseTypeTitle = Title::newFromText( $baseTypeTitleText, NS_ZOBJECT );
		$this->assertTrue(
			$baseTypeTitle->exists(),
			'ZInteger page was created in the DB'
		);

		$registry = ZTypeRegistry::singleton();
		$this->assertTrue(
			$registry->isZObjectKeyKnown( 'Z91' ),
			'ZInteger now known to ZTypeRegistry'
		);
		$this->assertSame(
			$registry->getZObjectTypeFromKey( 'Z91' ),
			'ZInteger',
			'ZInteger name known to ZTypeRegistry'
		);

		// Create a valid instance of ZInteger (Z92)
		$instanceTitleText = 'Z92';
		$instanceContent = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": "Z0",
	"Z2K2": {
		"Z1K1": "Z91",
		"Z91K1": "6"
	},
	"Z2K3": { "Z1K1": "Z12", "Z12K1": [] }
}
EOT;

		$instanceStatus = $this->editPage(
			$instanceTitleText, $instanceContent, 'Test ZInteger instance', NS_ZOBJECT
		);
		$this->titlesTouched[] = $instanceTitleText;
		$this->assertTrue(
			$instanceStatus->isOK(),
			'ZInteger instance creation was successful'
		);

		$instanceTitle = Title::newFromText( $instanceTitleText, NS_ZOBJECT );
		$this->assertTrue(
			$instanceTitle->exists(),
			'ZInteger instance page was created in the DB'
		);
		$this->assertTrue(
			$instanceTitle->getContentModel() === CONTENT_MODEL_ZOBJECT,
			'ZInteger instance comes back as the right content model'
		);

		// Test content is correct.
		$instanceWikiPage = WikiPage::factory( $instanceTitle );
		$instance = $instanceWikiPage->getContent( Revision::RAW );
		$this->assertTrue(
			$instance instanceof ZObjectContent,
			'ZInteger instance comes back as the right content class'
		);
		$this->assertTrue(
			$instance->isValid(), 'ZInteger instance comes back as a valid ZPO'
		);

		$innerObject = $instance->getInnerZObject();
		$this->assertTrue( $innerObject->isValid(), 'ZInteger instance inner object comes back as a valid ZObject' );

		$value = $innerObject->getZValue();
		$this->assertCount( 2, $value, 'ZInteger instance inner object has the right number of keys' );
		$this->assertArrayHasKey( 'Z1K1', $value, 'ZInteger instance inner object has the type key' );
		$this->assertEquals( 'Z91', $value[ 'Z1K1' ], 'ZInteger instance inner object has the right type key' );
		$this->assertArrayHasKey( 'Z91K1', $value, 'ZInteger instance inner object has the value key' );
		$this->assertSame( '6', $value[ 'Z91K1' ], 'ZInteger instance inner object has the right value key' );
	}

	/**
	 * This test proves that a self-referencing ZType and an on-wiki implementation of it can be created.
	 *
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 */
	public function testInstanceOfSelfReferencingType() {
		// Create ZSelfRefType (Z991)
		$baseTypeTitleText = 'Z991';
		$baseTypeContent = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": "Z0",
	"Z2K2": {
		"Z1K1": "Z4",
		"Z4K1": "Z991",
		"Z4K2": [
			{
				"Z1K1": "Z3",
				"Z3K1": "Z991",
				"Z3K2": "Z991K1",
				"Z3K3": { "Z1K1": "Z12", "Z12K1": [] }
			}
		],
		"Z4K3": "Z0"
	},
	"Z2K3": { "Z1K1": "Z12", "Z12K1": [ { "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "ZSelfRefType" } ] }
}
EOT;

		$baseTypeStatus = $this->editPage(
			$baseTypeTitleText, $baseTypeContent, 'Create ZSelfRefType', NS_ZOBJECT
		);
		$this->titlesTouched[] = $baseTypeTitleText;
		$this->assertTrue(
			$baseTypeStatus->isOK(),
			'ZSelfRefType creation was successful'
		);

		$baseTypeTitle = Title::newFromText( $baseTypeTitleText, NS_ZOBJECT );
		$this->assertTrue(
			$baseTypeTitle->exists(),
			'ZSelfRefType page was created in the DB'
		);

		$registry = ZTypeRegistry::singleton();
		$this->assertTrue(
			$registry->isZObjectKeyKnown( 'Z991' ),
			'ZSelfRefType now known to ZTypeRegistry'
		);

		// Create a valid instance of ZSelfRefType (Z992)
		$instanceTitleText = 'Z992';
		$instanceContent = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": "Z0",
	"Z2K2": {
		"Z1K1": "Z991",
		"Z991K1": "Z992"
	},
	"Z2K3": { "Z1K1": "Z12", "Z12K1": [] }
}
EOT;

		$instanceStatus = $this->editPage(
			$instanceTitleText, $instanceContent, 'Test ZSelfRefType instance', NS_ZOBJECT
		);
		$this->titlesTouched[] = $instanceTitleText;
		$this->assertTrue(
			$instanceStatus->isOK(),
			'ZSelfRefType instance creation was successful'
		);

		$instanceTitle = Title::newFromText( $instanceTitleText, NS_ZOBJECT );
		$this->assertTrue(
			$instanceTitle->exists(),
			'ZSelfRefType instance page was created in the DB'
		);

		// Test content is correct.
		$instanceWikiPage = WikiPage::factory( $instanceTitle );
		$instance = $instanceWikiPage->getContent( Revision::RAW );
		$this->assertTrue(
			$instance instanceof ZObjectContent,
			'ZSelfRefType instance comes back as the right content class'
		);
		$this->assertTrue(
			$instance->isValid(), 'ZSelfRefType instance comes back as a valid ZPO'
		);

		$innerObject = $instance->getInnerZObject();
		$this->assertTrue(
			$innerObject->isValid(),
			'ZSelfRefType instance inner object comes back as a valid ZObject'
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
