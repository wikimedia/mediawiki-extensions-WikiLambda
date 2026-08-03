<?php
/**
 * WikiLambda DiffLabelResolver: resolves the ZObject identifiers that appear in
 * a revision diff — keys, references and languages — to display text.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Diff;

use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectContent\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Language\Language;
use MediaWiki\Languages\LanguageFactory;
use MediaWiki\Title\TitleFactory;

/**
 * A ZObject diff needs three kinds of display text, all derived from ZIDs and
 * all wanted in the viewer's language:
 *
 * - the label of a key (e.g. "Z8K1" → "arguments"), for path breadcrumbs;
 * - the label and page URL of a referenced object (e.g. "Z40" → "Boolean"), so
 *   reference-valued changes can render as links;
 * - the name, BCP-47 code and writing direction of a language (e.g. "Z1002" →
 *   English/en/ltr), so language-specific values render in their own script.
 *
 * All three are gathered here rather than passed around as separate callables,
 * because they share both a lifetime (one diff render) and a cache: the same
 * handful of standard types and languages recur across many rows, and every
 * lookup is a database read. Every method memoises, and degrades to the raw ZID
 * rather than throwing, so an unresolvable identifier costs a reader clarity
 * but never the whole diff.
 */
class DiffLabelResolver {

	/** @var array<string,?ZPersistentObject> Memoised zid => definition (null when unresolved) */
	private array $definitions = [];

	/** @var array<string,?array> Memoised zid => reference label and URL (null when no valid target) */
	private array $references = [];

	/** @var array<string,array> Memoised zid => language name, code and direction */
	private array $languages = [];

	public function __construct(
		private readonly ZObjectStore $zObjectStore,
		private readonly Language $language,
		private readonly LanguageFactory $languageFactory,
		private readonly TitleFactory $titleFactory,
		private readonly ZLangRegistry $langRegistry
	) {
	}

	/**
	 * Resolve a key to its human-readable label, or return the key itself if it
	 * is not a global key or cannot be resolved.
	 *
	 * WikiLambda keys are globally namespaced, so the owning type or function
	 * definition is derivable from the key string alone — no surrounding context
	 * is needed. Anything that is not a global key (a list index, or a bare local
	 * key such as "K1") is returned unchanged; labelling local keys, which needs
	 * the enclosing object's type, is left for a follow-up.
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
	 * Resolve a referenced ZObject id to its label and view-page URL, so diff
	 * values that are references can render as links. Returns null when the id
	 * has no valid target, and a null label when the target has none in the
	 * viewer's language.
	 *
	 * @param string $zid
	 * @return array{label:?string,url:string}|null
	 */
	public function getReference( string $zid ): ?array {
		if ( !array_key_exists( $zid, $this->references ) ) {
			$title = $this->titleFactory->newFromText( $zid, NS_MAIN );
			$this->references[$zid] = $title === null ? null : [
				'label' => $this->zObjectStore->fetchZObjectLabel( $zid, $this->language->getCode() ),
				'url' => $title->getLocalURL(),
			];
		}
		return $this->references[$zid];
	}

	/**
	 * Resolve a language ZObject id to its display name (from WikiLambda's own
	 * labels, in the viewer's language) plus the BCP-47 code and writing
	 * direction, so language-specific values can be tagged with lang/dir.
	 * Degrades to the id and an undirected value.
	 *
	 * @param string $languageZid
	 * @return array{name:string,code:string,dir:string}
	 */
	public function getLanguage( string $languageZid ): array {
		if ( !array_key_exists( $languageZid, $this->languages ) ) {
			$this->languages[$languageZid] = $this->resolveLanguage( $languageZid );
		}
		return $this->languages[$languageZid];
	}

	/**
	 * @param string $languageZid
	 * @return array{name:string,code:string,dir:string}
	 */
	private function resolveLanguage( string $languageZid ): array {
		$name = $this->zObjectStore->fetchZObjectLabel( $languageZid, $this->language->getCode() )
			?? $languageZid;
		try {
			$code = $this->langRegistry->getLanguageCodeFromZid( $languageZid );
			$dir = $this->languageFactory->getLanguage( $code )->getDir();
		} catch ( \Exception ) {
			return [ 'name' => $name, 'code' => '', 'dir' => 'auto' ];
		}
		return [ 'name' => $name, 'code' => $code, 'dir' => $dir ];
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
