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

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Rest\LocalizedHttpException;
use MediaWiki\Rest\ResponseInterface;
use MediaWiki\Rest\SimpleHandler;
use MediaWiki\Title\Title;
use Wikimedia\Message\MessageValue;
use Wikimedia\ParamValidator\ParamValidator;

/**
 * Simple REST API to fetch the latest versions of one or more ZObjects
 * via GET /wikifunctions/v0/fetch/{zids}
 */
class FetchHandler extends SimpleHandler {

	public const MAX_REQUESTED_ZIDS = 50;

	/** @inheritDoc */
	public function run( $ZIDs, $revisions = [] ) {
		$responseList = [];

		$language = $this->getRequest()->getQueryParams()['language'];

		if ( count( $revisions ) > 0 && ( count( $revisions ) !== count( $ZIDs ) ) ) {
			$zErrorObject = ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
				[
					'message' => "You must specify a revision for each ZID, or none at all."
				]
			);
			$this->dieRESTfullyWithZError( $zErrorObject, 400 );
		}

		$reqSize = count( $ZIDs );
		if ( $reqSize > self::MAX_REQUESTED_ZIDS ) {
			$this->dieRESTfully( 'wikilambda-restapi-fetch-too-many', [ $reqSize, self::MAX_REQUESTED_ZIDS ], 403 );
		}

		foreach ( $ZIDs as $index => $ZID ) {
			if ( !ZObjectUtils::isValidZObjectReference( mb_strtoupper( $ZID ) ) ) {
				$zErrorObject = ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_INVALID_REFERENCE,
					[ 'data' => $ZID ]
				);
				$this->dieRESTfullyWithZError( $zErrorObject, 404 );
			} else {
				$title = Title::newFromText( $ZID, NS_MAIN );

				if ( !$title || !( $title instanceof Title ) || !$title->exists() ) {
					$zErrorObject = ZErrorFactory::createZErrorInstance(
						ZErrorTypeRegistry::Z_ERROR_UNKNOWN_REFERENCE,
						[ 'data' => $ZID ]
					);
					$this->dieRESTfullyWithZError( $zErrorObject, 404 );
				} else {
					$revision = $revisions[$index] ?? null;

					try {
						$fetchedContent = ZObjectContentHandler::getExternalRepresentation(
							$title, $language, $revision
						);
					} catch ( ZErrorException $error ) {
						// This probably means that the requested revision is not known; return
						// null for this entry rather than throwing or returning a ZError instance.
						$this->dieRESTfully( 'wikilambda-restapi-revision-mismatch', [ $revision, $ZID ], 404 );
					}

					$responseList[ $ZID ] = $fetchedContent;
				}
			}
		}

		$response = $this->getResponseFactory()->createJson( $responseList );

		return $response;
	}

	public function applyCacheControl( ResponseInterface $response ) {
		if ( $response->getStatusCode() >= 200 && $response->getStatusCode() < 400 ) {
			$response->setHeader( 'Cache-Control', 'public,must-revalidate,s-max-age=' . 60 * 60 * 24 );
		}
	}

	/** @inheritDoc */
	public function needsWriteAccess() {
		return false;
	}

	/** @inheritDoc */
	public function getParamSettings() {
		$zObjectStore = WikiLambdaServices::getZObjectStore();

		return [
			'zids' => [
				self::PARAM_SOURCE => 'path',
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_ISMULTI => true,
				ParamValidator::PARAM_REQUIRED => true,
			],
			'revisions' => [
				self::PARAM_SOURCE => 'path',
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_ISMULTI => true,
				ParamValidator::PARAM_REQUIRED => false,
			],
			'language' => [
				self::PARAM_SOURCE => 'query',
				ParamValidator::PARAM_TYPE => $zObjectStore->fetchAllZLanguageCodes(),
				ParamValidator::PARAM_DEFAULT => null,
				ParamValidator::PARAM_REQUIRED => false,
			],
		];
	}

	private function dieRESTfullyWithZError( ZError $zerror, int $code = 500, array $errorData = [] ) {
		try {
			$errorData['errorData'] = $zerror->getErrorData();
		} catch ( ZErrorException $e ) {
			// Generating the human-readable error data itself threw. Oh dear.

			LoggerFactory::getInstance( 'WikiLambda' )->warning(
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
	private function dieRESTfully( string $messageKey, array $spec, int $code, array $errorData = [] ) {
		throw new LocalizedHttpException(
			new MessageValue( $messageKey, $spec ), $code, $errorData
		);
	}
}
