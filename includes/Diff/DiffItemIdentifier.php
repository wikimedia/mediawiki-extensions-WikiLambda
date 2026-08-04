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
 * Which part of the content identifies an item is DiffItemKeyer's business;
 * this class turns that part into something a reader can read, resolving keys
 * and references to their labels.
 *
 * The handles produced are plain text, never HTML. They are for display only:
 * they are localised, and they may be shared by items a reader would not
 * confuse, so they must never be used to pair items across revisions — that is
 * what DiffItemKeyer::getJoinKey() is for.
 */
class DiffItemIdentifier {

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
		if ( DiffItemKeyer::isMonolingual( $item ) ) {
			$languageZid = DiffItemKeyer::languageZidOf( $item );
			return $languageZid === null ? null : $this->labels->getLanguage( $languageZid )['name'];
		}

		$key = DiffItemKeyer::identifyingKey( $item );
		return $key === null ? null : $this->describe( $item[$key] );
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
