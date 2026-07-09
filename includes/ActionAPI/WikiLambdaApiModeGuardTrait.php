<?php
/**
 * WikiLambda API feature-mode guard
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ActionAPI;

use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;

/**
 * Shared repo-mode guard for WikiLambda Action API modules. Extracted into a
 * trait because the two API base classes extend different Wikimedia bases
 * (ApiBase and ApiQueryGeneratorBase) and so cannot share an ancestor.
 */
trait WikiLambdaApiModeGuardTrait {

	/**
	 * Exit with an ApiUsageException if we're not running in repo mode (e.g. on a client
	 * wiki). We respond 403/FORBIDDEN because the whole API surface — not this particular
	 * request — is unavailable here, so the caller cannot fix it by re-shaping the request.
	 * We can't use dieWithZError because ZErrorFactory may reach into ZObjectFactory, which
	 * relies on stored ZObjects that don't exist in non-repo mode (T423873).
	 */
	protected function dieIfNotRepoMode(): void {
		if ( !WikiLambdaServices::getMode()->isRepo() ) {
			// dieWithError() is provided by ApiBase, the class into which this trait is always mixed;
			// phan analyses the trait in isolation and cannot see that guarantee.
			// @phan-suppress-next-line PhanUndeclaredMethod
			$this->dieWithError(
				'wikilambda-api-disabled-repo-mode-only',
				null,
				null,
				HttpStatus::FORBIDDEN
			);
		}
	}
}
