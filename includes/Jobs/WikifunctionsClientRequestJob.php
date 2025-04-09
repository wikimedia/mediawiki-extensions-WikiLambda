<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Jobs;

use Exception;
use MediaWiki\Config\Config;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikifunctionCallException;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\JobQueue\GenericParameterJob;
use MediaWiki\JobQueue\Job;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MWHttpRequest;
use Psr\Log\LoggerInterface;
use Wikimedia\ObjectCache\BagOStuff;

/**
 * Asynchronous job run on the client wiki to request a function call from the repo, turning
 * that into a fragment rendering for the page.
 */
class WikifunctionsClientRequestJob extends Job implements GenericParameterJob {

	private Config $config;
	private HttpRequestFactory $httpRequestFactory;
	private BagOStuff $objectCache;
	private LoggerInterface $logger;

	public function __construct( array $params ) {
		// This job, triggered the Parsoid callback for rendering a function, tries to make a network request for the
		// content.

		parent::__construct( 'wikifunctionsClientRequest', $params );

		$this->logger = LoggerFactory::getInstance( 'WikiLambdaClient' );
		$this->objectCache = WikiLambdaServices::getZObjectStash();

		$this->config = MediaWikiServices::getInstance()->getConfigFactory()->makeConfig( 'WikiLambda' );
		$this->httpRequestFactory = MediaWikiServices::getInstance()->getHttpRequestFactory();

		$this->params = $params;

		$this->logger->debug(
			__CLASS__ . ' created for {targetZObject} — {params}',
			[
				'targetZObject' => $params['request']['target'],
				'params' => var_export( $params['request']['arguments'], true ),
			]
		);
	}

	/** @inheritDoc */
	public function ignoreDuplicates() {
		// We've carefully chosen the parameters so this Job is shared across multiple uses, so don't run it
		// in parallel and have MediaWiki de-duplicate requests.
		return true;
	}

	/**
	 * @return bool
	 */
	public function run() {
		$request = $this->params['request'];

		$this->logger->debug(
			__CLASS__ . ' initiated for {targetZObject}',
			[
				'targetZObject' => $request['target']
			]
		);

		$clientCacheKey = $this->params['clientCacheKey'];

		$targetFunction = $request['target'];
		$arguments = $request['arguments'];
		$parseLang = $request['parseLang'];
		$renderLang = $request['renderLang'];

		try {
			$output = $this->remoteCall( $targetFunction, $arguments, $parseLang, $renderLang );

			// We don't actually use the return value immediately, we rely on Parsoid to re-trigger the request
			// and so use the cached value, so we just set() it.
			$this->objectCache->set(
				$clientCacheKey,
				[
					'success' => true,
					'value' => $output
				],
				$this->objectCache::TTL_WEEK
			);

			$this->logger->debug(
				__CLASS__ . ' success for {targetZObject}',
				[
					'targetZObject' => $request['target']
				]
			);
			return true;
		} catch ( WikifunctionCallException $callException ) {
			// WikifunctionCallException: we know details of the error
			$errorMessageKey = $callException->getErrorMessageKey();
		} catch ( Exception $e ) {
			// Unhandled exception: we have no details on how the error happened
			$this->logger->error(
				__CLASS__ . '::remoteCall threw an unhandled Exception: {error}',
				[
					'error' => $e->getMessage(),
					'exception' => $e
				]
			);

			// Show unclear error or system failure
			$errorMessageKey = 'wikilambda-functioncall-error-unclear';
		}

		$this->objectCache->set(
			$clientCacheKey,
			[
				'success' => false,
				'errorMessageKey' => $errorMessageKey,
			],
			$this->objectCache::TTL_WEEK
		);

		$this->logger->debug(
			__CLASS__ . ' failure for {targetZObject}, error: {errorMessageKey}',
			[
				'errorMessageKey' => $errorMessageKey,
				'targetZObject' => $request['target']
			]
		);

		// Our call has been triggered and has run, so return true so that our job isn't re-tried.
		return true;
	}

	/**
	 *
	 * @param string $target The ZID of the function to call
	 * @param string[] $arguments The function call parameters
	 * @param string $parseLanguageCode The language code in which to parse inputs, e.g. 'de'
	 * @param string $renderLanguageCode The language code in which to render outputs, e.g. 'fr'
	 *
	 * @throws WikifunctionCallException A known error happened
	 * @throws Exception An unknown error happened
	 */
	private function remoteCall(
		string $target,
		array $arguments,
		string $parseLanguageCode,
		string $renderLanguageCode
	): array {
		$request = $this->buildRequest( $target, $arguments, $parseLanguageCode, $renderLanguageCode );

		$responseStatus = $request->execute();

		// Http 0: Request didn't fly
		$httpStatusCode = $request->getStatus();
		if ( $httpStatusCode === 0 ) {
			$zerror = ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
				[ "message" => $responseStatus->getMessages()[0]->getKey() ]
			);
			// Triggers use of messages:
			// * wikilambda-functioncall-error-unclear-category
			// * wikilambda-functioncall-error-unclear-category-desc
			throw new WikifunctionCallException( $zerror, 'wikilambda-functioncall-error-unclear' );
		}

		// Http 200: Response successful
		$response = json_decode( $request->getContent() );
		if ( $response && $responseStatus->isOK() ) {
			return [ $response->value ];
		}

		// If not OK, process error responses:
		// If errorKey is 'wikilambda-zerror', extract ZError and ZError code
		$zerror = null;
		$zerrorCode = null;
		if ( $response && property_exists( $response, 'errorKey' ) && $response->errorKey === 'wikilambda-zerror' ) {
			$zerror = ZObjectFactory::create( $response->errorData->zerror );
			'@phan-var ZError $zerror';
			$zerrorCode = $zerror->getZErrorType();
		} else {
			$this->logger->warning(
				__METHOD__ . ' encountered an error response {httpStatusCode} with a broken ZError: {response}',
				[
					'httpStatusCode' => $httpStatusCode,
					'response' => var_export( $response, true )
				]
			);

			$zerror = ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
				[ "message" => $response->httpReason ]
			);
			// Triggers use of messages:
			// * wikilambda-functioncall-error-unclear-category
			// * wikilambda-functioncall-error-unclear-category-desc
			throw new WikifunctionCallException( $zerror, 'wikilambda-functioncall-error-unclear' );
		}

		$this->logger->debug(
			__METHOD__ . ' encountered an error response {httpStatusCode}: {zerrorCode}',
			[
				'httpStatusCode' => $httpStatusCode,
				'zerrorCode' => $zerrorCode
			]
		);

		switch ( $httpStatusCode ) {
			// HTTP 400: Bad Request
			// Something is wrong with the content (e.g. in the user request or the on-wiki content on WF.org)
			case 400:
			case 404:
				switch ( $zerrorCode ) {
					case ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND:
						// Error cases:
						// * Function not found
						// * Input reference not found
						// Triggers use of messages:
						// * wikilambda-functioncall-error-unknown-zid-category
						// * wikilambda-functioncall-error-unknown-zid-category-desc
						throw new WikifunctionCallException( $zerror, 'wikilambda-functioncall-error-unknown-zid' );

					case ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED:
						// Error cases:
						// * Function object found but not valid
						// Triggers use of messages:
						// * wikilambda-functioncall-error-invalid-zobject-category
						// * wikilambda-functioncall-error-invalid-zobject-category-desc
						throw new WikifunctionCallException( $zerror, 'wikilambda-functioncall-error-invalid-zobject' );

					case ZErrorTypeRegistry::Z_ERROR_ARGUMENT_TYPE_MISMATCH:
						switch ( $response->mode ) {
							case 'function':
								// Error cases:
								// * Function Zid belongs to an object of a different type
								// Triggers use of messages:
								// * wikilambda-functioncall-error-nonfunction-category
								// * wikilambda-functioncall-error-nonfunction-category-desc
								throw new WikifunctionCallException(
									$zerror,
									'wikilambda-functioncall-error-nonfunction'
								);

							case 'input':
								// Error cases:
								// * Input reference belongs to an object of an unexpected type
								// Triggers use of messages:
								// * wikilambda-functioncall-error-bad-input-type-category
								// * wikilambda-functioncall-error-bad-input-type-category-desc
								throw new WikifunctionCallException(
									$zerror,
									'wikilambda-functioncall-error-bad-input-type'
								);

							default:
								break;
						}
						// Fall-back to default handling, below.
						break;

					case ZErrorTypeRegistry::Z_ERROR_LANG_NOT_FOUND:
						// Error cases:
						// * parser lang code not found
						// * renderer lang code not found
						// Triggers use of messages:
						// * wikilambda-functioncall-error-bad-langs-category
						// * wikilambda-functioncall-error-bad-langs-category-desc
						throw new WikifunctionCallException( $zerror, 'wikilambda-functioncall-error-bad-langs' );

					case ZErrorTypeRegistry::Z_ERROR_ARGUMENT_COUNT_MISMATCH:
						// Error cases:
						// * wrong number of arguments
						// Triggers use of messages:
						// * wikilambda-functioncall-error-bad-inputs-category
						// * wikilambda-functioncall-error-bad-inputs-category-desc
						throw new WikifunctionCallException( $zerror, 'wikilambda-functioncall-error-bad-inputs' );

					case ZErrorTypeRegistry::Z_ERROR_NOT_IMPLEMENTED_YET:
						switch ( $response->mode ) {
							case 'input':
								// Error cases:
								// * input type is generic
								// * input type has no parser
								// Triggers use of messages:
								// * wikilambda-functioncall-error-nonstringinput-category
								// * wikilambda-functioncall-error-nonstringinput-category-desc
								throw new WikifunctionCallException(
									$zerror,
									'wikilambda-functioncall-error-nonstringinput'
								);

							case 'output':
								// Error cases:
								// * output type is generic
								// * output type has no renderer
								// Triggers use of messages:
								// * wikilambda-functioncall-error-nonstringoutput-category
								// * wikilambda-functioncall-error-nonstringoutput-category-desc
								throw new WikifunctionCallException(
									$zerror,
									'wikilambda-functioncall-error-nonstringoutput'
								);

							default:
								break;
						}
						// Fall-back to default handling, below.
						break;

					case ZErrorTypeRegistry::Z_ERROR_API_FAILURE:
						// Error cases:
						// * some error happened trying to make the request to the orchestrator
						// Triggers use of messages:
						// * wikilambda-functioncall-error-unclear-category
						// * wikilambda-functioncall-error-unclear-category-desc
						throw new WikifunctionCallException( $zerror, 'wikilambda-functioncall-error-unclear' );

					case ZErrorTypeRegistry::Z_ERROR_EVALUATION:
						// Error cases:
						// * some error happened in the orchestrator
						// Triggers use of messages:
						// * wikilambda-functioncall-error-evaluation-category
						// * wikilambda-functioncall-error-evaluation-category-desc
						throw new WikifunctionCallException( $zerror, 'wikilambda-functioncall-error-evaluation' );

					case ZErrorTypeRegistry::Z_ERROR_INVALID_EVALUATION_RESULT:
						// Error cases:
						// * orchestrator returned a non-error output but of wrong type
						// Triggers use of messages:
						// * wikilambda-functioncall-error-bad-output-category
						// * wikilambda-functioncall-error-bad-output-category-desc
						throw new WikifunctionCallException( $zerror, 'wikilambda-functioncall-error-bad-output' );

					default:
						// Non zerror, or Unknown zerror:
						$this->logger->error(
							__METHOD__ . ' encountered a {$httpStatusCode} HTTP error with an unknown zerror',
							[
								'zerror' => $zerror->getSerialized(),
								'zerrorCode' => $zerrorCode,
								'httpStatusCode' => $httpStatusCode,
								'response' => $response
							]
						);
				}
				// Fall-back to default handling, below.
				break;

			// HTTP 500: Internal Server Error
			// Something went wrong in the server's code (not user-written code or user error)
			case 500:
			case 501:
				switch ( $zerrorCode ) {
					case ZErrorTypeRegistry::Z_ERROR_NOT_IMPLEMENTED_YET:
						// Error cases:
						// * Wikifunctions Repo service is disabled
						// Triggers use of messages:
						// * wikilambda-functioncall-error-disabled-category
						// * wikilambda-functioncall-error-disabled-category-desc
						throw new WikifunctionCallException( $zerror, 'wikilambda-functioncall-error-disabled' );

					default:
						$this->logger->error(
							__METHOD__ . ' encountered a {$httpStatusCode} HTTP error with an unknown zerror',
							[
								'zerror' => $zerror->getSerialized(),
								'zerrorCode' => $zerrorCode,
								'httpStatusCode' => $httpStatusCode,
								'response' => $response
							]
						);
						// Fall-back to default handling, below.
						break;
				}
				break;

			default:
				$this->logger->warning(
					__METHOD__ . ' encountered an unknown HTTP error code',
					[
						'zerror' => $zerror->getSerialized(),
						'zerrorCode' => $zerrorCode,
						'httpStatusCode' => $httpStatusCode,
						'response' => $response
					]
				);
				// Fall-back to default handling, below.
				break;
		}

		// Default handling:
		throw new WikifunctionCallException(
			ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
				[ "message" => 'Something happened, but details weren\'t passed on' ]
			),
			// Triggers use of messages:
			// * wikilambda-functioncall-error-category
			// * wikilambda-functioncall-error-category-desc
			'wikilambda-functioncall-error'
		);
	}

	private function buildRequest( string $target, array $args, string $parseLang, string $renderLang ): MWHttpRequest {
		// This is a slightly hacky way to ensure that user inputs are transmit-safe, and that e.g.
		// inputs with '|'s in them can be ferried across the network without
		$encodedArguments = implode(
			'|',
			array_map( static fn ( $val ): string => base64_encode( $val ), $args )
		);

		$requestUri = $this->getClientTargetUrl()
			. $this->config->get( 'RestPath' )
			. '/wikifunctions/v0/call'
			. '/' . $target
			. '/' . $encodedArguments
			. '/' . $parseLang
			. '/' . $renderLang;

		// HttpRequestFactory->create() returns GuzzleHttpRequest (extends MWHttpRequest):
		// https://doc.wikimedia.org/mediawiki-core/master/php/classGuzzleHttpRequest.html
		// https://doc.wikimedia.org/mediawiki-core/master/php/classMWHttpRequest.html
		$request = $this->httpRequestFactory->create( $requestUri, [ 'method' => 'GET' ], __METHOD__ );

		return $request;
	}

	/**
	 * Return the Url of the Wikilambda server instance,
	 * and if not available in the configuration variables,
	 * returns an empty string and logs an error.
	 *
	 * @return string
	 */
	private function getClientTargetUrl(): string {
		$targetUrl = $this->config->get( 'WikiLambdaClientTargetAPI' );
		if ( !$targetUrl ) {
			$this->logger->error( __METHOD__ . ': missing configuration variable WikiLambdaClientTargetAPI' );
		}
		return $targetUrl ?? '';
	}
}
