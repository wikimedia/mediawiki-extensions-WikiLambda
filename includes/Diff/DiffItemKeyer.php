<?php
/**
 * WikiLambda DiffItemKeyer: works out which part of a list item identifies it,
 * and keys it for pairing across revisions.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Diff;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;

/**
 * Answers "which one is this?" for an item of a typed list, structurally.
 *
 * A list index is a poor way to refer to an item: it means nothing to a reader,
 * and it is not stable, since inserting or removing an item renumbers every item
 * after it. The item's own content identifies it far better.
 *
 * This class resolves nothing — no labels, no database, no language — which is
 * what lets ZObjectListDiffer use it while diffing, where no such services are
 * available. DiffItemIdentifier builds on it to name items for a reader.
 */
class DiffItemKeyer {

	/**
	 * Types whose identifying key is not the first key of the record.
	 *
	 * Stored content is key-sorted, so a record's lowest-numbered key comes
	 * first, and for most types that key is the one that says which item this
	 * is. An implementation or a tester starts with the function it belongs to,
	 * for example. Two shapes must be stated instead.
	 *
	 * For a key or an argument declaration the first key is the type — which
	 * every second key or string argument in the wiki shares — whereas the key
	 * or argument id names precisely one, and labels well. For a function or an
	 * error type the identity sorts last, behind a list of arguments or of keys
	 * that identifies nothing on its own.
	 */
	private const IDENTIFYING_KEYS = [
		ZTypeRegistry::Z_KEY => ZTypeRegistry::Z_KEY_ID,
		ZTypeRegistry::Z_ARGUMENTDECLARATION => ZTypeRegistry::Z_ARGUMENTDECLARATION_ID,
		ZTypeRegistry::Z_FUNCTION => ZTypeRegistry::Z_FUNCTION_IDENTITY,
		ZTypeRegistry::Z_ERRORTYPE => ZTypeRegistry::Z_ERRORTYPE_ID,
	];

	/**
	 * Key an item for pairing against the other revision's items, or return null
	 * where it cannot be keyed reliably.
	 *
	 * A key must be exact and stable, so it stays a ZID: a reference keys on its
	 * own ZID rather than on any label, a monolingual value on its language, and a
	 * record on the raw value of whichever key identifies its type.
	 *
	 * Callers must not assume keys are unique; two implementations of one function
	 * share theirs. Use uniqueJoinKeys() to get only the keys that name one item.
	 *
	 * @param mixed $item The item, as a nested array or a leaf
	 * @return string|null
	 */
	public static function getJoinKey( $item ): ?string {
		if ( !is_array( $item ) ) {
			return is_string( $item ) && $item !== '' ? $item : null;
		}

		// A multilingual container holds at most one entry per language, so the
		// language is an exact key for a monolingual value.
		if ( self::isMonolingual( $item ) ) {
			return self::languageZidOf( $item );
		}

		$key = self::identifyingKey( $item );
		$value = $key === null ? null : $item[$key];
		return is_string( $value ) && $value !== '' ? $value : null;
	}

	/**
	 * The join keys of a list's items that name exactly one item, as a map of key
	 * to index.
	 *
	 * Items sharing a key, and items with no key at all, are left out: they can
	 * only be paired up by some other means. The list is taken as stored, so its
	 * leading reference to the type of its items is keyed like any other item,
	 * and pairs with the other revision's.
	 *
	 * @param array $items
	 * @return array<string,int> Join key => index
	 */
	public static function uniqueJoinKeys( array $items ): array {
		$indices = [];
		$shared = [];
		foreach ( $items as $index => $item ) {
			$key = self::getJoinKey( $item );
			if ( $key === null ) {
				continue;
			}
			if ( array_key_exists( $key, $indices ) ) {
				$shared[$key] = true;
				continue;
			}
			$indices[$key] = $index;
		}
		return array_diff_key( $indices, $shared );
	}

	/**
	 * The key of a record that says which one it is: the one stated for its type,
	 * or failing that its first key other than the type itself.
	 *
	 * @param array $item
	 * @return string|null
	 */
	public static function identifyingKey( array $item ): ?string {
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
	 * Whether an item is a monolingual string or string set, which are identified
	 * by their language rather than by any of their keys.
	 *
	 * @param array $item
	 * @return bool
	 */
	public static function isMonolingual( array $item ): bool {
		$type = $item[ZTypeRegistry::Z_OBJECT_TYPE] ?? null;
		return $type === ZTypeRegistry::Z_MONOLINGUALSTRING
			|| $type === ZTypeRegistry::Z_MONOLINGUALSTRINGSET;
	}

	/**
	 * The ZID of a monolingual item's language, or null if it has none or this is
	 * not a monolingual item.
	 *
	 * @param array $item
	 * @return string|null
	 */
	public static function languageZidOf( array $item ): ?string {
		$languageZid = ( $item[ZTypeRegistry::Z_OBJECT_TYPE] ?? null ) === ZTypeRegistry::Z_MONOLINGUALSTRING
			? ( $item[ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE] ?? null )
			: ( $item[ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE] ?? null );
		return is_string( $languageZid ) && $languageZid !== '' ? $languageZid : null;
	}
}
