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
use MediaWiki\Api\ApiWatchlistTrait;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\MainConfigNames;
use MediaWiki\Title\Title;
use MediaWiki\User\Options\UserOptionsLookup;
use MediaWiki\User\User;
use MediaWiki\Watchlist\WatchedItemStoreInterface;
use MediaWiki\Watchlist\WatchlistManager;
use Wikimedia\ParamValidator\ParamValidator;
use Wikimedia\Stats\StatsFactory;

class ApiZObjectEditor extends WikiLambdaApiBase {

	use ApiWatchlistTrait;

	public function __construct(
		ApiMain $mainModule,
		string $moduleName,
		StatsFactory $statsFactory,
		WatchlistManager $watchlistManager,
		WatchedItemStoreInterface $watchedItemStore,
		UserOptionsLookup $userOptionsLookup,
	) {
		parent::__construct( $mainModule, $moduleName, $statsFactory );

		$this->watchlistExpiryEnabled = $this->getConfig()->get( MainConfigNames::WatchlistExpiry );
		$this->watchlistMaxDuration = $this->getConfig()->get( MainConfigNames::WatchlistExpiryMaxDuration );
		$this->watchlistManager = $watchlistManager;
		$this->watchedItemStore = $watchedItemStore;
		$this->userOptionsLookup = $userOptionsLookup;

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

		$creating = !$zid || $zid === ZTypeRegistry::Z_NULL_REFERENCE;
		if ( $creating ) {
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
					WikiLambdaApiBase::dieWithZError( $zError, HttpStatus::FORBIDDEN );
				}
				$editFlag = EDIT_NEW;
				$creating = true;
			}

			// Edit an existing ZObject
			$response = $zObjectStore->updateZObject( $this, $zid, $zobject, $summary, $user, $editFlag );
		}

		if ( !$response->isOK() ) {
			WikiLambdaApiBase::dieWithZError( $response->getErrors(), HttpStatus::BAD_REQUEST );
		}

		$title = $response->getTitle();
		$this->updateWatchlist( $params, $title, $user, $creating );

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
	 * Watch or unwatch the saved page, as the request and the user preferences specify.
	 *
	 * @param array $params
	 * @param Title $title
	 * @param User $user
	 * @param bool $creating
	 */
	private function updateWatchlist( array $params, Title $title, User $user, bool $creating ): void {
		// Core decides before the save, but a new ZID is known only after it, so apply watchcreations here.
		$watch = $this->getWatchlistValue( $params['watchlist'], $title, $user ) || (
			$creating && $this->getWatchlistValue( $params['watchlist'], $title, $user, 'watchcreations' )
		);
		$expiry = $watch ? $this->getExpiryFromParams(
			$params, $title, $user, $creating ? 'watchcreations-expiry' : 'watchdefault-expiry'
		) : null;
		$this->watchlistManager->setWatch( $watch, $user, $title, $expiry );
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
	 * @inheritDoc
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
		] + $this->getWatchlistParams();
	}

	/**
	 * @inheritDoc
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
