<?php

namespace MediaWiki\Extension\WikiLambda\ActionAPI;

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
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
abstract class WikiLambdaApiQueryGeneratorBase extends \ApiQueryGeneratorBase implements LoggerAwareInterface {

	protected LoggerInterface $logger;

	/**
	 * @inheritDoc
	 */
	public function execute() {
		$this->run( null );
	}

	/**
	 * @inheritDoc
	 */
	public function executeGenerator( $resultPageSet ) {
		$this->run( $resultPageSet );
	}

	/**
	 * @param \ApiPageSet|null $resultPageSet
	 */
	protected function run( $resultPageSet ) {
		// Throw, not implemented
		WikiLambdaApiBase::dieWithZError(
			ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
				[ 'You must implement your run() method when using WikiLambdaApiBase' ]
			),
			501
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
}
