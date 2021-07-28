<?php
/**
 * WikiLambda ZObjects helper for the query API
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\API;

use ApiBase;
use ApiPageSet;
use ApiQueryGeneratorBase;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Languages\LanguageFallback;
use MediaWiki\Languages\LanguageNameUtils;
use Title;
use TitleFactory;
use Wikimedia\ParamValidator\ParamValidator;

class ApiQueryZObjects extends ApiQueryGeneratorBase {

	/** @var LanguageFallback */
	protected $languageFallback;
	/** @var LanguageNameUtils */
	protected $languageNameUtils;
	/** @var TitleFactory */
	protected $titleFactory;

	public function __construct(
		$query,
		$moduleName,
		LanguageFallback $languageFallback,
		LanguageNameUtils $languageNameUtils,
		TitleFactory $titleFactory
	) {
		parent::__construct( $query, $moduleName, 'wikilambdaload_' );

		$this->languageFallback = $languageFallback;
		$this->languageNameUtils = $languageNameUtils;
		$this->titleFactory = $titleFactory;
	}

	public function execute() {
		$this->run();
	}

	public function executeGenerator( $resultPageSet ) {
		$this->run( $resultPageSet );
	}

	/**
	 * @param ApiPageSet|null $resultPageSet
	 */
	private function run( $resultPageSet = null ) {
		$params = $this->extractRequestParams();

		$languages = null;
		$pageResult = null;

		$ZIDs = $params[ 'zids' ];
		$language = $params[ 'language' ];
		$canonical = $params[ 'canonical' ];

		if ( $language ) {
			// Get language fallback chain
			$languages = [ $language ];
			$languages = array_merge(
				$languages,
				$this->languageFallback->getAll( $language, LanguageFallback::MESSAGES )
			);
		}

		if ( !$resultPageSet ) {
			$pageResult = $this->getResult();
		}

		foreach ( $ZIDs as $ZID ) {

			// Check for invalid ZID
			if ( !ZObjectUtils::isValidZObjectReference( $ZID ) ) {
				// TODO: get ZError object that represents invalid ZID
				$zobject = json_decode( '{"Z1K1": "Z5", "Z5K1": "Error: Invalid ZID"}' );
				if ( !$resultPageSet ) {
					$pageResult->addValue( [ 'query', $this->getModuleName() ], $ZID, [
						'success' => false,
						'data' => $zobject
					] );
				}
				continue;
			}

			// Check for unavailable ZObject
			$title = $this->titleFactory->newFromText( $ZID, NS_ZOBJECT );
			if ( !$title || !$title->exists() ) {
				// TODO: get ZError object that represents ZID Not Found error
				// TODO: if language is defined, return ZError on the requested language
				$zobject = json_decode( '{"Z1K1": "Z5", "Z5K1": "Error: ZID Not Found"}' );
				if ( !$resultPageSet ) {
					$pageResult->addValue( [ 'query', $this->getModuleName() ], $ZID, [
						'success' => false,
						'data' => $zobject
					] );
				}
				continue;
			}

			// Fetch ZObject and handle ZMultilingualStrings
			$zObjectStore = WikiLambdaServices::getZObjectStore();
			$page = $zObjectStore->fetchZObjectByTitle( $title );
			if ( !$page ) {
				$this->dieWithError( [ 'apierror-query+wikilambdaload_zobjects-unloadable', $ZID ] );
			}
			if ( !( $page instanceof ZObjectContent ) ) {
				$this->dieWithError( [ 'apierror-query+wikilambdaload_zobjects-nonzobject', $ZID ] );
			}
			$zobject = $page->getObject();

			if ( is_array( $languages ) ) {
				$langRegistry = ZLangRegistry::singleton();
				$languageZids = $langRegistry->getLanguageZids( $languages );
				$zobject = ZObjectUtils::filterZMultilingualStringsToLanguage( $zobject, $languageZids );
			}

			// Normalize Z6 and Z9
			// TODO: If language parameter is present and canonical is set to false, we are
			// walking the tree two times. It would be interesting to only walk it once, and
			// perform all the transformations that are necessary on that same recursive walk.
			if ( !$canonical ) {
				$zobject = ZObjectUtils::normalizeZStringsAndZReferences( $zobject );
			}

			$result = [
				'success' => true,
				'data' => $zobject
			];

			if ( $resultPageSet ) {
				if ( $title instanceof Title ) {
					// FIXME: How to work out the result when using the generator?
					$resultPageSet->setGeneratorData( $title, $result );
				}
			} else {
				$pageResult->addValue( [ 'query', $this->getModuleName() ], $ZID, $result );
			}
		}
	}

	/**
	 * @inheritDoc
	 */
	protected function getAllowedParams(): array {
		return [
			'zids' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_REQUIRED => true,
				ParamValidator::PARAM_ISMULTI => true,
			],
			'language' => [
				ParamValidator::PARAM_TYPE => array_keys( $this->languageNameUtils->getLanguageNames() ),
				ParamValidator::PARAM_REQUIRED => false,
			],
			'canonical' => [
				ParamValidator::PARAM_TYPE => 'boolean',
				ParamValidator::PARAM_REQUIRED => false,
				ParamValidator::PARAM_DEFAULT => false,
			],
		];
	}

	/**
	 * @see ApiBase::getExamplesMessages()
	 * @return array
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
			'action=query&format=json&list=wikilambdaload_zobjects&wikilambdaload_zids=Z12'
				. '&wikilambdaload_canonical=true'
				=> 'apihelp-query+wikilambdaload_zobjects-example-canonical',
		];
	}
}
