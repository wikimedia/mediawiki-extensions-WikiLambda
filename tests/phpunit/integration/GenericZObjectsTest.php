<?php

/**
 * WikiLambda integration test suite for generic ZObjects' re-use of in-built
 * and bespoke ZTypes.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory
 * @group Database
 */
class GenericZObjectsTest extends WikiLambdaIntegrationTestCase {

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
	"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },
	"Z2K2": "Tést content!",
	"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] }
}
EOT;

		$instanceStatus = $this->editPage(
			$instanceTitleText, $instanceContent, 'Test ZString instance', NS_MAIN
		);

		$this->assertTrue( $instanceStatus->isOK() );
		$instanceTitle = Title::newFromText( $instanceTitleText, NS_MAIN );
		$this->assertTrue( $instanceTitle->exists() );
		$this->assertTrue( $instanceTitle->getContentModel() === CONTENT_MODEL_ZOBJECT );

		// Test content is correct.
		$instanceWikiPage = $this->getServiceContainer()->getWikiPageFactory()->newFromTitle( $instanceTitle );
		$instance = $instanceWikiPage->getContent( RevisionRecord::RAW );
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
	 */
	public function testInstanceOfZTestType() {
		$this->registerLangs( ZTestType::TEST_LANGS );

		// Create ZTestType (Z111)
		$baseTypeTitleText = ZTestType::TEST_ZID;
		$baseTypeStatus = $this->editPage(
			$baseTypeTitleText, ZTestType::TEST_ENCODING, 'Create ZTestType', NS_MAIN
		);

		$this->assertTrue( $baseTypeStatus->isOK() );
		$baseTypeTitle = Title::newFromText( $baseTypeTitleText, NS_MAIN );
		$this->assertTrue( $baseTypeTitle->exists() );

		$registry = ZTypeRegistry::singleton();
		$this->assertTrue(
			$registry->isZObjectKeyKnown( ZTestType::TEST_ZID ),
			'ZTestType now known to ZTypeRegistry'
		);
		$this->assertSame(
			ZTestType::TEST_ZID,
			$registry->getZObjectTypeFromKey( ZTestType::TEST_ZID ),
			'ZTestType name known to ZTypeRegistry'
		);

		// Create a valid instance of ZTestType (Z112)
		$instanceTitleText = 'Z112';
		$instanceContent = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },
	"Z2K2": {
		"Z1K1": "Z111",
		"Z111K1": "Tést",
		"Z111K2": "content!"
	},
	"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] }
}
EOT;

		$instanceStatus = $this->editPage(
			$instanceTitleText, $instanceContent, 'Test ZTestType instance', NS_MAIN
		);

		$this->assertTrue( $instanceStatus->isOK() );
		$instanceTitle = Title::newFromText( $instanceTitleText, NS_MAIN );
		$this->assertTrue( $instanceTitle->exists() );
		$this->assertTrue( $instanceTitle->getContentModel() === CONTENT_MODEL_ZOBJECT );

		// Test content is correct.
		$instanceWikiPage = $this->getServiceContainer()->getWikiPageFactory()->newFromTitle( $instanceTitle );
		$instance = $instanceWikiPage->getContent( RevisionRecord::RAW );
		$this->assertTrue( $instance instanceof ZObjectContent );
		$this->assertTrue( $instance->isValid() );

		// Though ZTestType is a PHP-provided type, it's not marked as built-in, so it falls back to a ZObject
		// like a DB-provided type would
		$innerObject = $instance->getInnerZObject();
		$this->assertTrue( $innerObject->isValid() );

		$value = (array)$innerObject->getSerialized();

		$this->assertCount( 3, $value );
		$this->assertArrayHasKey( 'Z1K1', $value );
		$this->assertEquals( 'Z111', $value[ 'Z1K1' ] );
		$this->assertArrayHasKey( 'Z111K1', $value );
		$this->assertEquals( 'Tést', $value[ 'Z111K1' ] );
		$this->assertArrayHasKey( 'Z111K2', $value );
		$this->assertEquals( 'content!', $value[ 'Z111K2' ] );
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
	"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },
	"Z2K2": {
		"Z1K1": "Z4",
		"Z4K1": "Z91",
		"Z4K2": [
			"Z3",
			{
				"Z1K1": "Z3",
				"Z3K1": "Z6",
				"Z3K2": "Z91K1",
				"Z3K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] }
			}
		],
		"Z4K3": "Z91"
	},
	"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11", { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "ZInteger" } ] }
}
EOT;

		$baseTypeStatus = $this->editPage(
			$baseTypeTitleText, $baseTypeContent, 'Create ZInteger', NS_MAIN
		);

		$this->assertTrue(
			$baseTypeStatus->isOK(),
			'ZInteger creation was successful'
		);

		$baseTypeTitle = Title::newFromText( $baseTypeTitleText, NS_MAIN );
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
			'Z91',
			$registry->getZObjectTypeFromKey( 'Z91' ),
			'ZInteger name known to ZTypeRegistry'
		);

		// Create a valid instance of ZInteger (Z92)
		$instanceTitleText = 'Z92';
		$instanceContent = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },
	"Z2K2": {
		"Z1K1": "Z91",
		"Z91K1": "6"
	},
	"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] }
}
EOT;

		$instanceStatus = $this->editPage(
			$instanceTitleText, $instanceContent, 'Test ZInteger instance', NS_MAIN
		);

		$this->assertTrue(
			$instanceStatus->isOK(),
			'ZInteger instance creation was successful'
		);

		$instanceTitle = Title::newFromText( $instanceTitleText, NS_MAIN );
		$this->assertTrue(
			$instanceTitle->exists(),
			'ZInteger instance page was created in the DB'
		);
		$this->assertTrue(
			$instanceTitle->getContentModel() === CONTENT_MODEL_ZOBJECT,
			'ZInteger instance comes back as the right content model'
		);

		// Test content is correct.
		$instanceWikiPage = $this->getServiceContainer()->getWikiPageFactory()->newFromTitle( $instanceTitle );
		$instance = $instanceWikiPage->getContent( RevisionRecord::RAW );
		$this->assertTrue(
			$instance instanceof ZObjectContent,
			'ZInteger instance comes back as the right content class'
		);
		$this->assertTrue(
			$instance->isValid(), 'ZInteger instance comes back as a valid ZPO'
		);

		$innerObject = $instance->getInnerZObject();
		$this->assertTrue( $innerObject->isValid(), 'ZInteger instance inner object comes back as a valid ZObject' );

		$value = (array)$innerObject->getSerialized();
		$this->assertCount( 2, $value, 'ZInteger instance inner object has the right number of keys' );
		$this->assertArrayHasKey( 'Z1K1', $value, 'ZInteger instance inner object has the type key' );
		$this->assertEquals( 'Z91', $value[ 'Z1K1' ], 'ZInteger instance inner object has the right type key' );
		$this->assertArrayHasKey( 'Z91K1', $value, 'ZInteger instance inner object has the value key' );
		$this->assertSame( '6', $value[ 'Z91K1' ], 'ZInteger instance inner object has the right value key' );
	}

	/**
	 * This test proves that a self-referencing ZType and an on-wiki implementation of it can be created.
	 */
	public function testInstanceOfSelfReferencingType() {
		$baseTypeTitleText = 'Z991';
		$baseTypeContent = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z991" },
	"Z2K2": {
		"Z1K1": "Z4",
		"Z4K1": "Z991",
		"Z4K2": [
			"Z3",
			{
				"Z1K1": "Z3",
				"Z3K1": "Z991",
				"Z3K2": "Z991K1",
				"Z3K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] }
			}
		],
		"Z4K3": "Z991"
	},
	"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11", { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "ZSelfRefType" } ] }
}
EOT;

		$baseTypeStatus = $this->editPage(
			$baseTypeTitleText, $baseTypeContent, 'Create ZSelfRefType', NS_MAIN
		);

		$this->assertTrue(
			$baseTypeStatus->isOK(),
			'ZSelfRefType creation was successful'
		);

		$baseTypeTitle = Title::newFromText( $baseTypeTitleText, NS_MAIN );
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
	"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z992"},
	"Z2K2": {
		"Z1K1": "Z991",
		"Z991K1": "Z992"
	},
	"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] }
}
EOT;

		$instanceStatus = $this->editPage(
			$instanceTitleText, $instanceContent, 'Test ZSelfRefType instance', NS_MAIN
		);

		// FIXME this is true because it's structurally valid, but hasn't checked actual validity
		$this->assertTrue(
			$instanceStatus->isOK(),
			'ZSelfRefType instance creation was successful'
		);

		$instanceTitle = Title::newFromText( $instanceTitleText, NS_MAIN );
		$this->assertTrue(
			$instanceTitle->exists(),
			'ZSelfRefType instance page was created in the DB'
		);

		// Test content is correct.
		$instanceWikiPage = $this->getServiceContainer()->getWikiPageFactory()->newFromTitle( $instanceTitle );
		$instance = $instanceWikiPage->getContent( RevisionRecord::RAW );
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

	/**
	 * This test inserts a ZLanguage with a label in the same language (self-reference)
	 */
	public function testInstanceOfSelfReferencingLang() {
		$this->insertZids( [ 'Z60' ] );

		$igboContent = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z1014" },
	"Z2K2": {
		"Z1K1": "Z60",
		"Z60K1": "ig"
	},
	"Z2K3": {
		"Z1K1": "Z12",
		"Z12K1": [
			"Z11",
			{
				"Z1K1": "Z11",
				"Z11K1": "Z1014",
				"Z11K2": "Igbo"
			}
		]
	}
}
EOT;

		$maintainerAuthority = static::getTestUser( [ 'functionmaintainer' ] )->getAuthority();

		$status = $this->editPage(
			'Z1014',
			$igboContent,
			'Create self-referencing ZLanguage',
			NS_MAIN,
			$maintainerAuthority
		);

		$this->assertTrue(
			$status->isOK(),
			'ZLanguage with self-reference has been created'
		);

		// Create new ZObject using the Store, where self-references are Z0
		$store = WikiLambdaServices::getZObjectStore();
		$maintainerUser = $this->getTestUser( [ 'functionmaintainer' ] )->getUser();

		$newLang = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },
	"Z2K2": {
		"Z1K1": "Z60",
		"Z60K1": "nw-lang"
	},
	"Z2K3": {
		"Z1K1": "Z12",
		"Z12K1": [
			"Z11",
			{
				"Z1K1": "Z11",
				"Z11K1": "Z0",
				"Z11K2": "New lang"
			}
		]
	}
}
EOT;
		$page = $store->createNewZObject( RequestContext::getMain(), $newLang, 'New ZLang', $maintainerUser );
		$this->assertTrue(
			$page->isOK(),
			'ZLanguage with null (Z0) self-reference has been created'
		);

		$newLangZid = $page->getTitle()->getBaseText();
		$newZObject = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },
	"Z2K2": "test object",
	"Z2K3": {
		"Z1K1": "Z12",
		"Z12K1": [
			"Z11",
			{
				"Z1K1": "Z11",
				"Z11K1": "Z1014",
				"Z11K2": "Igbo label"
			}, {
				"Z1K1": "Z11",
				"Z11K1": "$newLangZid",
				"Z11K2": "New language label"
			}
		]
	}
}
EOT;
		$page = $store->createNewZObject( RequestContext::getMain(), $newZObject, 'New ZObject', $maintainerUser );
		$this->assertTrue(
			$page->isOK(),
			'ZObject with labels in the two previously inserted languages has been created'
		);
	}

	/**
	 * This test proves that a ZType with list (Z10) and type (Z4) keys and an implementation of it can be created.
	 * TODO (T298133): Remove whenever we stop supporting Z10s
	 */
	public function testInstanceOfListUsingType() {
		// Create ZListUsingType (Z890)
		$baseTypeTitleText = 'Z890';
		$baseTypeContent = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },
	"Z2K2": {
		"Z1K1": "Z4",
		"Z4K1": "Z890",
		"Z4K2": [
			"Z3",
			{
				"Z1K1": "Z3",
				"Z3K1": "Z10",
				"Z3K2": { "Z1K1": "Z6", "Z6K1": "Z890K1" },
				"Z3K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] }
			},
			{
				"Z1K1": "Z3",
				"Z3K1": "Z4",
				"Z3K2": { "Z1K1": "Z6", "Z6K1": "Z890K2" },
				"Z3K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] }
			}
		],
		"Z4K3": "Z890"
	},
	"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11", { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "ZListUsingType" } ] }
}
EOT;

		$baseTypeStatus = $this->editPage(
			$baseTypeTitleText, $baseTypeContent, 'Create ZListUsingType', NS_MAIN
		);

		$this->assertTrue(
			$baseTypeStatus->isOK(),
			'ZListUsingType creation'
		);

		$baseTypeTitle = Title::newFromText( $baseTypeTitleText, NS_MAIN );
		$this->assertTrue(
			$baseTypeTitle->exists(),
			'ZListUsingType page in the DB'
		);

		$registry = ZTypeRegistry::singleton();
		$this->assertTrue(
			$registry->isZObjectKeyKnown( 'Z890' ),
			'ZListUsingType known to ZTypeRegistry'
		);

		// Create a valid instance of ZListUsingType (Z891)
		$instanceTitleText = 'Z891';
		$instanceContent = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },
	"Z2K2": {
		"Z1K1": "Z890",
		"Z890K1": [ "Z6", "Test"],
		"Z890K2": "Z6"
	},
	"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] }
}
EOT;

		$instanceStatus = $this->editPage(
			$instanceTitleText, $instanceContent, 'Test ZListUsingType instance', NS_MAIN
		);

		$this->assertTrue(
			$instanceStatus->isOK(),
			'ZListUsingType instance creation'
		);

		$instanceTitle = Title::newFromText( $instanceTitleText, NS_MAIN );
		$this->assertTrue(
			$instanceTitle->exists(),
			'ZListUsingType instance page in the DB'
		);

		// Test content is correct.
		$instanceWikiPage = $this->getServiceContainer()->getWikiPageFactory()->newFromTitle( $instanceTitle );
		$instance = $instanceWikiPage->getContent( RevisionRecord::RAW );
		$this->assertTrue(
			$instance instanceof ZObjectContent,
			'ZListUsingType instance content class'
		);
		$this->assertTrue(
			$instance->isValid(), 'ZListUsingType valid ZPO'
		);

		$innerObject = $instance->getInnerZObject();
		$this->assertTrue(
			$innerObject->isValid(),
			'ZListUsingType instance inner object valid ZObject'
		);

		// Create another instance with a reference and empty list (Z892)
		$instanceTitleText = 'Z892';
		$instanceContent = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },
	"Z2K2": {
		"Z1K1": "Z890",
		"Z890K1": [ "Z6" ],
		"Z890K2": {
			"Z1K1": "Z9",
			"Z9K1": "Z6"
		}
	},
	"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] }
}
EOT;
		$instanceStatus = $this->editPage(
			$instanceTitleText, $instanceContent, 'Test ZListUsingType instance 2', NS_MAIN
		);

		$this->assertTrue(
			$instanceStatus->isOK(),
			'ZListUsingType instance 2 creation'
		);
	}
}
