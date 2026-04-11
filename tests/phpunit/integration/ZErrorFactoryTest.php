<?php

/**
 * WikiLambda integration test suite for ZErrorFactory paths that need
 * MediaWiki services (wfMessage, ZObjectFactory::create → ZTypedList).
 *
 * The bulk of ZErrorFactory is covered by the matching unit test sibling in
 * tests/phpunit/unit/ZErrorFactoryTest.php; only the handful of branches that
 * genuinely require the MediaWiki environment live here.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZErrorFactory
 *
 * @group Database
 */
class ZErrorFactoryTest extends WikiLambdaIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsRepoMode();
	}

	/**
	 * Unwrap a ZError and return its inner ZTypedError's positional values.
	 *
	 * @param ZError $zerror
	 * @return array
	 */
	private function getInnerValues( ZError $zerror ): array {
		$inner = $zerror->getZValue();
		$this->assertInstanceOf( ZTypedError::class, $inner );
		$values = [];
		for ( $i = 1; $i <= 10; $i++ ) {
			$value = $inner->getValueByKey( "K$i" );
			if ( $value === null ) {
				break;
			}
			$values[] = $value;
		}
		return $values;
	}

	// ------------------------------------------------------------------
	// createAuthorizationZError — needs wfMessage
	// ------------------------------------------------------------------

	public function testCreateAuthorizationZError_editNewUsesNoCreateText() {
		$zerror = ZErrorFactory::createAuthorizationZError( 'wikilambda-create', EDIT_NEW );
		$this->assertSame( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_EDIT, $zerror->getZErrorType() );
		$values = $this->getInnerValues( $zerror );
		$this->assertCount( 1, $values );
		$this->assertInstanceOf( ZString::class, $values[0] );
		$this->assertSame( wfMessage( 'nocreatetext' )->text(), $values[0]->getZValue() );
	}

	public function testCreateAuthorizationZError_editUpdateUsesBadAccessGroup0() {
		$zerror = ZErrorFactory::createAuthorizationZError( 'edit', EDIT_UPDATE );
		$this->assertSame( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_EDIT, $zerror->getZErrorType() );
		$values = $this->getInnerValues( $zerror );
		$this->assertSame( wfMessage( 'badaccess-group0' )->text(), $values[0]->getZValue() );
	}

	public function testCreateAuthorizationZError_wikilambdaEditUsesBadAccessGroup0() {
		$zerror = ZErrorFactory::createAuthorizationZError( 'wikilambda-edit', EDIT_UPDATE );
		$this->assertSame( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_EDIT, $zerror->getZErrorType() );
		$values = $this->getInnerValues( $zerror );
		$this->assertSame( wfMessage( 'badaccess-group0' )->text(), $values[0]->getZValue() );
	}

	public function testCreateAuthorizationZError_unknownRightUsesPermissionDeniedMessage() {
		$zerror = ZErrorFactory::createAuthorizationZError( 'delete', EDIT_UPDATE );
		$this->assertSame( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_EDIT, $zerror->getZErrorType() );
		$values = $this->getInnerValues( $zerror );
		$expected = wfMessage( 'apierror-permissiondenied', wfMessage( 'action-delete' ) )->text();
		$this->assertSame( $expected, $values[0]->getZValue() );
	}

	// ------------------------------------------------------------------
	// createZErrorList / createLabelClashZErrors (multi) — need ZObjectFactory::create
	// ------------------------------------------------------------------

	public function testCreateZErrorList_buildsZ509WrappingChildren() {
		$child1 = ZErrorFactory::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
			[ 'message' => 'first' ]
		);
		$child2 = ZErrorFactory::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
			[ 'message' => 'second' ]
		);

		$zerror = ZErrorFactory::createZErrorList( [ $child1, $child2 ] );
		$this->assertSame( ZErrorTypeRegistry::Z_ERROR_LIST, $zerror->getZErrorType() );

		$values = $this->getInnerValues( $zerror );
		$this->assertCount( 1, $values );
		$list = $values[0];
		$this->assertInstanceOf( ZTypedList::class, $list );

		$items = $list->getAsArray();
		$this->assertCount( 2, $items );
		$this->assertSame( $child1, $items[0] );
		$this->assertSame( $child2, $items[1] );
	}

	public function testCreateLabelClashZErrors_multipleClashesWrapInZ509() {
		$zerror = ZErrorFactory::createLabelClashZErrors( [
			'en' => 'Z12345',
			'fr' => 'Z67890',
		] );
		$this->assertSame( ZErrorTypeRegistry::Z_ERROR_LIST, $zerror->getZErrorType() );

		$values = $this->getInnerValues( $zerror );
		$this->assertCount( 1, $values );
		$list = $values[0];
		$this->assertInstanceOf( ZTypedList::class, $list );

		$items = $list->getAsArray();
		$this->assertCount( 2, $items );

		foreach ( $items as $item ) {
			$this->assertInstanceOf( ZError::class, $item );
			$this->assertSame( ZErrorTypeRegistry::Z_ERROR_LABEL_CLASH, $item->getZErrorType() );
		}

		$firstInner = $this->getInnerValues( $items[0] );
		$this->assertSame( 'Z12345', $firstInner[0]->getZValue() );
		$this->assertSame( 'en', $firstInner[1]->getZValue() );

		$secondInner = $this->getInnerValues( $items[1] );
		$this->assertSame( 'Z67890', $secondInner[0]->getZValue() );
		$this->assertSame( 'fr', $secondInner[1]->getZValue() );
	}

	public function testCreateZErrorInstance_Z505_buildsArgumentCountMismatchWithZTypedList() {
		$arg1 = new ZString( 'first' );
		$arg2 = new ZString( 'second' );
		$zerror = ZErrorFactory::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_ARGUMENT_COUNT_MISMATCH,
			[
				'expected' => '2',
				'actual' => '3',
				'arguments' => [ $arg1, $arg2 ],
			]
		);
		$this->assertSame(
			ZErrorTypeRegistry::Z_ERROR_ARGUMENT_COUNT_MISMATCH,
			$zerror->getZErrorType()
		);

		$values = $this->getInnerValues( $zerror );
		$this->assertCount( 3, $values );
		$this->assertInstanceOf( ZString::class, $values[0] );
		$this->assertSame( '2', $values[0]->getZValue() );
		$this->assertInstanceOf( ZString::class, $values[1] );
		$this->assertSame( '3', $values[1]->getZValue() );
		$this->assertInstanceOf( ZTypedList::class, $values[2] );

		$items = $values[2]->getAsArray();
		$this->assertCount( 2, $items );
		$this->assertSame( $arg1, $items[0] );
		$this->assertSame( $arg2, $items[1] );
	}
}
