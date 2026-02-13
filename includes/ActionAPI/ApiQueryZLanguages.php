<?php
/**
 * WikiLambda API to map language codes to ZLanguage ZIDs via the query API.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ActionAPI;

use MediaWiki\Api\ApiQuery;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Logger\LoggerFactory;
use Wikimedia\ParamValidator\ParamValidator;

class ApiQueryZLanguages extends WikiLambdaApiQueryGeneratorBase {

	private ZLangRegistry $langRegistry;

	/**
	 * @codeCoverageIgnore
	 */
	public function __construct( ApiQuery $query, string $moduleName ) {
		parent::__construct( $query, $moduleName, 'wikilambdaload_zlanguages_' );

		$this->langRegistry = ZLangRegistry::singleton();
		$this->setLogger( LoggerFactory::getInstance( 'WikiLambda' ) );
	}

	/**
	 * @inheritDoc
	 */
	protected function run( $resultPageSet = null ) {
		// Exit if we're running in non-repo mode (e.g. on a client wiki)
		if ( !$this->getConfig()->get( 'WikiLambdaEnableRepoMode' ) ) {
			WikiLambdaApiBase::dieWithZError(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN,
					[]
				),
				HttpStatus::BAD_REQUEST
			);
		}

		$params = $this->extractRequestParams();

		$codes = $params[ 'codes' ] ?? [];
		if ( !is_array( $codes ) ) {
			$codes = [ $codes ];
		}

		$zidMap = $this->langRegistry->getLanguageZidsFromCodes( $codes );

		$items = array_map(
			static function ( string $code ) use ( $zidMap ) {
				return [
					'code' => $code,
					'zid' => $zidMap[ $code ] ?? null,
				];
			},
			$codes
		);

		$result = $this->getResult();
		$result->addValue( [ 'query' ], $this->getModuleName(), $items );
	}

	/**
	 * @inheritDoc
	 * @codeCoverageIgnore
	 */
	protected function getAllowedParams(): array {
		return [
			'codes' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_ISMULTI => true,
				ParamValidator::PARAM_REQUIRED => true,
			],
		];
	}
}
