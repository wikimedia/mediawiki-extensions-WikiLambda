<?php
/**
 * WikiLambda ZObject fetching API
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\API;

use ApiBase;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
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
			$title = Title::newFromText( $ZID, NS_ZOBJECT );

			if ( !$title || !is_a( $title, "Title" ) || !$title->exists() ) {
				$this->dieWithError( [ 'apierror-wikilambda_fetch-missingzid', $ZID ] );
			} else {
				$this->getResult()->addValue(
					$ZID,
					$this->getModuleName(),
					ZObjectContentHandler::getExternalRepresentation( $title, $language )
				);
			}
		}
	}

	/**
	 * @inheritDoc
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
