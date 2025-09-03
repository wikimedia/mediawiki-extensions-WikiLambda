<?php

namespace MediaWiki\Extension\WikiLambda\ActionAPI;

use MediaWiki\Api\ApiPageSet;
use MediaWiki\Api\ApiQueryGeneratorBase;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerInterface;

/**
 * WikiLambda Query Generator Base API util
 *
 * This abstract class extends the Wikimedia's ApiBase class
 * and provides specific additional methods.
 *
 * @stable to extend
 *
 * @ingroup API
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
abstract class WikiLambdaApiQueryGeneratorBase extends ApiQueryGeneratorBase implements LoggerAwareInterface {

	protected LoggerInterface $logger;

	/**
	 * @inheritDoc
	 */
	public function execute() {
		// Exit if we're running in non-repo mode (e.g. on a client wiki)
		if ( !$this->getConfig()->get( 'WikiLambdaEnableRepoMode' ) ) {
			WikiLambdaApiBase::dieWithZError(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN,
					[]
				),
				HttpStatus::BAD_REQUEST
			);
		}

		$this->run( null );
	}

	/**
	 * @inheritDoc
	 */
	public function executeGenerator( $resultPageSet ) {
		// Exit if we're running in non-repo mode (e.g. on a client wiki)
		if ( !$this->getConfig()->get( 'WikiLambdaEnableRepoMode' ) ) {
			WikiLambdaApiBase::dieWithZError(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN,
					[]
				),
				HttpStatus::BAD_REQUEST
			);
		}

		$this->run( $resultPageSet );
	}

	/**
	 * @param ApiPageSet|null $resultPageSet
	 */
	protected function run( $resultPageSet ) {
		// Throw, not implemented
		WikiLambdaApiBase::dieWithZError(
			ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
				[ 'You must implement your run() method when using WikiLambdaApiBase' ]
			),
			HttpStatus::NOT_IMPLEMENTED
		);
	}

	/** @inheritDoc */
	public function setLogger( LoggerInterface $logger ): void {
		$this->logger = $logger;
	}

	/** @inheritDoc */
	public function getLogger(): LoggerInterface {
		return $this->logger;
	}

	private const PREFIX_BOOST_FACTOR = 1.5;
	private const POSITION_WEIGHT_FACTOR = 3.5;
	private const COVERAGE_FACTOR = 0.3;

	/**
	 * Return the float match rate between a substring and the returned hit.
	 * The match rate is an aggregation of the match rates of each substring token.
	 *
	 * @param string $substring
	 * @param string $hit
	 * @param bool $exact
	 * @return float
	 */
	protected static function getMatchRate( $substring, $hit, $exact = false ) {
		if ( !$exact ) {
			$substring = ZObjectUtils::comparableString( $substring );
			$hit = ZObjectUtils::comparableString( $hit );
		}

		// Try match rate of full search term if substring is part of the hit
		if ( strpos( $hit, $substring ) !== false ) {
			return self::getSubstringMatchRate( $substring, $hit );
		}

		// Tokenize substring and calculate match rate for each token
		$tokens = preg_split( '/\s+/', trim( $substring ), -1, PREG_SPLIT_NO_EMPTY );
		if ( count( $tokens ) === 0 ) {
			return 0.0;
		}

		$weightedSum = 0;
		$totalWeight = 0;
		$matchedTokens = 0;

		// Aggregate weighted token's rates
		foreach ( $tokens as $index => $token ) {
			$rate = self::getSubstringMatchRate( $token, $hit );

			// Count number of matched tokens to promote full token coverate
			if ( $rate > 0 ) {
				$matchedTokens++;
			}

			// Boost if first token matches the first characters of the hit
			if ( $index === 0 && strpos( $hit, $token ) === 0 ) {
				$rate = min( 1.0, $rate * self::PREFIX_BOOST_FACTOR );
			}

			// Weight by token length
			$lengthWeight = strlen( $token );
			// Weight by token position
			$positionWeight = ( 1 / ( $index + 1 ) ) * self::POSITION_WEIGHT_FACTOR;
			// Combined weights
			$weight = $lengthWeight + $positionWeight;

			$weightedSum += $rate * $weight;
			$totalWeight += $weight;
		}

		$baseScore = ( $weightedSum / $totalWeight ) * ( 1 - self::COVERAGE_FACTOR );
		$coverageScore = ( $matchedTokens / count( $tokens ) ) * self::COVERAGE_FACTOR;

		return $baseScore + $coverageScore;
	}

	/**
	 * Calculates the float match rate between a substring token and the returned hit.
	 * The match rate is calculated considering:
	 * * Levenshtein distance
	 * * Position score
	 *
	 * @param string $substring
	 * @param string $hit
	 * @return float
	 */
	private static function getSubstringMatchRate( $substring, $hit ) {
		// Zero score if token not present at all
		if ( strpos( $hit, $substring ) === false ) {
			return 0.0;
		}

		// Calculate the base match rate with the Levenshtein distance
		$distance = levenshtein( $substring, $hit );
		$max = max( strlen( $substring ), strlen( $hit ) );
		$baseMatchRate = ( $max - $distance ) / $max;

		// Find the position of the substring in the hit
		$position = strpos( $hit, $substring );

		// Normalize the position to a score (earlier positions get higher weight)
		$positionScore = 1 - ( $position / strlen( $hit ) );

		// Combine the base match rate and position score
		return $baseMatchRate * 0.5 + $positionScore * 0.5;
	}
}
