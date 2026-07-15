<?php
/**
 * WikiLambda DiffKeyLabeller: resolves a ZObject key (e.g. "Z8K1") to its
 * human-readable label, for use in diff breadcrumbs.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Diff;

use MediaWiki\Extension\WikiLambda\ZObjectContent\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Language\Language;

/**
 * Given a global key like "Z8K1" or "Z17K3", fetches the owning type/function
 * definition (the ZObject named by the key's ZID prefix) and asks
 * ZObjectUtils::getLabelOfGlobalKey for its label in a given language.
 *
 * WikiLambda keys are globally namespaced, so the owning definition is derivable
 * from the key string alone — no surrounding context is needed. Fetched
 * definitions are memoised for the lifetime of the instance (i.e. one diff
 * render), since the same handful of standard types recur across many keys.
 *
 * Anything that is not a global key (a list index, or a bare local key such as
 * "K1") is returned unchanged; labelling local keys, which needs the enclosing
 * object's type, is left for a follow-up.
 */
class DiffKeyLabeller {

	/** @var array<string,?ZPersistentObject> Memoised zid => definition (null when unresolved) */
	private array $definitions = [];

	public function __construct(
		private readonly ZObjectStore $zObjectStore,
		private readonly Language $language
	) {
	}

	/**
	 * Resolve a key to its label, or return the key itself if it is not a global
	 * key or cannot be resolved.
	 *
	 * @param string $key
	 * @return string
	 */
	public function getKeyLabel( string $key ): string {
		if ( !preg_match( '/^(Z\d+)K\d+$/', $key, $matches ) ) {
			return $key;
		}

		$definition = $this->fetchDefinition( $matches[1] );
		if ( $definition === null ) {
			return $key;
		}

		// getLabelOfGlobalKey already returns the raw key id when it cannot
		// resolve a label; guard against unexpected structures too.
		try {
			return ZObjectUtils::getLabelOfGlobalKey( $key, $definition, $this->language );
		} catch ( \Exception ) {
			return $key;
		}
	}

	/**
	 * Fetch (and memoise) the persisted definition for a ZID, or null if it is
	 * missing or invalid.
	 *
	 * @param string $zid
	 * @return ZPersistentObject|null
	 */
	private function fetchDefinition( string $zid ): ?ZPersistentObject {
		if ( !array_key_exists( $zid, $this->definitions ) ) {
			$content = $this->zObjectStore->fetchZObject( $zid );
			$this->definitions[$zid] = ( $content instanceof ZObjectContent && $content->isValid() )
				? $content->getZObject()
				: null;
		}
		return $this->definitions[$zid];
	}
}
