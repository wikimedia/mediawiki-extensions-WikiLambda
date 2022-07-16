<?php
/**
 * WikiLambda ZObject fetching API
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\API;

use ApiBase;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\MediaWikiServices;
use Title;
use Wikimedia\ParamValidator\ParamValidator;

class ApiZObjectFetcher extends ApiBase {

	/**
	 * @inheritDoc
	 */
	public function execute(): void {
		$params = $this->extractRequestParams();

		$ZIDs = $params[ 'zids' ];
		$language = $params[ 'language' ];

		foreach ( $ZIDs as $index => $ZID ) {
			if ( !ZObjectUtils::isValidZObjectReference( mb_strtoupper( $ZID ) ) ) {
				$zErrorObject = ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_INVALID_REFERENCE,
					[ 'data' => $ZID ]
				);
				$this->dieWithZError( $zErrorObject );
			} else {
				$title = Title::newFromText( $ZID, NS_MAIN );

				if ( !$title || !is_a( $title, "Title" ) || !$title->exists() ) {
					$zErrorObject = ZErrorFactory::createZErrorInstance(
						ZErrorTypeRegistry::Z_ERROR_UNKNOWN_REFERENCE,
						[ 'data' => $ZID ]
					);
					$this->dieWithZError( $zErrorObject );
				} else {
					$this->getResult()->addValue(
						$ZID,
						$this->getModuleName(),
						ZObjectContentHandler::getExternalRepresentation( $title, $language )
					);
				}
			}
		}
	}

	/**
	 * @param ZError $zerror
	 *
	 * FIXME duplicated from ApiZObjectEditor.php
	 */
	private function dieWithZError( $zerror ) {
		$this->dieWithError(
			[ 'wikilambda-zerror', $zerror->getZErrorType() ],
			null,
			$zerror->getErrorData()
		);
	}

	/**
	 * @inheritDoc
	 * @codeCoverageIgnore
	 */
	protected function getAllowedParams(): array {
		$languageUtils = MediaWikiServices::getInstance()->getLanguageNameUtils();

		return [
			'zids' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_REQUIRED => true,
				ParamValidator::PARAM_ISMULTI => true,
			],
			'language' => [
				ParamValidator::PARAM_TYPE => array_keys( $languageUtils->getLanguageNames() ),
				ParamValidator::PARAM_REQUIRED => false,
			]
		];
	}

	/**
	 * @see ApiBase::getExamplesMessages()
	 * @return array
	 * @codeCoverageIgnore
	 */
	protected function getExamplesMessages() {
		return [
			'action=wikilambda_fetch&zids=Z1'
				=> 'apihelp-wikilambda_fetch-example-single',
			'action=wikilambda_fetch&zids=Z1|Z2|Z3'
				=> 'apihelp-wikilambda_fetch-example-multiple',
		];
	}
}
