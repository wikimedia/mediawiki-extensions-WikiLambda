<?php

/**
 * WikiLambda integration test suite for the ZFunction class
 *
 * @copyright 2020– WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Special;

use MediaWiki\Extension\WikiLambda\Special\SpecialListFunctionsByTests;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\MediaWikiServices;
use MediaWiki\Request\FauxRequest;
use SpecialPageTestBase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Pagers\ZObjectAlphabeticPager
 * @covers \MediaWiki\Extension\WikiLambda\Special\SpecialListFunctionsByTests
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectStore
 * @group Database
 */
class SpecialListFunctionsByTestsTest extends SpecialPageTestBase {

	private ZObjectStore $zObjectStore;

	public function addDBData() {
		$this->zObjectStore = WikiLambdaServices::getZObjectStore();

		// wikilambda_zobject_function_join: available tests and implementations
		$availableTestsAndImps = [
			// Available tests
			[ 'Z20001', 'Z10000', 'Z20' ],
			[ 'Z20002', 'Z10000', 'Z20' ],
			[ 'Z20003', 'Z10000', 'Z20' ],
			[ 'Z20011', 'Z10001', 'Z20' ],
			[ 'Z20012', 'Z10001', 'Z20' ],
			[ 'Z20013', 'Z10001', 'Z20' ],
			[ 'Z20021', 'Z10002', 'Z20' ],
			[ 'Z20022', 'Z10002', 'Z20' ],
			[ 'Z20023', 'Z10002', 'Z20' ],
			// Implementations
			[ 'Z30001', 'Z10000', 'Z14' ],
			[ 'Z30002', 'Z10000', 'Z14' ],
			[ 'Z30011', 'Z10001', 'Z14' ],
			[ 'Z30012', 'Z10001', 'Z14' ],
			[ 'Z30021', 'Z10002', 'Z14' ],
			[ 'Z30022', 'Z10002', 'Z14' ],
		];
		foreach ( $availableTestsAndImps as $row ) {
			$this->zObjectStore->insertZFunctionReference( ...$row );
		}

		// wikilambda_zobject_join: connected tests and implementations
		$connectedPayload = [];
		$connectedTestsAndImps = [
			// Connected tests
			[ 'Z10000', 'Z20001', 'Z8K3', 'Z20' ],
			[ 'Z10000', 'Z20002', 'Z8K3', 'Z20' ],
			[ 'Z10000', 'Z20003', 'Z8K3', 'Z20' ],
			[ 'Z10001', 'Z20011', 'Z8K3', 'Z20' ],
			[ 'Z10001', 'Z20012', 'Z8K3', 'Z20' ],
			// Connected implementations
			[ 'Z10000', 'Z30001', 'Z8K4', 'Z14' ],
			[ 'Z10000', 'Z30002', 'Z8K4', 'Z14' ],
			[ 'Z10001', 'Z30011', 'Z8K4', 'Z14' ],
			[ 'Z10001', 'Z30012', 'Z8K4', 'Z14' ],
			[ 'Z10002', 'Z30021', 'Z8K4', 'Z14' ],
			[ 'Z10002', 'Z30022', 'Z8K4', 'Z14' ],
		];
		foreach ( $connectedTestsAndImps as $row ) {
			$connectedPayload[] = (object)[
				'zid' => $row[0],
				'type' => 'Z8',
				'key' => $row[2],
				'related_zid' => $row[1],
				'related_type' => $row[3]
			];
			$this->zObjectStore->insertRelatedZObjects( $connectedPayload );
		}

		// wikilambda_ztester_results: cached result of each test against each implementation
		$testResults = [
			// Function B:
			// * 3 connected tests
			// * all passing
			[ 'Z10000', 100, 'Z30001', 301, 'Z20001', 201, true, 'x' ],
			[ 'Z10000', 100, 'Z30001', 301, 'Z20002', 202, true, 'x' ],
			[ 'Z10000', 100, 'Z30001', 301, 'Z20003', 203, true, 'x' ],
			[ 'Z10000', 100, 'Z30002', 302, 'Z20001', 201, true, 'x' ],
			[ 'Z10000', 100, 'Z30002', 302, 'Z20002', 202, true, 'x' ],
			[ 'Z10000', 100, 'Z30002', 302, 'Z20003', 203, true, 'x' ],
			// Function A:
			// * 2 connected, 1 disconnected
			// * all tests passing against all connected implementations
			[ 'Z10001', 101, 'Z30011', 311, 'Z20011', 211, true, 'x' ],
			[ 'Z10001', 101, 'Z30011', 311, 'Z20012', 212, true, 'x' ],
			[ 'Z10001', 101, 'Z30011', 311, 'Z20013', 213, true, 'x' ],
			[ 'Z10001', 101, 'Z30012', 312, 'Z20011', 211, true, 'x' ],
			[ 'Z10001', 101, 'Z30012', 312, 'Z20012', 212, true, 'x' ],
			[ 'Z10001', 101, 'Z30012', 312, 'Z20013', 213, true, 'x' ],
			[ 'Z10001', 101, 'Z30013', 313, 'Z20011', 213, false, 'x' ],
			[ 'Z10001', 101, 'Z30013', 313, 'Z20012', 212, false, 'x' ],
			[ 'Z10001', 101, 'Z30013', 313, 'Z20013', 213, false, 'x' ],
			// Function C:
			// * 0 connected
			// * 1 test failing
			[ 'Z10002', 102, 'Z30021', 321, 'Z20021', 221, false, 'x' ],
			[ 'Z10002', 102, 'Z30021', 321, 'Z20022', 222, true, 'x' ],
			[ 'Z10002', 102, 'Z30021', 321, 'Z20023', 223, true, 'x' ],
			[ 'Z10002', 102, 'Z30022', 322, 'Z20021', 221, false, 'x' ],
			[ 'Z10002', 102, 'Z30022', 322, 'Z20022', 222, true, 'x' ],
			[ 'Z10002', 102, 'Z30022', 322, 'Z20023', 223, true, 'x' ],
		];
		foreach ( $testResults as $row ) {
			$this->zObjectStore->insertZTesterResult( ...$row );
		}

		// wikilambda_zobject_labels: function labels in english
		$functionLabels = [
			[ 'Z10000', 'Z8', [ 'Z1002' => 'Function B' ], 'Z6' ],
			[ 'Z10001', 'Z8', [ 'Z1002' => 'Function A' ], 'Z6' ],
			[ 'Z10002', 'Z8', [ 'Z1002' => 'Function C' ], 'Z6' ],
		];
		foreach ( $functionLabels as $row ) {
			$this->zObjectStore->insertZObjectLabels( ...$row );
		}
	}

	protected function newSpecialPage(): SpecialListFunctionsByTests {
		$languageFallback = MediaWikiServices::getInstance()->getLanguageFallback();
		return new SpecialListFunctionsByTests( $this->zObjectStore, $languageFallback );
	}

	public function testListPage_execute() {
		[ $html ] = $this->executeSpecialPage();
		$this->assertStringContainsString( 'wikilambda-special-functionsbytests-summary', $html );
		$resultRegex = '/Function A(.|\n)*Z10001(.|\n)*Function B(.|\n)*Z10000(.|\n)*Function C(.|\n)*Z10002/';
		$this->assertMatchesRegularExpression( $resultRegex, $html );
	}

	public function testListPage_hasSummary() {
		[ $html ] = $this->executeSpecialPage();
		$this->assertMatchesRegularExpression(
			'/<form action=\'.*?Special:ListFunctionsByTests\'/',
			$html
		);
	}

	public function testListPage_hasForm() {
		[ $html ] = $this->executeSpecialPage();
		$this->assertMatchesRegularExpression(
			'/<form action=\'.*?Special:ListFunctionsByTests\'/',
			$html
		);
	}

	public function testListPage_pager() {
		$request = new FauxRequest( [ 'limit' => '1' ] );
		[ $html ] = $this->executeSpecialPage( '', $request );
		$this->assertStringContainsString( 'mw-pager-navigation-bar', $html );

		$this->assertStringContainsString( 'Z10001', $html );
		$this->assertStringNotContainsString( 'Z10000', $html );
		$this->assertStringNotContainsString( 'Z10002', $html );
	}

	public function testListPage_rowDetails() {
		$request = new FauxRequest( [] );
		[ $html ] = $this->executeSpecialPage( '', $request );
		$regexA = '/Function A(.|\n)*(Z10001)(.|\n)*tests: 3(.|\n)*connected: 2/';
		$regexB = '/Function B(.|\n)*(Z10000)(.|\n)*tests: 3(.|\n)*connected: 3/';
		$regexC = '/Function C(.|\n)*(Z10002)(.|\n)*tests: 3(.|\n)*connected: 0(.|\n)*failing: 1/';
		$this->assertMatchesRegularExpression( $regexA, $html );
		$this->assertMatchesRegularExpression( $regexB, $html );
		$this->assertMatchesRegularExpression( $regexC, $html );
	}
}
