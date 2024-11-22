<?php

/**
 * WikiLambda integration test suite for the ZFunction class
 *
 * @copyright 2020– WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Special;

use MediaWiki\Deferred\DeferredUpdates;
use MediaWiki\Extension\WikiLambda\Special\SpecialListFunctionsByTests;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\MediaWikiServices;
use MediaWiki\Request\FauxRequest;
use SpecialPageTestBase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Pagers\AbstractZObjectPager
 * @covers \MediaWiki\Extension\WikiLambda\Pagers\FunctionsByTestsPager
 * @covers \MediaWiki\Extension\WikiLambda\Special\SpecialListFunctionsByTests
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectStore
 * @group Database
 */
class SpecialListFunctionsByTestsTest extends SpecialPageTestBase {

	private ZObjectStore $zObjectStore;

	protected function setUp(): void {
		parent::setUp();
		$this->zObjectStore = WikiLambdaServices::getZObjectStore();
	}

	public function addDBDataOnce() {
		$this->zObjectStore = WikiLambdaServices::getZObjectStore();
		// Add three function pages to have page_id
		// It updates:
		// - wikilambda_zobject_join
		// - wikilambda_zobject_labels
		// It clears:
		// - wikilambda_ztester_results
		$dataFile = dirname( __DIR__, 2 ) . '/test_data/special/functionsbytests.json';
		$data = json_decode( file_get_contents( $dataFile ) );
		$this->editPage( 'Z10000', json_encode( $data->Z10000 ), 'function Z10000', NS_MAIN );
		$this->editPage( 'Z10001', json_encode( $data->Z10001 ), 'function Z10001', NS_MAIN );
		$this->editPage( 'Z10002', json_encode( $data->Z10002 ), 'function Z10002', NS_MAIN );
		DeferredUpdates::doUpdates();

		// Manually setup wikilambda_zobject_function_join: available tests and implementations
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

		// Manually setup wikilambda_ztester_results: cached result of each test against each implementation
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
