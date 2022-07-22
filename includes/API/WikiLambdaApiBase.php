<?php

namespace MediaWiki\Extension\WikiLambda\API;

use ApiBase;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;

/**
 * WikiLambda Base API util
 *
 * This abstract class extends the Wikimedia's ApiBase class
 * and provides specific additional methods.
 *
 * @stable to extend
 *
 * @ingroup API
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

abstract class WikiLambdaApiBase extends ApiBase {
	/**
	 * @param ZError $zerror
	 */
	public function dieWithZError( $zerror ) {
		parent::dieWithError(
			[ 'wikilambda-zerror', $zerror->getZErrorType() ],
			null,
			$zerror->getErrorData()
		);
	}
}
