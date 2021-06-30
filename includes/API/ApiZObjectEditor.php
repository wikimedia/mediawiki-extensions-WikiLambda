<?php
/**
 * WikiLambda ZObject creating/editing API
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\API;

use ApiBase;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use Wikimedia\ParamValidator\ParamValidator;

class ApiZObjectEditor extends ApiBase {

	/**
	 * @inheritDoc
	 */
	public function execute(): void {
		$user = $this->getUser();
		$params = $this->extractRequestParams();

		$summary = $params[ 'summary' ];
		$zobject = $params[ 'zobject' ];
		// If zid is set, we should be editing it, if empty or Z0, we are creating a new zobject
		// Shall we add an aditional flag to confirm creation/edition?
		$zid = $params[ 'zid' ];

		$zObjectStore = WikiLambdaServices::getZObjectStore();

		if ( !$zid ) {
			// Create a new ZObject
			$response = $zObjectStore->createNewZObject( $zobject, $summary, $user );
		} else {
			// Edit an existing ZObject
			$response = $zObjectStore->updateZObject( $zid, $zobject, $summary, $user );
		}

		// TODO: Return multiple errors instead of one.
		if ( $response instanceof \Status ) {
			$this->dieStatus( $response );
		}

		$title = $response->getTitle();
		$this->getResult()->addValue(
			null,
			$this->getModuleName(),
			[
				'success' => true,
				'articleId' => $title->getArticleID(),
				'title' => $title->getBaseText(),
				'page' => $title->getBaseTitle()
			]
		);
	}

	public function mustBePosted() {
		return true;
	}

	public function isWriteMode() {
		return true;
	}

	/**
	 * @see ApiBase::needsToken
	 *
	 * @return string
	 */
	public function needsToken(): string {
		return 'csrf';
	}

	/**
	 * @inheritDoc
	 */
	protected function getAllowedParams(): array {
		return [
			'summary' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_REQUIRED => false,
				ParamValidator::PARAM_DEFAULT => null,
			],
			'zid' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_REQUIRED => false,
				ParamValidator::PARAM_DEFAULT => null,
			],
			'zobject' => [
				ParamValidator::PARAM_TYPE => 'text',
				ParamValidator::PARAM_REQUIRED => true,
			]
		];
	}

	/**
	 * @see ApiBase::getExamplesMessages()
	 * @return array
	 */
	protected function getExamplesMessages() {
		return [
			'action=wikilambda_edit&format=json&summary=New%20zobject&zobject='
				. urlencode( '{"Z1K1":"Z2","Z2K1":"Z0","Z2K2":{"Z1K1":"Z6","Z6K1":"value"},'
				. '"Z2K3":{"Z1K1":"Z12","Z12K1":[{"Z1K1":"Z11","Z11K1":"en","Z11K2":"label"}]}}' )
			=> 'apihelp-wikilambda_edit-example-create',
			'action=wikilambda_edit&format=json&summary=Edit%20zobject&zid=Z01&zobject='
				. urlencode( '{"Z1K1":"Z2","Z2K1":"Z01","Z2K2":{"Z1K1":"Z6","Z6K1":"value"}}' )
			=> 'apihelp-wikilambda_edit-example-edit-incorrect'
		];
	}
}
