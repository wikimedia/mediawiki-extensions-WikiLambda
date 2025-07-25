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

use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\Rest\ResponseInterface;
use MediaWiki\Title\Title;
use Wikimedia\ParamValidator\ParamValidator;
use Wikimedia\Telemetry\SpanInterface;

/**
 * Simple REST API to fetch the latest versions of one or more ZObjects
 * via GET /wikifunctions/v0/fetch/{zids}
 */
class FetchHandler extends WikiLambdaRESTHandler {

	public const MAX_REQUESTED_ZIDS = 50;
	private ZTypeRegistry $typeRegistry;

	/** @inheritDoc */
	public function run( $ZIDs, $revisions = [] ) {
		// This API is only availble on the repo installation, not client wikis
		if ( !MediaWikiServices::getInstance()->getMainConfig()->get( 'WikiLambdaEnableRepoMode' ) ) {
			$this->dieRESTfully( 'wikilambda-restapi-disabled-repo-mode-only', [], HttpStatus::BAD_REQUEST );
		}

		$this->typeRegistry = ZTypeRegistry::singleton();
		$this->logger = LoggerFactory::getInstance( 'WikiLambda' );

		$tracer = MediaWikiServices::getInstance()->getTracer();
		$span = $tracer->createSpan( 'WikiLambda FetchHandler' )
			->setSpanKind( SpanInterface::SPAN_KIND_CLIENT )
			->start();
		$span->activate();

		$responseList = [];

		// (T391046) Parse as null if not specified.
		$language = $this->getRequest()->getQueryParams()['language'] ?? null;
		// (T391046) Fallback to not recurse through dependencies if not specified.
		$getDependencies = $this->getRequest()->getQueryParams()['getDependencies'] ?? false;

		if ( count( $revisions ) > 0 && ( count( $revisions ) !== count( $ZIDs ) ) ) {
			$errorMessage = "You must specify a revision for each ZID, or none at all.";
			$zErrorObject = ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
				[
					'message' => $errorMessage
				]
			);
			$this->dieRESTfullyWithZError( $zErrorObject, HttpStatus::BAD_REQUEST );
		}

		$reqSize = count( $ZIDs );
		if ( $reqSize > self::MAX_REQUESTED_ZIDS ) {
			$this->dieRESTfully(
				'wikilambda-restapi-fetch-too-many',
				[ $reqSize, self::MAX_REQUESTED_ZIDS ],
				HttpStatus::FORBIDDEN
			);
		}

		$extraDependencies = [];

		foreach ( $ZIDs as $index => $ZID ) {
			if ( !ZObjectUtils::isValidZObjectReference( mb_strtoupper( $ZID ) ) ) {
				$zErrorObject = ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_INVALID_REFERENCE,
					[ 'data' => $ZID ]
				);
				$this->dieRESTfullyWithZError( $zErrorObject, HttpStatus::NOT_FOUND );
			} else {
				$title = Title::newFromText( $ZID, NS_MAIN );

				if ( !$title || !( $title instanceof Title ) || !$title->exists() ) {
					$zErrorObject = ZErrorFactory::createZErrorInstance(
						ZErrorTypeRegistry::Z_ERROR_UNKNOWN_REFERENCE,
						[ 'data' => $ZID ]
					);
					$this->dieRESTfullyWithZError( $zErrorObject, HttpStatus::NOT_FOUND );
				} else {
					$revision = $revisions[$index] ?? null;

					try {
						$fetchedContent = ZObjectContentHandler::getExternalRepresentation(
							$title, $language, $revision
						);
						$span->setSpanStatus( SpanInterface::SPAN_STATUS_OK );
					} catch ( ZErrorException $error ) {
						$span->setSpanStatus( SpanInterface::SPAN_STATUS_ERROR )
							->setAttributes( [
								'response.status_code' => 404,
								'exception.message' => $error->getMessage()
							] );
						// This probably means that the requested revision is not known; return
						// null for this entry rather than throwing or returning a ZError instance.
						$this->dieRESTfully(
							'wikilambda-restapi-revision-mismatch',
							[ $revision, $ZID ],
							HttpStatus::NOT_FOUND );
					} finally {
						$span->end();
					}

					$responseList[ $ZID ] = $fetchedContent;

					if ( $getDependencies ) {
						$dependencies = $this->getTypeDependencies( json_decode( $fetchedContent ) ?? [] );
						foreach ( $dependencies as $_key => $dep ) {
							if ( in_array( $dep, $ZIDs ) ) {
								continue;
							}
							$extraDependencies[] = $dep;
						}
					}
				}
			}
		}

		// We use array_unique to de-duplicate dependencies if they're used multiple times
		foreach ( array_unique( $extraDependencies ) as $_key => $ZID ) {
			$responseList[$ZID] = ZObjectContentHandler::getExternalRepresentation(
				Title::newFromText( $ZID, NS_MAIN ),
				$language,
				// Get latest, as we have no revision to request.
				null
			);
		}

		$response = $this->getResponseFactory()->createJson( $responseList );
		return $response;
	}

	/**
	 * Returns the types of type keys and function arguments
	 *
	 * @param \stdClass $zobject
	 * @return array
	 */
	private function getTypeDependencies( $zobject ) {
		$dependencies = [];

		// We need to return dependencies of those objects that build arguments of keys:
		// Types: return the types of its keys
		// Functions: return the types of its arguments
		$content = $zobject->{ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE };
		if (
			is_array( $content ) ||
			is_string( $content ) ||
			!property_exists( $content, ZTypeRegistry::Z_OBJECT_TYPE )
		) {
			return $dependencies;
		}

		$type = $content->{ ZTypeRegistry::Z_OBJECT_TYPE };
		if ( $type === ZTypeRegistry::Z_TYPE ) {
			$keys = $content->{ ZTypeRegistry::Z_TYPE_KEYS };
			foreach ( array_slice( $keys, 1 ) as $key ) {
				$keyType = $key->{ ZTypeRegistry::Z_KEY_TYPE };
				if ( is_string( $keyType ) && ( !$this->typeRegistry->isZTypeBuiltIn( $keyType ) ) ) {
					array_push( $dependencies, $keyType );
				}
			}
		} elseif ( $type === ZTypeRegistry::Z_FUNCTION ) {
			$args = $content->{ ZTypeRegistry::Z_FUNCTION_ARGUMENTS };
			foreach ( array_slice( $args, 1 ) as $arg ) {
				$argType = $arg->{ ZTypeRegistry::Z_ARGUMENTDECLARATION_TYPE };
				if ( is_string( $argType ) && ( !$this->typeRegistry->isZTypeBuiltIn( $argType ) ) ) {
					array_push( $dependencies, $argType );
				}
			}
		}

		return array_unique( $dependencies );
	}

	public function applyCacheControl( ResponseInterface $response ) {
		if ( $response->getStatusCode() >= 200 && $response->getStatusCode() < 400 ) {
			$response->setHeader( 'Cache-Control', 'public,must-revalidate,s-maxage=' . 60 * 60 * 24 );
		}
	}

	/** @inheritDoc */
	public function needsWriteAccess() {
		return false;
	}

	/** @inheritDoc */
	public function getParamSettings() {
		$zObjectStore = WikiLambdaServices::getZObjectStore();

		// Don't try to read the supported languages from the DB on client wikis, we can't.
		$supportedLanguageCodes =
			( MediaWikiServices::getInstance()->getMainConfig()->get( 'WikiLambdaEnableRepoMode' ) ) ?
				$zObjectStore->fetchAllZLanguageCodes() :
				[];

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
				ParamValidator::PARAM_TYPE => $supportedLanguageCodes,
				ParamValidator::PARAM_DEFAULT => null,
				ParamValidator::PARAM_REQUIRED => false,
			],
			'getDependencies' => [
				self::PARAM_SOURCE => 'query',
				ParamValidator::PARAM_TYPE => 'boolean',
				ParamValidator::PARAM_DEFAULT => false,
				ParamValidator::PARAM_REQUIRED => false,
			],
		];
	}
}
