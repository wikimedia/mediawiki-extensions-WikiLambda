<?php
/**
 * WikiLambda DiffItemIdentifier: names an item of a list by its content, so a
 * diff need not refer to it by its position.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Diff;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

/**
 * Answers "which one is this?" for an item of a typed list.
 *
 * A list index is a poor way to name a change: it means nothing to a reader,
 * and it is not even stable, since inserting or removing an item renumbers
 * every item after it. What a reader wants is the item's identity — which
 * argument, which key, which option — and that is derivable from the item's
 * own content.
 *
 * Which part of the content identifies an item depends on its type. For the
 * built-in types that make up most stored lists, the identifying key is stated
 * explicitly below; anything else falls back to the item's first key, which for
 * a record whose remaining keys qualify it — a function paired with the
 * languages it serves, say — is the right choice.
 *
 * The handles produced are plain text, never HTML, and are not localised beyond
 * the labels they are built from, so that the differ could one day use them to
 * match items across revisions rather than pairing them up by position
 * (T338250).
 */
class DiffItemIdentifier {

	/**
	 * Types whose items are identified by something other than their first key.
	 *
	 * For a key or argument declaration the first key is the type — which is
	 * shared by every second key or string argument in the wiki — whereas the
	 * key or argument id names precisely one, and labels well. For an
	 * implementation or a tester it is the function they belong to.
	 */
	private const IDENTIFYING_KEYS = [
		ZTypeRegistry::Z_KEY => ZTypeRegistry::Z_KEY_ID,
		ZTypeRegistry::Z_ARGUMENTDECLARATION => ZTypeRegistry::Z_ARGUMENTDECLARATION_ID,
		ZTypeRegistry::Z_IMPLEMENTATION => ZTypeRegistry::Z_IMPLEMENTATION_FUNCTION,
		ZTypeRegistry::Z_TESTER => ZTypeRegistry::Z_TESTER_FUNCTION,
	];

	/**
	 * The longest plain string accepted as a handle. A handle stands in for an
	 * index in a breadcrumb, so it has to stay short enough to read as a name;
	 * anything longer says more about the change than about which item changed.
	 */
	private const MAX_HANDLE_LENGTH = 40;

	public function __construct(
		private readonly DiffLabelResolver $labels
	) {
	}

	/**
	 * Name a list item by its content, or return null when nothing about it
	 * identifies it and the caller should fall back to its position.
	 *
	 * @param mixed $item The item, as a nested array or a leaf
	 * @return string|null Plain text, not HTML
	 */
	public function getHandle( $item ): ?string {
		if ( !is_array( $item ) ) {
			return $this->describe( $item );
		}

		// A monolingual value is identified by its language, as a multilingual
		// container holds at most one entry per language.
		$type = $item[ZTypeRegistry::Z_OBJECT_TYPE] ?? null;
		if ( $type === ZTypeRegistry::Z_MONOLINGUALSTRING
			|| $type === ZTypeRegistry::Z_MONOLINGUALSTRINGSET
		) {
			$languageZid = $type === ZTypeRegistry::Z_MONOLINGUALSTRING
				? ( $item[ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE] ?? null )
				: ( $item[ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE] ?? null );
			return is_string( $languageZid ) ? $this->labels->getLanguage( $languageZid )['name'] : null;
		}

		$key = $this->identifyingKey( $item );
		return $key === null ? null : $this->describe( $item[$key] );
	}

	/**
	 * The key of a record that says which one it is: the one stated for its type,
	 * or failing that its first key other than the type itself.
	 *
	 * @param array $item
	 * @return string|null
	 */
	private function identifyingKey( array $item ): ?string {
		$type = $item[ZTypeRegistry::Z_OBJECT_TYPE] ?? null;
		if ( is_string( $type ) && array_key_exists( $type, self::IDENTIFYING_KEYS ) ) {
			$key = self::IDENTIFYING_KEYS[$type];
			if ( array_key_exists( $key, $item ) ) {
				return $key;
			}
		}

		foreach ( $item as $candidate => $unused ) {
			if ( (string)$candidate !== ZTypeRegistry::Z_OBJECT_TYPE ) {
				return (string)$candidate;
			}
		}
		return null;
	}

	/**
	 * Turn an identifying value into display text: a key becomes its label, a
	 * reference becomes the label of its target, and a short string stands for
	 * itself. Anything else — a nested structure, a long string — identifies
	 * nothing readably and gives null.
	 *
	 * @param mixed $value
	 * @return string|null
	 */
	private function describe( $value ): ?string {
		if ( !is_string( $value ) || $value === '' ) {
			return null;
		}

		if ( ZObjectUtils::isValidZObjectGlobalKey( $value ) ) {
			return $this->labels->getKeyLabel( $value );
		}

		if ( ZObjectUtils::isValidZObjectReference( $value ) ) {
			$reference = $this->labels->getReference( $value );
			return ( $reference === null ) ? $value : ( $reference['label'] ?? $value );
		}

		return mb_strlen( $value ) <= self::MAX_HANDLE_LENGTH ? $value : null;
	}
}
