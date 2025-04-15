<?php
/**
 * WikiLambda ZObject simple fetching REST API
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\RESTAPI;

use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Rest\LocalizedHttpException;
use MediaWiki\Rest\SimpleHandler;
use Psr\Log\LoggerInterface;
use Wikimedia\Message\MessageValue;

/**
 * Simple REST API to fetch the latest versions of one or more ZObjects
 * via GET /wikifunctions/v0/fetch/{zids}
 */
abstract class WikiLambdaRESTHandler extends SimpleHandler {

	protected LoggerInterface $logger;

	/**
	 * @return never
	 */
	protected function dieRESTfullyWithZError( ZError $zerror, int $code = 500, array $errorData = [] ) {
		try {
			$errorData['errorData'] = $zerror->getErrorData();
		} catch ( ZErrorException $e ) {
			// Generating the human-readable error data itself threw. Oh dear.

			$this->logger->warning(
				__METHOD__ . ' called but an error was thrown when trying to report an error',
				[
					'zerror' => $zerror->getSerialized(),
					'error' => $e,
				]
			);

			$errorData['errorData'] = [ 'zerror' => $zerror->getSerialized() ];
		}

		$this->dieRESTfully( 'wikilambda-zerror', [ $zerror->getZErrorType() ], $code, $errorData );
	}

	/**
	 * @return never
	 */
	protected function dieRESTfully( string $messageKey, array $spec, int $code, array $errorData = [] ) {
		throw new LocalizedHttpException(
			new MessageValue( $messageKey, $spec ), $code, $errorData
		);
	}
}
