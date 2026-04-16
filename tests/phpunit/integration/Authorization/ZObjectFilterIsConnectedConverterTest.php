<?php

/**
 * WikiLambda integration test suite for ZObjectFilterIsConnectedConverter.
 *
 * This filter is part of the authorization engine: it decides whether an edit to a
 * Serialiser (Z64) or Deserialiser (Z46) is being made to a *connected* converter —
 * i.e. one already linked from its target Type's Z4K7/Z4K8 list. The authorization
 * rules treat "connected" edits as privileged (functionmaintainer-only) because they
 * change user-visible type conversion behaviour, so failures here become silent
 * privilege changes. Every branch of pass() is exercised below.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Authorization;

use MediaWiki\Extension\WikiLambda\Authorization\ZObjectFilterIsConnectedConverter;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Authorization\ZObjectFilterIsConnectedConverter
 */
class ZObjectFilterIsConnectedConverterTest extends WikiLambdaIntegrationTestCase {

	/**
	 * Build a mock ZObjectContent whose getZType() returns $type and whose
	 * getInnerZObject()->getValueByKey( $referenceKey )->getZValue() returns $referenceValue.
	 */
	private function newConverterContent(
		string $type,
		string $referenceKey,
		string $referenceValue
	): ZObjectContent {
		$reference = $this->createMock( ZObject::class );
		$reference->method( 'getZValue' )->willReturn( $referenceValue );

		$inner = $this->createMock( ZObject::class );
		$inner->method( 'getValueByKey' )->willReturnMap( [
			[ $referenceKey, $reference ],
		] );

		$content = $this->createMock( ZObjectContent::class );
		$content->method( 'getZType' )->willReturn( $type );
		$content->method( 'getInnerZObject' )->willReturn( $inner );
		return $content;
	}

	/**
	 * Build a mock ZObjectContent representing a Z4 (Z_TYPE) whose Z4K7 / Z4K8
	 * serialised array is $connectedZids.
	 */
	private function newTypeContent( string $arrayKey, array $connectedZids ): ZObjectContent {
		$list = $this->createMock( ZObject::class );
		$list->method( 'getSerialized' )->willReturn( $connectedZids );

		$inner = $this->createMock( ZObject::class );
		$inner->method( 'getValueByKey' )->willReturnMap( [
			[ $arrayKey, $list ],
		] );

		$content = $this->createMock( ZObjectContent::class );
		$content->method( 'getZType' )->willReturn( ZTypeRegistry::Z_TYPE );
		$content->method( 'getInnerZObject' )->willReturn( $inner );
		return $content;
	}

	/**
	 * Replace the WikiLambdaZObjectStore service with one whose fetchZObjectByTitle()
	 * returns $typeObject regardless of the title passed in.
	 */
	private function setMockStore( mixed $typeObject ): void {
		$store = $this->createMock( ZObjectStore::class );
		$store->method( 'fetchZObjectByTitle' )->willReturn( $typeObject );
		$this->setService( 'WikiLambdaZObjectStore', $store );
	}

	public function testPass_unsupportedType() {
		// A ZString (Z6) isn't a serialiser or a deserialiser — the switch falls through
		// to default and returns false without touching the store.
		$content = $this->createMock( ZObjectContent::class );
		$content->method( 'getZType' )->willReturn( ZTypeRegistry::Z_STRING );
		$title = Title::newFromText( 'Z401', NS_MAIN );

		$this->assertFalse(
			ZObjectFilterIsConnectedConverter::pass( $content, $content, $title ),
			'Non-converter types are not treated as connected'
		);
	}

	public function testPass_deserialiserTypeNotFound() {
		$fromContent = $this->newConverterContent(
			ZTypeRegistry::Z_DESERIALISER,
			ZTypeRegistry::Z_DESERIALISER_TYPE,
			'Z99999'
		);
		// Store returns false — type object doesn't exist.
		$this->setMockStore( false );
		$title = Title::newFromText( 'Z401', NS_MAIN );

		$this->assertFalse(
			ZObjectFilterIsConnectedConverter::pass( $fromContent, $fromContent, $title ),
			'Missing target type returns false'
		);
	}

	public function testPass_deserialiserWrongObjectType() {
		$fromContent = $this->newConverterContent(
			ZTypeRegistry::Z_DESERIALISER,
			ZTypeRegistry::Z_DESERIALISER_TYPE,
			'Z401'
		);
		// The store returns an object, but it isn't a Z4. Could happen if a ZID's been
		// repurposed; we must not treat its contents as a type definition.
		$notAType = $this->createMock( ZObjectContent::class );
		$notAType->method( 'getZType' )->willReturn( ZTypeRegistry::Z_STRING );
		$this->setMockStore( $notAType );
		$title = Title::newFromText( 'Z402', NS_MAIN );

		$this->assertFalse(
			ZObjectFilterIsConnectedConverter::pass( $fromContent, $fromContent, $title ),
			'Non-Z4 target returns false'
		);
	}

	public function testPass_deserialiserConnected() {
		$fromContent = $this->newConverterContent(
			ZTypeRegistry::Z_DESERIALISER,
			ZTypeRegistry::Z_DESERIALISER_TYPE,
			'Z401'
		);
		$typeContent = $this->newTypeContent(
			ZTypeRegistry::Z_TYPE_DESERIALISERS,
			[ 'Z46', 'Z402', 'Z403' ]
		);
		$this->setMockStore( $typeContent );
		$title = Title::newFromText( 'Z402', NS_MAIN );

		$this->assertTrue(
			ZObjectFilterIsConnectedConverter::pass( $fromContent, $fromContent, $title ),
			'Deserialiser whose ZID appears in the target type\'s Z4K7 list is connected'
		);
	}

	public function testPass_deserialiserNotConnected() {
		$fromContent = $this->newConverterContent(
			ZTypeRegistry::Z_DESERIALISER,
			ZTypeRegistry::Z_DESERIALISER_TYPE,
			'Z401'
		);
		$typeContent = $this->newTypeContent(
			ZTypeRegistry::Z_TYPE_DESERIALISERS,
			[ 'Z46', 'Z403' ]
		);
		$this->setMockStore( $typeContent );
		$title = Title::newFromText( 'Z402', NS_MAIN );

		$this->assertFalse(
			ZObjectFilterIsConnectedConverter::pass( $fromContent, $fromContent, $title ),
			'Deserialiser whose ZID is absent from the Z4K7 list is not connected'
		);
	}

	public function testPass_serialiserConnected() {
		$fromContent = $this->newConverterContent(
			ZTypeRegistry::Z_SERIALISER,
			ZTypeRegistry::Z_SERIALISER_TYPE,
			'Z401'
		);
		$typeContent = $this->newTypeContent(
			ZTypeRegistry::Z_TYPE_SERIALISERS,
			[ 'Z64', 'Z501' ]
		);
		$this->setMockStore( $typeContent );
		$title = Title::newFromText( 'Z501', NS_MAIN );

		$this->assertTrue(
			ZObjectFilterIsConnectedConverter::pass( $fromContent, $fromContent, $title ),
			'Serialiser whose ZID appears in the target type\'s Z4K8 list is connected'
		);
	}

	public function testPass_serialiserNotConnected() {
		$fromContent = $this->newConverterContent(
			ZTypeRegistry::Z_SERIALISER,
			ZTypeRegistry::Z_SERIALISER_TYPE,
			'Z401'
		);
		$typeContent = $this->newTypeContent(
			ZTypeRegistry::Z_TYPE_SERIALISERS,
			[ 'Z64' ]
		);
		$this->setMockStore( $typeContent );
		$title = Title::newFromText( 'Z501', NS_MAIN );

		$this->assertFalse(
			ZObjectFilterIsConnectedConverter::pass( $fromContent, $fromContent, $title ),
			'Serialiser whose ZID is absent from the Z4K8 list is not connected'
		);
	}
}
