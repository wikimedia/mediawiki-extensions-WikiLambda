<?php

/**
 * WikiLambda unit test suite for ZObjectAuthorization creation rights detection
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Unit\Authorization;

use MediaWiki\Extension\WikiLambda\Authorization\ZObjectAuthorization;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectContent\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Title\Title;
use MediaWikiUnitTestCase;
use Psr\Log\NullLogger;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Authorization\ZObjectAuthorization
 */
class ZObjectAuthorizationTest extends MediaWikiUnitTestCase {

	private ZObjectAuthorization $authorization;

	protected function setUp(): void {
		parent::setUp();
		$this->authorization = new ZObjectAuthorization( new NullLogger() );
	}

	/**
	 * Build a mock ZObjectContent that returns the given type and ZID.
	 */
	private function newMockContent( string $type, string $zid ): ZObjectContent {
		$mock = $this->createMock( ZObjectContent::class );
		$mock->method( 'getZType' )->willReturn( $type );
		$mock->method( 'getZid' )->willReturn( $zid );
		return $mock;
	}

	/**
	 * Build a mock ZObjectContent for a function call (Z7), where getInnerZObject()
	 * returns a mock whose getZValue() returns the given function ZID.
	 */
	private function newMockFunctionCallContent( string $functionZid, string $zid ): ZObjectContent {
		$innerMock = $this->createMock( ZObject::class );
		$innerMock->method( 'getZValue' )->willReturn( $functionZid );

		$mock = $this->createMock( ZObjectContent::class );
		$mock->method( 'getZType' )->willReturn( ZTypeRegistry::Z_FUNCTIONCALL );
		$mock->method( 'getZid' )->willReturn( $zid );
		$mock->method( 'getInnerZObject' )->willReturn( $innerMock );
		return $mock;
	}

	/**
	 * @dataProvider provideCreateRights
	 */
	public function testGetRequiredCreateRights(
		string $description,
		ZObjectContent $content,
		array $expectedRights
	) {
		$title = $this->createMock( Title::class );
		$rights = $this->authorization->getRequiredCreateRights( $content, $title );

		foreach ( $expectedRights as $right ) {
			$this->assertContains(
				$right, $rights,
				"Creating a $description should require the '$right' right"
			);
		}

		$this->assertSameSize(
			$expectedRights, $rights,
			"Creating a $description should require exactly " . count( $expectedRights ) . " rights"
		);
	}

	public function provideCreateRights(): iterable {
		// ─── User-defined (ZID >= 10000): no wikilambda-create-predefined ───

		yield 'user-defined type (Z4)' => [
			'user-defined type',
			$this->newMockContent( ZTypeRegistry::Z_TYPE, 'Z10001' ),
			[ 'edit', 'wikilambda-create', 'wikilambda-create-type' ],
		];

		yield 'user-defined function (Z8)' => [
			'user-defined function',
			$this->newMockContent( ZTypeRegistry::Z_FUNCTION, 'Z10002' ),
			[ 'edit', 'wikilambda-create', 'wikilambda-create-function' ],
		];

		yield 'user-defined implementation (Z14)' => [
			'user-defined implementation',
			$this->newMockContent( ZTypeRegistry::Z_IMPLEMENTATION, 'Z10003' ),
			[ 'edit', 'wikilambda-create', 'wikilambda-create-implementation' ],
		];

		yield 'user-defined tester (Z20)' => [
			'user-defined tester',
			$this->newMockContent( ZTypeRegistry::Z_TESTER, 'Z10004' ),
			[ 'edit', 'wikilambda-create', 'wikilambda-create-tester' ],
		];

		yield 'user-defined language (Z60)' => [
			'user-defined language',
			$this->newMockContent( ZTypeRegistry::Z_LANGUAGE, 'Z10005' ),
			[ 'edit', 'wikilambda-create', 'wikilambda-create-language' ],
		];

		yield 'user-defined programming language (Z61)' => [
			'user-defined programming language',
			$this->newMockContent( ZTypeRegistry::Z_PROGRAMMINGLANGUAGE, 'Z10006' ),
			[ 'edit', 'wikilambda-create', 'wikilambda-create-programming' ],
		];

		yield 'user-defined boolean (Z40)' => [
			'user-defined boolean',
			$this->newMockContent( ZTypeRegistry::Z_BOOLEAN, 'Z10007' ),
			[ 'edit', 'wikilambda-create', 'wikilambda-create-boolean' ],
		];

		yield 'user-defined unit (Z21)' => [
			'user-defined unit',
			$this->newMockContent( ZTypeRegistry::Z_UNIT, 'Z10008' ),
			[ 'edit', 'wikilambda-create', 'wikilambda-create-unit' ],
		];

		yield 'user-defined deserialiser (Z46)' => [
			'user-defined deserialiser',
			$this->newMockContent( ZTypeRegistry::Z_DESERIALISER, 'Z10009' ),
			[ 'edit', 'wikilambda-create', 'wikilambda-create-converter' ],
		];

		yield 'user-defined serialiser (Z64)' => [
			'user-defined serialiser',
			$this->newMockContent( ZTypeRegistry::Z_SERIALISER, 'Z10010' ),
			[ 'edit', 'wikilambda-create', 'wikilambda-create-converter' ],
		];

		yield 'user-defined wikidata enum function call (Z7→Z6884)' => [
			'user-defined wikidata enum',
			$this->newMockFunctionCallContent( ZTypeRegistry::Z_WIKIDATA_ENUM, 'Z10011' ),
			[ 'edit', 'wikilambda-create', 'wikilambda-create-generic-enum' ],
		];

		yield 'user-defined other function call (Z7→Z881)' => [
			'user-defined function call',
			$this->newMockFunctionCallContent( 'Z881', 'Z10012' ),
			[ 'edit', 'wikilambda-create', 'wikilambda-create-function-call' ],
		];

		// ─── Pre-defined (ZID < 10000): adds wikilambda-create-predefined ───

		yield 'predefined type (Z4)' => [
			'predefined type',
			$this->newMockContent( ZTypeRegistry::Z_TYPE, 'Z400' ),
			[ 'edit', 'wikilambda-create', 'wikilambda-create-predefined', 'wikilambda-create-type' ],
		];

		yield 'predefined function (Z8)' => [
			'predefined function',
			$this->newMockContent( ZTypeRegistry::Z_FUNCTION, 'Z401' ),
			[ 'edit', 'wikilambda-create', 'wikilambda-create-predefined', 'wikilambda-create-function' ],
		];

		yield 'predefined tester (Z20)' => [
			'predefined tester',
			$this->newMockContent( ZTypeRegistry::Z_TESTER, 'Z402' ),
			[ 'edit', 'wikilambda-create', 'wikilambda-create-predefined', 'wikilambda-create-tester' ],
		];

		yield 'predefined implementation (Z14)' => [
			'predefined implementation',
			$this->newMockContent( ZTypeRegistry::Z_IMPLEMENTATION, 'Z403' ),
			[ 'edit', 'wikilambda-create', 'wikilambda-create-predefined', 'wikilambda-create-implementation' ],
		];

		yield 'predefined wikidata enum function call (Z7→Z6884)' => [
			'predefined wikidata enum',
			$this->newMockFunctionCallContent( ZTypeRegistry::Z_WIKIDATA_ENUM, 'Z404' ),
			[ 'edit', 'wikilambda-create', 'wikilambda-create-predefined', 'wikilambda-create-generic-enum' ],
		];
	}
}
