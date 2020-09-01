<?php
/**
 * WikiLambda ZObject fetching API
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\API;

use ApiBase;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;

class ApiZObjectFetcher extends ApiBase {

	/**
	 * @inheritDoc
	 */
	public function execute(): void {
		$ZIDs = explode( '|', $this->extractRequestParams()[ 'zids' ] );

		foreach ( $ZIDs as $index => $ZID ) {
			$title = \Title::newFromText( $ZID, NS_ZOBJECT );

			if ( !$title->exists() ) {
				$this->dieWithError( [ 'apierror-wikilambda_fetch-missingzid', $ZID ] );
			}

			$this->getResult()->addValue( $ZID, $this->getModuleName(), ZObjectContentHandler::getExternalRepresentation( $title ) );
		}
	}

	/**
	 * @inheritDoc
	 */
	protected function getAllowedParams(): array {
		return [
			'zids' => [
				ApiBase::PARAM_TYPE => 'string',
				ApiBase::PARAM_REQUIRED => true,
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
