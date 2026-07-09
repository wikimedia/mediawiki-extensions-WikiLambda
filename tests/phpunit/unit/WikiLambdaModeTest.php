<?php

/**
 * WikiLambda unit test suite for the WikiLambdaMode feature-mode value object
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests;

use MediaWiki\Config\HashConfig;
use MediaWiki\Extension\WikiLambda\WikiLambdaMode;
use MediaWikiUnitTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\WikiLambdaMode
 */
class WikiLambdaModeTest extends MediaWikiUnitTestCase {

	/**
	 * Build a WikiLambdaMode from the six flags, defaulting every one to false so
	 * each test only names the flags it cares about.
	 *
	 * @param array $overrides Flag short-name => bool, e.g. [ 'RepoMode' => true ]
	 * @return WikiLambdaMode
	 */
	private function makeMode( array $overrides = [] ): WikiLambdaMode {
		$flags = [
			'EnableRepoMode' => false,
			'EnableClientMode' => false,
			'ClientModeOffline' => false,
			'EnableAbstractMode' => false,
			'EnableAbstractClientMode' => false,
			'EnableAbstractClientModeIntegration' => false,
		];
		$settings = [];
		foreach ( array_merge( $flags, $overrides ) as $shortName => $value ) {
			$settings[ 'WikiLambda' . $shortName ] = $value;
		}
		return new WikiLambdaMode( new HashConfig( $settings ) );
	}

	public function testPerModePredicatesReflectTheirFlags() {
		$this->assertTrue( $this->makeMode( [ 'EnableRepoMode' => true ] )->isRepo() );
		$this->assertFalse( $this->makeMode()->isRepo() );

		$this->assertTrue( $this->makeMode( [ 'EnableClientMode' => true ] )->isClient() );
		$this->assertFalse( $this->makeMode()->isClient() );

		$this->assertTrue( $this->makeMode( [ 'ClientModeOffline' => true ] )->isClientOffline() );
		$this->assertFalse( $this->makeMode()->isClientOffline() );

		$this->assertTrue( $this->makeMode( [ 'EnableAbstractMode' => true ] )->isAbstract() );
		$this->assertFalse( $this->makeMode()->isAbstract() );

		$this->assertTrue( $this->makeMode( [ 'EnableAbstractClientMode' => true ] )->isAbstractClient() );
		$this->assertFalse( $this->makeMode()->isAbstractClient() );
	}

	/**
	 * The integration flag is a kill-switch that is meaningless without Abstract
	 * Client mode: it must never report live integration on its own.
	 */
	public function testAbstractClientIntegrationRequiresAbstractClientMode() {
		$this->assertTrue(
			$this->makeMode( [
				'EnableAbstractClientMode' => true,
				'EnableAbstractClientModeIntegration' => true,
			] )->isAbstractClientIntegration(),
			'Both flags on => integration live'
		);
		$this->assertFalse(
			$this->makeMode( [ 'EnableAbstractClientModeIntegration' => true ] )->isAbstractClientIntegration(),
			'Integration flag alone must not report live integration'
		);
		$this->assertFalse(
			$this->makeMode( [ 'EnableAbstractClientMode' => true ] )->isAbstractClientIntegration(),
			'Abstract Client mode without the integration flag is not live integration'
		);
	}

	/**
	 * @dataProvider provideIsRepoOrAbstract
	 */
	public function testIsRepoOrAbstract( bool $repo, bool $abstract, bool $expected ) {
		$mode = $this->makeMode( [
			'EnableRepoMode' => $repo,
			'EnableAbstractMode' => $abstract,
		] );
		$this->assertSame( $expected, $mode->isRepoOrAbstract() );
	}

	public static function provideIsRepoOrAbstract() {
		return [
			'neither' => [ false, false, false ],
			'repo only' => [ true, false, true ],
			'abstract only' => [ false, true, true ],
			'both' => [ true, true, true ],
		];
	}
}
