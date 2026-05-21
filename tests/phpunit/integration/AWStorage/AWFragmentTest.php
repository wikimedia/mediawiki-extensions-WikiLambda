<?php

/**
 * WikiLambda test suite for the AWSection class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\AWStorage\AWFragment;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AWStorage\AWFragment
 */
class AWFragmentTest extends WikiLambdaAbstractModeIntegrationTestCase {

	public function testConstructor() {
		$fragment = new AWFragment( 'some-fragment-key', 'Q42', 'en', '2026-05-15' );

		$this->assertSame( 'some-fragment-key', $fragment->getKey() );

		// Fragment value is missing
		$this->assertFalse( $fragment->isOk() );
		$this->assertTrue( $fragment->isMissing() );
		$this->assertSame( [], $fragment->getValue() );
	}

	public function testFragmentSetValue_Fresh_Success() {
		$fragment = new AWFragment( 'some-fragment-key', 'Q42', 'en', '2026-05-15' );

		$value = [ 'success' => true, 'value' => 'some fragment' ];
		$fragment->setValue( $value, AWFragment::AVAILABILITY_FRESH );

		$this->assertSame( 'some-fragment-key', $fragment->getKey() );
		$this->assertSame( $value, $fragment->getValue() );

		// Availability status
		$this->assertFalse( $fragment->isMissing() );
		$this->assertTrue( $fragment->isFresh() );
		$this->assertFalse( $fragment->isStale() );

		// Render status
		$this->assertTrue( $fragment->isOk() );
	}

	public function testFragmentSetValue_Stale_Success() {
		$fragment = new AWFragment( 'some-fragment-key', 'Q42', 'en', '2026-05-15' );

		$value = [ 'success' => true, 'value' => 'some fragment' ];
		$fragment->setValue( $value, AWFragment::AVAILABILITY_STALE );

		$this->assertSame( 'some-fragment-key', $fragment->getKey() );
		$this->assertSame( $value, $fragment->getValue() );

		// Availability status
		$this->assertFalse( $fragment->isMissing() );
		$this->assertFalse( $fragment->isFresh() );
		$this->assertTrue( $fragment->isStale() );

		// Render status
		$this->assertTrue( $fragment->isOk() );
	}

	public function testFragmentSetValue_Fresh_Failure() {
		$fragment = new AWFragment( 'some-fragment-key', 'Q42', 'en', '2026-05-15' );

		$value = [
			'success' => false,
			'value' => [
				'msg' => 'some-error-msg',
				'httpStatusCode' => 400
			]
		];
		$fragment->setValue( $value, AWFragment::AVAILABILITY_FRESH );

		$this->assertSame( 'some-fragment-key', $fragment->getKey() );
		$this->assertSame( $value, $fragment->getValue() );

		// Availability status
		$this->assertFalse( $fragment->isMissing() );
		$this->assertTrue( $fragment->isFresh() );
		$this->assertFalse( $fragment->isStale() );

		// Render status
		$this->assertFalse( $fragment->isOk() );
	}
}
