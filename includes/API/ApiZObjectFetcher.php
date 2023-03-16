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

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\MediaWikiServices;
use MediaWiki\Title\Title;
use Wikimedia\ParamValidator\ParamValidator;

class ApiZObjectFetcher extends WikiLambdaApiBase {

	/**
	 * @inheritDoc
	 */
	public function execute(): void {
		$params = $this->extractRequestParams();

		$ZIDs = $params[ 'zids' ];

		$revisions = $params[ 'revisions' ];
		if (
			$revisions &&
			count( $revisions ) !== count( $ZIDs )
		) {
			$zErrorObject = ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
				[
					'message' => "You must specify a revision for each ZID"
				]
			);
			$this->dieWithZError( $zErrorObject );
		}

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
					$revision = $revisions ? $revisions[ $index ] : null;

					try {
						$fetchedContent = ZObjectContentHandler::getExternalRepresentation(
							$title,
							$language,
							$revision
						);
					} catch ( ZErrorException $e ) {
						// This probably means that the requested revision is not known; return
						// null for this entry rather than throwing or returning a ZError instance.
						$fetchedContent = null;
					}

					$this->getResult()->addValue(
						$ZID,
						$this->getModuleName(),
						$fetchedContent
					);
				}
			}
		}
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
			'revisions' => [
				ParamValidator::PARAM_TYPE => 'string',
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
			'action=wikilambda_fetch&zids=Z1&revisions=12'
				=> 'apihelp-wikilambda_fetch-example-single-old',
			'action=wikilambda_fetch&zids=Z1|Z2|Z3'
				=> 'apihelp-wikilambda_fetch-example-multiple',
			'action=wikilambda_fetch&zids=Z1|Z2|Z3&revisions=12|14|25'
				=> 'apihelp-wikilambda_fetch-example-multiple-old',
		];
	}
}
