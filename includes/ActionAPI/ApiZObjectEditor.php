<?php
/**
 * WikiLambda ZObject creating/editing API
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ActionAPI;

use MediaWiki\Api\ApiMain;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Title\Title;
use Wikimedia\ParamValidator\ParamValidator;

class ApiZObjectEditor extends WikiLambdaApiBase {

	public function __construct( ApiMain $mainModule, string $moduleName ) {
		parent::__construct( $mainModule, $moduleName );

		$this->setUp();
	}

	/**
	 * @inheritDoc
	 */
	protected function run(): void {
		$user = $this->getUser();
		$params = $this->extractRequestParams();

		$summary = $params[ 'summary' ];
		$zobject = $params[ 'zobject' ];

		// If zid is set, we should be editing it, if empty or Z0, we are creating a new zobject
		$zid = $params[ 'zid' ];

		$zObjectStore = WikiLambdaServices::getZObjectStore();

		if ( !$zid || $zid === ZTypeRegistry::Z_NULL_REFERENCE ) {
			// Create a new ZObject
			$response = $zObjectStore->createNewZObject( $this, $zobject, $summary, $user );
		} else {
			// Check if the ZObject exists (i.e. someone's making an edit), and pass the correct edit flag
			if ( Title::newFromText( $zid )->exists() ) {
				$editFlag = EDIT_UPDATE;
			} else {
				// … but only for very-priviledged users, as this can cause major issues if e.g. Z99999999 was created
				if ( !$user->isAllowed( 'wikilambda-create-arbitrary-zid' ) ) {
					$zError = ZErrorFactory::createAuthorizationZError( 'wikilambda-edit', EDIT_NEW );
					WikiLambdaApiBase::dieWithZError( $zError, 403 );
				}
				$editFlag = EDIT_NEW;
			}

			// Edit an existing ZObject
			$response = $zObjectStore->updateZObject( $this, $zid, $zobject, $summary, $user, $editFlag );
		}

		if ( !$response->isOK() ) {
			WikiLambdaApiBase::dieWithZError( $response->getErrors(), 400 );
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
	 * Mark as internal. This isn't meant to be user-facing, and can change at any time.
	 * @return bool
	 */
	public function isInternal() {
		return true;
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
				ParamValidator::PARAM_DEFAULT => '',
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
				. urlencode( '{"Z1K1":"Z2","Z2K1":{"Z1K1":"Z6","Z6K1":"Z0"},"Z2K2":"string value",'
				. '"Z2K3":{"Z1K1":"Z12","Z12K1":["Z11", {"Z1K1":"Z11","Z11K1":"Z1002","Z11K2":"label"}]}}' )
			=> 'apihelp-wikilambda_edit-example-create',
			'action=wikilambda_edit&format=json&summary=Edit%20zobject&zid=Z01&zobject='
				. urlencode( '{"Z1K1":"Z2","Z2K1":{"Z1K1":"Z6","Z6K1":"Z01"},"Z2K2":"string value"}' )
			=> 'apihelp-wikilambda_edit-example-edit-incorrect'
		];
	}
}
