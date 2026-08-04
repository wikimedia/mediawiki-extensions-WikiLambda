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
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;
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
		array $contentSpec,
		array $expectedRights
	) {
		if ( $contentSpec[0] === 'functionCallContent' ) {
			$content = $this->newMockFunctionCallContent( $contentSpec[1], $contentSpec[2] );
		} else {
			$content = $this->newMockContent( $contentSpec[1], $contentSpec[2] );
		}
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

	public static function provideCreateRights(): iterable {
		// ─── User-defined (ZID >= 10000): no wikilambda-create-predefined ───

		yield 'user-defined type (Z4)' => [
			'user-defined type',
			[ 'content', ZTypeRegistry::Z_TYPE, 'Z10001' ],
			[ 'edit', 'wikilambda-create', 'wikilambda-create-type' ],
		];

		yield 'user-defined function (Z8)' => [
			'user-defined function',
			[ 'content', ZTypeRegistry::Z_FUNCTION, 'Z10002' ],
			[ 'edit', 'wikilambda-create', 'wikilambda-create-function' ],
		];

		yield 'user-defined implementation (Z14)' => [
			'user-defined implementation',
			[ 'content', ZTypeRegistry::Z_IMPLEMENTATION, 'Z10003' ],
			[ 'edit', 'wikilambda-create', 'wikilambda-create-implementation' ],
		];

		yield 'user-defined tester (Z20)' => [
			'user-defined tester',
			[ 'content', ZTypeRegistry::Z_TESTER, 'Z10004' ],
			[ 'edit', 'wikilambda-create', 'wikilambda-create-tester' ],
		];

		yield 'user-defined language (Z60)' => [
			'user-defined language',
			[ 'content', ZTypeRegistry::Z_LANGUAGE, 'Z10005' ],
			[ 'edit', 'wikilambda-create', 'wikilambda-create-language' ],
		];

		yield 'user-defined programming language (Z61)' => [
			'user-defined programming language',
			[ 'content', ZTypeRegistry::Z_PROGRAMMINGLANGUAGE, 'Z10006' ],
			[ 'edit', 'wikilambda-create', 'wikilambda-create-programming' ],
		];

		yield 'user-defined boolean (Z40)' => [
			'user-defined boolean',
			[ 'content', ZTypeRegistry::Z_BOOLEAN, 'Z10007' ],
			[ 'edit', 'wikilambda-create', 'wikilambda-create-boolean' ],
		];

		yield 'user-defined unit (Z21)' => [
			'user-defined unit',
			[ 'content', ZTypeRegistry::Z_UNIT, 'Z10008' ],
			[ 'edit', 'wikilambda-create', 'wikilambda-create-unit' ],
		];

		yield 'user-defined deserialiser (Z46)' => [
			'user-defined deserialiser',
			[ 'content', ZTypeRegistry::Z_DESERIALISER, 'Z10009' ],
			[ 'edit', 'wikilambda-create', 'wikilambda-create-converter' ],
		];

		yield 'user-defined serialiser (Z64)' => [
			'user-defined serialiser',
			[ 'content', ZTypeRegistry::Z_SERIALISER, 'Z10010' ],
			[ 'edit', 'wikilambda-create', 'wikilambda-create-converter' ],
		];

		yield 'user-defined wikidata enum function call (Z7→Z6884)' => [
			'user-defined wikidata enum',
			[ 'functionCallContent', ZTypeRegistry::Z_WIKIDATA_ENUM, 'Z10011' ],
			[ 'edit', 'wikilambda-create', 'wikilambda-create-generic-enum' ],
		];

		yield 'user-defined other function call (Z7→Z881)' => [
			'user-defined function call',
			[ 'functionCallContent', 'Z881', 'Z10012' ],
			[ 'edit', 'wikilambda-create', 'wikilambda-create-function-call' ],
		];

		// ─── Pre-defined (ZID < 10000): adds wikilambda-create-predefined ───

		yield 'predefined type (Z4)' => [
			'predefined type',
			[ 'content', ZTypeRegistry::Z_TYPE, 'Z400' ],
			[ 'edit', 'wikilambda-create', 'wikilambda-create-predefined', 'wikilambda-create-type' ],
		];

		yield 'predefined function (Z8)' => [
			'predefined function',
			[ 'content', ZTypeRegistry::Z_FUNCTION, 'Z401' ],
			[ 'edit', 'wikilambda-create', 'wikilambda-create-predefined', 'wikilambda-create-function' ],
		];

		yield 'predefined tester (Z20)' => [
			'predefined tester',
			[ 'content', ZTypeRegistry::Z_TESTER, 'Z402' ],
			[ 'edit', 'wikilambda-create', 'wikilambda-create-predefined', 'wikilambda-create-tester' ],
		];

		yield 'predefined implementation (Z14)' => [
			'predefined implementation',
			[ 'content', ZTypeRegistry::Z_IMPLEMENTATION, 'Z403' ],
			[ 'edit', 'wikilambda-create', 'wikilambda-create-predefined', 'wikilambda-create-implementation' ],
		];

		yield 'predefined wikidata enum function call (Z7→Z6884)' => [
			'predefined wikidata enum',
			[ 'functionCallContent', ZTypeRegistry::Z_WIKIDATA_ENUM, 'Z404' ],
			[ 'edit', 'wikilambda-create', 'wikilambda-create-predefined', 'wikilambda-create-generic-enum' ],
		];
	}

	/**
	 * Build a mock ZObjectContent for a user-contributed function whose attached
	 * implementations and testers are the lists given.
	 *
	 * Enough is mocked for the rules to be matched without touching the service
	 * container: Z8 is in EXCLUDE_TYPES_FROM_ENUMS, so ZObjectFilterIsEnumValue
	 * answers without a database read, and ZObjectFilterIsRunnable needs only the
	 * attached implementations.
	 *
	 * @param array $implementations The Z8K4 value, as a benjamin array
	 * @param array $testers The Z8K3 value, as a benjamin array
	 * @return ZObjectContent
	 */
	private function newMockFunction( array $implementations, array $testers ): ZObjectContent {
		$attached = $this->createMock( ZTypedList::class );
		// A function is "running" when it has implementations attached.
		$attached->method( 'isEmpty' )->willReturn( count( $implementations ) < 2 );
		$inner = $this->createMock( ZObject::class );
		$inner->method( 'getValueByKey' )->with( 'Z8K4' )->willReturn( $attached );

		$mock = $this->createMock( ZObjectContent::class );
		$mock->method( 'getZType' )->willReturn( ZTypeRegistry::Z_FUNCTION );
		$mock->method( 'getInnerZObject' )->willReturn( $inner );
		$mock->method( 'getObject' )->willReturn( [
			'Z1K1' => ZTypeRegistry::Z_PERSISTENTOBJECT,
			'Z2K1' => [ 'Z1K1' => 'Z6', 'Z6K1' => 'Z10001' ],
			'Z2K2' => [
				'Z1K1' => ZTypeRegistry::Z_FUNCTION,
				'Z8K3' => $testers,
				'Z8K4' => $implementations,
				'Z8K5' => 'Z10001',
			],
		] );
		return $mock;
	}

	/**
	 * Characterises the rights an edit to a user-contributed function's attached
	 * implementations and testers requires today, so that changing how
	 * ZObjectListDiffer pairs list items across revisions (T338250) cannot quietly
	 * reduce them.
	 *
	 * Re-ordering is the case that matters: because items are currently paired by
	 * position, moving one reports as a change to every position it passed, and a
	 * change is mapped to both the connect and the disconnect right. Pairing items
	 * by identity instead must not drop that.
	 *
	 * @dataProvider provideEditRights
	 */
	public function testGetRequiredEditRights(
		string $description,
		array $old,
		array $new,
		array $expectedRights
	) {
		$title = $this->createMock( Title::class );
		// Outside the predefined range, so the built-in rules do not claim it.
		$title->method( 'getText' )->willReturn( 'Z10001' );

		$rights = $this->authorization->getRequiredEditRights(
			$this->newMockFunction( $old['implementations'], $old['testers'] ),
			$this->newMockFunction( $new['implementations'], $new['testers'] ),
			$title
		);

		sort( $rights );
		$expected = $expectedRights;
		sort( $expected );
		$this->assertSame( $expected, $rights, "Rights required to $description" );
	}

	public static function provideEditRights(): iterable {
		$impls = static fn ( string ...$zids ): array => [ ZTypeRegistry::Z_IMPLEMENTATION, ...$zids ];
		$testers = static fn ( string ...$zids ): array => [ ZTypeRegistry::Z_TESTER, ...$zids ];
		$function = static fn ( array $implementations, array $testerList ): array => [
			'implementations' => $implementations,
			'testers' => $testerList,
		];

		yield 're-order implementations of a running function' => [
			're-order the implementations of a running function',
			$function( $impls( 'Z10021', 'Z10023' ), $testers() ),
			$function( $impls( 'Z10023', 'Z10021' ), $testers() ),
			[
				'edit',
				'wikilambda-edit-user-function',
				'wikilambda-edit-running-function',
				'wikilambda-connect-implementation',
				'wikilambda-disconnect-implementation',
			],
		];

		yield 're-order testers of a running function' => [
			're-order the testers of a running function',
			$function( $impls( 'Z10021' ), $testers( 'Z10031', 'Z10032' ) ),
			$function( $impls( 'Z10021' ), $testers( 'Z10032', 'Z10031' ) ),
			[
				'edit',
				'wikilambda-edit-user-function',
				'wikilambda-edit-running-function',
				'wikilambda-connect-tester',
				'wikilambda-disconnect-tester',
			],
		];

		yield 'connect an implementation to a running function' => [
			'connect an implementation to a running function',
			$function( $impls( 'Z10021' ), $testers() ),
			$function( $impls( 'Z10021', 'Z10023' ), $testers() ),
			[
				'edit',
				'wikilambda-edit-user-function',
				'wikilambda-edit-running-function',
				'wikilambda-connect-implementation',
			],
		];

		yield 'disconnect an implementation from a running function' => [
			'disconnect an implementation from a running function',
			$function( $impls( 'Z10021', 'Z10023' ), $testers() ),
			$function( $impls( 'Z10021' ), $testers() ),
			[
				'edit',
				'wikilambda-edit-user-function',
				'wikilambda-edit-running-function',
				'wikilambda-disconnect-implementation',
			],
		];

		yield 'connect the first implementation to a non-running function' => [
			'connect the first implementation to a non-running function',
			$function( $impls(), $testers() ),
			$function( $impls( 'Z10021' ), $testers() ),
			[
				'edit',
				'wikilambda-edit-user-function',
				'wikilambda-connect-implementation',
			],
		];
	}
}
