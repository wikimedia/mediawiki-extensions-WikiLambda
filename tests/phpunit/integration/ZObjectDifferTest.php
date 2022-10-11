<?php

/**
 * WikiLambda integration test suite for the ZObjectContent class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use Diff\DiffOp\Diff\Diff;
use MediaWiki\Extension\WikiLambda\Diff\ZObjectDiffer;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\Diff\ZObjectDiffer
 */
class ZObjectDifferTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers ::__construct
	 * @covers ::doDiff
	 * @dataProvider provideDiffData
	 */
	public function testDiff( $oldValue, $newValue, $description, $expectedDiffs ) {
		$differ = new ZObjectDiffer();
		$diffOps = $differ->doDiff(
			$this->toDiffArray( $oldValue ),
			$this->toDiffArray( $newValue )
		);

		$flats = ZObjectDiffer::flattenDiff( new Diff( $diffOps ) );

		// Assert that the number of diffOps is the expected one
		$this->assertCount(
			count( $expectedDiffs ),
			$flats,
			'The number of detected DiffOps is correct'
		);

		// Assert that the operations are the right ones
		foreach ( $flats as $diff ) {
			$path = implode( ".", $diff[ 'path' ] );
			$this->assertArrayHasKey(
				$path,
				$expectedDiffs,
				'The path that registered a DiffOp is correct' );

			$op = $diff[ 'op' ];
			$this->assertEqualsCanonicalizing(
				json_decode( json_encode( $expectedDiffs[ $path ] ) ),
				json_decode( json_encode( $op->toArray() ) ),
				'The DiffOp detected in this path is correct'
			);
		}
	}

	public function provideDiffData() {
		$testData = [];

		$diffDir = dirname( __DIR__, 1 ) . '/test_data/diff/';
		$allDiffs = scandir( $diffDir );

		foreach ( $allDiffs as $filename ) {
			$filePath = "$diffDir$filename";
			if ( is_dir( $filePath ) ) {
				continue;
			}

			$diffData = json_decode( file_get_contents( $filePath ) );
			if ( $diffData->ignore === false ) {
				$testData[ $filename ] = [
					$diffData->oldValue,
					$diffData->newValue,
					$diffData->description,
					get_object_vars( $diffData->diffs )
				];
			}
		}

		return $testData;
	}

	/**
	 * Private helper to mimic the transformations that ZObjectSlotDiffRenderer
	 * does before calling the ZObjectDiffer service
	 *
	 * @param \stdClass $object
	 * @return array
	 */
	private function toDiffArray( $object ): array {
		return [
			'root' => json_decode( json_encode( $object ), true )
		];
	}
}
