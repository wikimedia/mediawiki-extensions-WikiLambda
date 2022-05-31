<?php
/**
 * WikiLambda ZObject creating/editing API
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\API;

use ApiBase;
use FormatJson;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
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

		// FIXME: (T306824) Remove this pipe when front-end handles benjamin stuff
		if ( !defined( 'MW_PHPUNIT_TEST' ) ) {
			$zobject = FormatJson::encode(
				ZObjectUtils::simpleToBenjamin( FormatJson::parse( $zobject )->value )
			);
		}

		// If zid is set, we should be editing it, if empty or Z0, we are creating a new zobject
		// Shall we add an aditional flag to confirm creation/edition?
		$zid = $params[ 'zid' ];

		$zObjectStore = WikiLambdaServices::getZObjectStore();

		if ( !$zid || $zid === ZTypeRegistry::Z_NULL_REFERENCE ) {
			// Create a new ZObject
			$response = $zObjectStore->createNewZObject( $zobject, $summary, $user );
		} else {
			// Edit an existing ZObject
			$response = $zObjectStore->updateZObject( $zid, $zobject, $summary, $user );
		}

		if ( !$response->isOK() ) {
			$this->dieWithZError( $response->getErrors() );
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

	/**
	 * @param ZError|ZObject|string $zerror
	 */
	public function dieWithZError( $zerror ) {
		if ( $zerror instanceof ZError ) {
			parent::dieWithError(
				[ 'wikilambda-zerror', $zerror->getZErrorType() ],
				null,
				$zerror->getErrorData()
			);
		}
		// This can be an array of strings or ZObjects as well as ZErrors during
		// the transition of this code.
		parent::dieWithError( $zerror );
	}

	/**
	 * @inheritDoc
	 * @codeCoverageIgnore
	 */
	public function mustBePosted() {
		return true;
	}

	/**
	 * @inheritDoc
	 * @codeCoverageIgnore
	 */
	public function isWriteMode() {
		return true;
	}

	/**
	 * @see ApiBase::needsToken
	 * @return string
	 * @codeCoverageIgnore
	 */
	public function needsToken(): string {
		return 'csrf';
	}

	/**
	 * @inheritDoc
	 * @codeCoverageIgnore
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
	 * @codeCoverageIgnore
	 */
	protected function getExamplesMessages() {
		return [
			'action=wikilambda_edit&format=json&summary=New%20zobject&zobject='
				. urlencode( '{"Z1K1":"Z2","Z2K1":"Z0","Z2K2":"string value",'
				. '"Z2K3":{"Z1K1":"Z12","Z12K1":["Z11", {"Z1K1":"Z11","Z11K1":"Z1002","Z11K2":"label"}]}}' )
			=> 'apihelp-wikilambda_edit-example-create',
			'action=wikilambda_edit&format=json&summary=Edit%20zobject&zid=Z01&zobject='
				. urlencode( '{"Z1K1":"Z2","Z2K1":"Z01","Z2K2":"string value"}' )
			=> 'apihelp-wikilambda_edit-example-edit-incorrect'
		];
	}
}
