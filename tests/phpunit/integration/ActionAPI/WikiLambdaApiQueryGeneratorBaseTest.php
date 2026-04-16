<?php

/**
 * WikiLambda integration test suite for the WikiLambdaApiQueryGeneratorBase abstract class.
 *
 * WikiLambdaApiQueryGeneratorBase is the shared base for every list/generator Query API that
 * powers the editor's type-ahead and pagination. It contributes three pieces of behaviour:
 *
 *   1. A repo-mode gate on execute() / executeGenerator() — a client wiki must not be able
 *      to invoke these endpoints; they die with Z_ERROR_USER_CANNOT_RUN.
 *   2. An abstract run() with a throwing default — ensures any subclass that forgets to
 *      implement run() fails loudly rather than silently returning no results.
 *   3. A static getMatchRate() helper used by the subclasses' result ranking. This is the
 *      bulk of the file and the part most at risk of silent drift — scoring changes are
 *      user-visible as reordering of the type-ahead results.
 *
 * Subclass-specific search behaviour is tested in the per-subclass files; here we only
 * exercise the base's own code paths.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI;

use MediaWiki\Api\ApiMain;
use MediaWiki\Api\ApiQuery;
use MediaWiki\Api\ApiUsageException;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\ActionAPI\ApiQueryZObjectLabels;
use MediaWiki\Extension\WikiLambda\ActionAPI\WikiLambdaApiQueryGeneratorBase;
use Psr\Log\NullLogger;
use Wikimedia\TestingAccessWrapper;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\WikiLambdaApiQueryGeneratorBase
 *
 * @group API
 * @group Database
 */
class WikiLambdaApiQueryGeneratorBaseTest extends WikiLambdaApiTestCase {

	// ------------------------------------------------------------------
	// execute() / executeGenerator() — repo-mode guard
	// ------------------------------------------------------------------

	/**
	 * Obtain a fully service-wired ApiQuery instance, via the ApiMain module manager
	 * (ApiQuery's own constructor takes six services we'd otherwise have to assemble).
	 */
	private function newApiQuery(): ApiQuery {
		$context = RequestContext::getMain();
		$main = new ApiMain( $context );
		return $main->getModuleManager()->getModule( 'query' );
	}

	/**
	 * Build a real ApiQueryZObjectLabels instance. Only used as a handy concrete subclass
	 * to exercise the *base* class's guards; subclass behaviour is tested elsewhere.
	 */
	private function newConcreteModule(): ApiQueryZObjectLabels {
		return new ApiQueryZObjectLabels( $this->newApiQuery(), 'wikilambdasearch_labels' );
	}

	public function testExecute_diesWhenRepoModeDisabled() {
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', false );

		$module = $this->newConcreteModule();

		$this->expectException( ApiUsageException::class );
		$module->execute();
	}

	public function testExecuteGenerator_diesWhenRepoModeDisabled() {
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', false );

		$module = $this->newConcreteModule();

		$this->expectException( ApiUsageException::class );
		$module->executeGenerator( null );
	}

	// ------------------------------------------------------------------
	// Default run() — base throws so forgetful subclasses fail loudly
	// ------------------------------------------------------------------

	public function testRun_defaultImplementationThrows() {
		$query = $this->newApiQuery();

		// An anonymous subclass that inherits the default run() from the base.
		$module = new class( $query, 'wikilambda_test_generator' ) extends WikiLambdaApiQueryGeneratorBase {
		};

		$wrapper = TestingAccessWrapper::newFromObject( $module );

		$this->expectException( ApiUsageException::class );
		$wrapper->run( null );
	}

	// ------------------------------------------------------------------
	// Logger plumbing
	// ------------------------------------------------------------------

	public function testLogger_roundTrip() {
		$module = $this->newConcreteModule();

		$logger = new NullLogger();
		$module->setLogger( $logger );

		$this->assertSame(
			$logger,
			$module->getLogger(),
			'getLogger() returns whatever setLogger() last received'
		);
	}

	// ------------------------------------------------------------------
	// getMatchRate() — ranking signal for the type-ahead
	// ------------------------------------------------------------------

	/**
	 * Invoke the protected static getMatchRate() via TestingAccessWrapper.
	 */
	private function getMatchRate( string $substring, string $hit, bool $exact = false ): float {
		$wrapper = TestingAccessWrapper::newFromClass( WikiLambdaApiQueryGeneratorBase::class );
		return $wrapper->getMatchRate( $substring, $hit, $exact );
	}

	public function testGetMatchRate_whitespaceOnlySubstringReturnsZero() {
		// trim() collapses to '' and PREG_SPLIT_NO_EMPTY yields zero tokens —
		// the early-return guard against divide-by-zero in the aggregation loop.
		$this->assertSame( 0.0, $this->getMatchRate( '   ', 'hello' ) );
	}

	public function testGetMatchRate_completelyAbsentSubstringReturnsZero() {
		$this->assertSame( 0.0, $this->getMatchRate( 'xyz', 'hello' ) );
	}

	public function testGetMatchRate_identicalStringsScoreHigh() {
		$rate = $this->getMatchRate( 'hello', 'hello' );
		$this->assertGreaterThan( 0.9, $rate, 'Identical strings score near 1.0' );
		$this->assertLessThanOrEqual( 1.0, $rate );
	}

	public function testGetMatchRate_allRatesAreBounded() {
		// Sanity: whatever the inputs, the aggregated rate stays in [0, 1].
		foreach ( [
			[ 'foo', 'foobar' ],
			[ 'bar', 'foobar' ],
			[ 'foo bar', 'foo baz' ],
			[ 'completely different', 'hello world' ],
		] as [ $substring, $hit ] ) {
			$rate = $this->getMatchRate( $substring, $hit );
			$this->assertGreaterThanOrEqual( 0.0, $rate, "rate('$substring', '$hit')" );
			$this->assertLessThanOrEqual( 1.0, $rate, "rate('$substring', '$hit')" );
		}
	}

	public function testGetMatchRate_substringAtStartScoresHigherThanInMiddle() {
		// Position scoring: a substring that starts the hit should beat one in the middle.
		$atStart = $this->getMatchRate( 'hel', 'hello' );
		$inMiddle = $this->getMatchRate( 'llo', 'hello' );
		$this->assertGreaterThan(
			$inMiddle,
			$atStart,
			'Earlier position in the hit weighs more heavily'
		);
	}

	public function testGetMatchRate_prefixTokenBoostFavoursFirstTokenOnPrefix() {
		// First token matches the start of the hit → prefix-boost factor (1.5×) applies.
		// Same tokens in reverse order: 'hello' is now the second token, no boost.
		$firstTokenPrefix = $this->getMatchRate( 'hello world', 'hello there' );
		$secondTokenPrefix = $this->getMatchRate( 'world hello', 'hello there' );
		$this->assertGreaterThan(
			$secondTokenPrefix,
			$firstTokenPrefix,
			'PREFIX_BOOST_FACTOR rewards the first-token-at-start-of-hit case'
		);
	}

	public function testGetMatchRate_caseInsensitiveWhenExactFalse() {
		// Default path normalises via ZObjectUtils::comparableString (lower-cases etc.),
		// so differing case should still score as a strong match.
		$mixed = $this->getMatchRate( 'HELLO', 'hello', false );
		$this->assertGreaterThan(
			0.9,
			$mixed,
			'Case differences are erased by comparableString in the non-exact path'
		);
	}

	public function testGetMatchRate_exactTrueSkipsNormalisation() {
		// With exact=true, comparableString is bypassed — 'HELLO' is not a substring of
		// 'hello', and the sole token 'HELLO' also doesn't appear in the lowercase hit,
		// so the score collapses to zero. This is the whole purpose of the flag.
		$rate = $this->getMatchRate( 'HELLO', 'hello', true );
		$this->assertSame( 0.0, $rate, 'exact=true preserves case, so case-only mismatches score 0' );
	}

	public function testGetMatchRate_partialTokenCoverageScoresBetweenZeroAndOne() {
		// 'foo' is missing from the hit, 'world' is present → some tokens matched,
		// some not. Score should be strictly positive and strictly below what full
		// coverage would give.
		$partial = $this->getMatchRate( 'foo world', 'hello world' );
		$this->assertGreaterThan( 0.0, $partial, 'Partial coverage scores above zero' );

		$full = $this->getMatchRate( 'hello world', 'hello world' );
		$this->assertLessThan( $full, $partial, 'Partial coverage scores below full coverage' );
	}
}
