<?php
/**
 * WikiLambda ZObjects helper for the query API
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ActionAPI;

use MediaWiki\Api\ApiBase;
use MediaWiki\Api\ApiQuery;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Languages\LanguageFallback;
use MediaWiki\Languages\LanguageNameUtils;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Title\TitleFactory;
use Psr\Log\LoggerInterface;
use stdClass;
use Wikimedia\ParamValidator\ParamValidator;

class ApiQueryZObjects extends WikiLambdaApiQueryGeneratorBase {

	protected LanguageFallback $languageFallback;
	protected LanguageNameUtils $languageNameUtils;
	protected TitleFactory $titleFactory;
	protected ZTypeRegistry $typeRegistry;
	protected LoggerInterface $logger;

	/**
	 * @codeCoverageIgnore
	 */
	public function __construct(
		ApiQuery $query,
		string $moduleName,
		LanguageFallback $languageFallback,
		LanguageNameUtils $languageNameUtils,
		TitleFactory $titleFactory
	) {
		parent::__construct( $query, $moduleName, 'wikilambdaload_' );

		$this->languageFallback = $languageFallback;
		$this->languageNameUtils = $languageNameUtils;
		$this->titleFactory = $titleFactory;
		$this->typeRegistry = ZTypeRegistry::singleton();
		$this->setLogger( LoggerFactory::getInstance( 'WikiLambda' ) );
	}

	/**
	 * @param string $zid
	 * @param array|null $languages
	 * @param bool $getDependencies
	 * @param int|null $revision
	 * @return array
	 * @throws ZErrorException
	 */
	private function fetchContent( $zid, $languages, $getDependencies, $revision = null ) {
		// Check for invalid ZID and throw INVALID_TITLE exception
		if ( !ZObjectUtils::isValidZObjectReference( $zid ) ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_INVALID_TITLE,
					[ 'title' => $zid ]
				)
			);
		}

		// Check for unavailable ZObject and throw ZID_NOT_FOUND exception
		$title = $this->titleFactory->newFromText( $zid, NS_MAIN );
		if ( !$title || !$title->exists() ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND,
					[ "data" => $zid ]
				)
			);
		}

		// Fetch ZObject and die if there are unmanageable errors
		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$page = $zObjectStore->fetchZObjectByTitle( $title, $revision );

		if ( !$page ) {
			$this->dieWithError( [ 'apierror-query+wikilambdaload_zobjects-unloadable', $zid ], null, null, 500 );
		}
		if ( !( $page instanceof ZObjectContent ) ) {
			$this->dieWithError( [ 'apierror-query+wikilambdaload_zobjects-notzobject', $zid ], null, null, 400 );
		}

		// The object was successfully retrieved
		$zobject = $page->getObject();
		$dependencies = [];

		// 1. Get the dependency types of type keys and function arguments
		if ( $getDependencies ) {
			$dependencies = $this->getTypeDependencies( $zobject );
		}

		// 2. Select only the requested language from all ZMultilingualStrings
		if ( is_array( $languages ) ) {
			$langRegistry = ZLangRegistry::singleton();
			$languageZids = $langRegistry->getLanguageZids( $languages );
			$zobject = ZObjectUtils::filterZMultilingualStringsToLanguage( $zobject, $languageZids );
		}

		return [ $zobject, $dependencies ];
	}

	/**
	 * Returns the types of type keys and function arguments
	 *
	 * @param stdClass $zobject
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

	/**
	 * @inheritDoc
	 */
	protected function run( $resultPageSet = null ) {
		$params = $this->extractRequestParams();

		$languages = null;
		$pageResult = null;

		$zids = $params[ 'zids' ];
		$revisions = $params[ 'revisions' ];
		$language = $params[ 'language' ];
		$getDependencies = $params[ 'get_dependencies' ];
		$revisionMap = [];

		// Check that if we request revision, we request one per zid
		if ( $revisions ) {
			if ( count( $revisions ) !== count( $zids ) ) {
				$zErrorObject = ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
					[ 'message' => "You must specify a revision for each ZID, or none at all." ]
				);
				WikiLambdaApiBase::dieWithZError( $zErrorObject, 400 );
			}
			foreach ( $zids as $index => $zid ) {
				$revisionMap[ $zid ] = (int)$revisions[ $index ];
			}
		}

		// Get language fallback chain if language is set
		if ( $language ) {
			$languages = [ $language ];
			$languages = array_merge(
				$languages,
				$this->languageFallback->getAll( $language, LanguageFallback::MESSAGES )
			);
		}

		if ( !$resultPageSet ) {
			$pageResult = $this->getResult();
		}

		$fetchedZids = [];
		while ( count( $zids ) > 0 ) {
			$zid = array_shift( $zids );
			array_push( $fetchedZids, $zid );

			try {
				// We try to fetch the content and transform it according to params
				[ $fetchedContent, $dependencies ] = $this->fetchContent(
					$zid,
					$languages,
					$getDependencies,
					$revisions ? ( $revisionMap[ $zid ] ?? null ) : null
				);

				// We queue the type dependencies
				foreach ( $dependencies as $dep ) {
					if ( !in_array( $dep, $fetchedZids ) && !in_array( $dep, $zids ) ) {
						array_push( $zids, $dep );
					}
				}

				// We add the fetchedContent to the pageResult
				// TODO (T338249): How to work out the result when using the generator?
				$pageResult->addValue( [ 'query', $this->getModuleName() ], $zid, [
					'success' => true,
					'data' => $fetchedContent
				] );
			} catch ( ZErrorException $e ) {
				// If an error was thrown while fetching, we add the value to the response
				// with success=false and the error object as data
				$pageResult->addValue( [ 'query', $this->getModuleName() ], $zid, [
					'success' => false,
					'data' => $e->getZError()->getErrorData()
				] );
			}
		}
	}

	/**
	 * @inheritDoc
	 * @codeCoverageIgnore
	 */
	protected function getAllowedParams(): array {
		$zObjectStore = WikiLambdaServices::getZObjectStore();

		return [
			'zids' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_REQUIRED => true,
				ParamValidator::PARAM_ISMULTI => true,
			],
			'revisions' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_ISMULTI => true,
			],
			'language' => [
				ParamValidator::PARAM_TYPE => $zObjectStore->fetchAllZLanguageCodes(),
				ParamValidator::PARAM_REQUIRED => false,
			],
			'get_dependencies' => [
				ParamValidator::PARAM_TYPE => 'boolean',
				ParamValidator::PARAM_REQUIRED => false,
				ParamValidator::PARAM_DEFAULT => false,
			],
		];
	}

	/**
	 * @see ApiBase::getExamplesMessages()
	 * @return array
	 * @codeCoverageIgnore
	 */
	protected function getExamplesMessages() {
		return [
			'action=query&format=json&list=wikilambdaload_zobjects&wikilambdaload_zids=Z12%7CZ4'
				=> 'apihelp-query+wikilambdaload_zobjects-example-full',
			'action=query&format=json&list=wikilambdaload_zobjects&wikilambdaload_zids=Z12%7CZ4'
				. '&wikilambdaload_language=es'
				=> 'apihelp-query+wikilambdaload_zobjects-example-language',
			'action=query&format=json&list=wikilambdaload_zobjects&wikilambdaload_zids=Z0123456789%7CZ1'
				=> 'apihelp-query+wikilambdaload_zobjects-example-error',
		];
	}
}
