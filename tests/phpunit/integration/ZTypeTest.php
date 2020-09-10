<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZPersistentObject;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZType
 */
class ZTypeTest extends \MediaWikiIntegrationTestCase {

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::__construct
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::isValid
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::getZType
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::getZValue
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::getInnerZObject
	 */
	public function testPersistentCreation() {
		$services = \MediaWiki\MediaWikiServices::getInstance();

		$english = new \Language( 'en', $services->getLocalisationCache(), $services->getLanguageNameUtils(), $services->getLanguageFallback(), $services->getLanguageConverterFactory(), $services->getHookContainer() );
		$french = new \Language( 'fr', $services->getLocalisationCache(), $services->getLanguageNameUtils(), $services->getLanguageFallback(), $services->getLanguageConverterFactory(), $services->getHookContainer() );

		$testObject = new ZPersistentObject( '{"Z1K1":"Z2", "Z2K1":"Z111", "Z2K2":{"Z1K1":"Z4", "Z4K1":"Z111", "Z4K2":[{"Z1K1":"Z3", "Z3K1":"Z6", "Z3K2":"Z111K1", "Z3K3":{"Z1K1":"Z12", "Z12K1":[{"Z1K1":"Z11", "Z11K1":"en", "Z11K2":"Demonstration key"}, {"Z1K1":"Z11", "Z11K1":"fr", "Z11K2":"Index pour démonstration"}]}}, {"Z1K1":"Z3", "Z3K1":"Z6", "Z3K2":"Z111K2", "Z3K3":{"Z1K1":"Z12", "Z12K1":[{"Z1K1":"Z11", "Z11K1":"en", "Z11K2":"Other demonstration key"}, {"Z1K1":"Z11", "Z11K1":"fr", "Z11K2":"Autre index pour démonstration"}]}}], "Z4K3":"Z0"}, "Z2K3":{"Z1K1":"Z12", "Z12K1":[{"Z1K1":"Z11", "Z11K1":"en", "Z11K2":"Demonstration type"}, {"Z1K1":"Z11", "Z11K1":"fr", "Z11K2":"Type pour démonstration"}]}}' );

		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'ZType', $testObject->getZType() );

		$this->assertSame( 'Demonstration type', $testObject->getLabel( $english ) );
		$this->assertSame( 'Type pour démonstration', $testObject->getLabel( $french ) );

		$this->assertSame( 'Z111', $testObject->getInnerZObject()->getTypeId() );

		$keys = $testObject->getInnerZObject()->getTypeKeys();

		$this->assertCount( 2, $keys );
		$this->assertSame( 'ZString', $keys[0]->getKeyType() );
		$this->assertSame( 'Z111K1', $keys[0]->getKeyId() );
		$this->assertSame( 'Demonstration key', $keys[0]->getKeyLabel()->getStringForLanguage( $english ) );
		$this->assertSame( 'Index pour démonstration', $keys[0]->getKeyLabel()->getStringForLanguage( $french ) );

		$this->assertSame( 'ZString', $keys[1]->getKeyType() );
		$this->assertSame( 'Z111K2', $keys[1]->getKeyId() );
		$this->assertSame( 'Other demonstration key', $keys[1]->getKeyLabel()->getStringForLanguage( $english ) );
		$this->assertSame( 'Autre index pour démonstration', $keys[1]->getKeyLabel()->getStringForLanguage( $french ) );

		// TODO: Nonsense result for now; once we implement Functions, will be one of those.
		$this->assertSame( 'Z0', $testObject->getInnerZObject()->getTypeValidator() );
	}
}
