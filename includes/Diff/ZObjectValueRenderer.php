<?php
/**
 * WikiLambda ZObjectValueRenderer: renders a ZObject value appearing in a
 * revision diff as readable, labelled HTML.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Diff;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Html\Html;
use MediaWiki\Language\MessageLocalizer;

/**
 * Turns the value carried by a diff operation into HTML for a diff cell.
 *
 * Most diff values are leaves — a string, or a reference to another object —
 * and render as one line. But adding or removing a whole sub-tree, or swapping
 * a value for one of a different type, carries a nested structure, which was
 * previously dumped as raw JSON and so was unreadable: keys and references
 * alike appeared as bare ZIDs. Such a value is instead rendered as one
 * "<key label>: <value>" line per key, nesting where a value needs lines of its
 * own, and linking references to their targets.
 *
 * Everything is escaped here, since ZObject leaves — monolingual text, string
 * values, implementation code — are arbitrary wiki content: only this class's
 * own structural markup is ever raw.
 *
 * Output is deliberately styled with nothing but line breaks and leading
 * spaces, so that diffs need no stylesheet of their own beyond the diff table
 * MediaWiki already provides.
 */
class ZObjectValueRenderer {

	/**
	 * How deeply to nest before eliding the remainder. Diff cells are narrow and
	 * a ZObject body can be arbitrarily deep, so past a few levels the structure
	 * costs more to read than it explains.
	 *
	 * Records are the unit of nesting: a list neither indents its items nor
	 * counts against this, since it introduces no labelled level of its own. A
	 * list of lists is therefore bounded by the line budget instead.
	 */
	private const MAX_DEPTH = 3;

	/**
	 * How many lines to render for one value before eliding the remainder, so
	 * that replacing a whole function body cannot flood the diff table.
	 */
	private const MAX_LINES = 20;

	/** Leading spaces marking one level of nesting. */
	private const INDENT = "\u{00A0}\u{00A0}";

	/** @var int Lines still available to the value being rendered. */
	private int $budget = self::MAX_LINES;

	public function __construct(
		private readonly MessageLocalizer $messageLocalizer,
		private readonly DiffLabelResolver $labels
	) {
	}

	/**
	 * Render a diff value as escaped HTML, as one line where it is a leaf and as
	 * a nested block of lines where it is a structure.
	 *
	 * @param mixed $value The value carried by the diff operation
	 * @param string|null $valueKey The key immediately holding it, which decides
	 *   whether a reference-shaped string may be linked; null for free text
	 * @return string
	 */
	public function render( $value, ?string $valueKey = null ): string {
		$this->budget = self::MAX_LINES;
		return implode( '<br />', $this->renderLines( $value, $this->isLinkableKey( $valueKey ), 0 ) );
	}

	/**
	 * Whether a value should be shown whole rather than word-diffed against its
	 * counterpart: true for a structure, whose serialisation says nothing useful
	 * when compared character by character, and for a reference, whose ZID
	 * spelling likewise says nothing about how the target differs.
	 *
	 * @param mixed $value
	 * @param string|null $valueKey The key immediately holding the value
	 * @return bool
	 */
	public function rendersWhole( $value, ?string $valueKey ): bool {
		if ( is_array( $value ) ) {
			return true;
		}
		return $this->isLinkableKey( $valueKey )
			&& $this->referenceLink( $this->renderText( $value ) ) !== null;
	}

	/**
	 * Render a value as plain text, for the callers that word-diff two sides
	 * against each other rather than displaying them whole.
	 *
	 * @param mixed $value
	 * @return string
	 */
	public function renderText( $value ): string {
		return is_string( $value ) ? $value : (string)json_encode(
			$value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
		);
	}

	/**
	 * @param mixed $value
	 * @param bool $linkable Whether a reference-shaped leaf here may be linked
	 * @param int $depth
	 * @return string[] Lines of escaped HTML, without indentation
	 */
	private function renderLines( $value, bool $linkable, int $depth ): array {
		$inline = $this->renderInline( $value, $linkable, $depth );
		if ( $inline !== null ) {
			$this->budget--;
			return [ $inline ];
		}

		// Anything not renderable on one line is an array, either a typed list or
		// a record of keys.
		'@phan-var array $value';
		return self::isList( $value )
			? $this->renderListLines( $value, $depth )
			: $this->renderRecordLines( $value, $depth );
	}

	/**
	 * Render a value on a single line, or return null if it needs more than one.
	 *
	 * @param mixed $value
	 * @param bool $linkable
	 * @param int $depth
	 * @return string|null
	 */
	private function renderInline( $value, bool $linkable, int $depth ): ?string {
		if ( !is_array( $value ) ) {
			return $this->renderScalar( $value, $linkable );
		}

		// A string object carries nothing but its text, so show just the text.
		if ( ( $value[ZTypeRegistry::Z_OBJECT_TYPE] ?? null ) === ZTypeRegistry::Z_STRING ) {
			return $this->renderScalar( $value[ZTypeRegistry::Z_STRING_VALUE] ?? '', false );
		}

		// A monolingual value is keyed by its language, not by its position.
		$monolingual = $this->renderMonolingual( $value );
		if ( $monolingual !== null ) {
			return $monolingual;
		}

		// A list of leaves reads better run together than one item per line.
		if ( self::isList( $value ) ) {
			$items = self::listItems( $value );
			$leaves = array_filter( $items, static fn ( $item ): bool => !is_array( $item ) );
			if ( count( $leaves ) === count( $items ) ) {
				$itemsLinkable = self::listItemsAreLinkable( $value );
				return implode( ', ', array_map(
					fn ( $item ): string => $this->renderScalar( $item, $itemsLinkable ),
					$items
				) );
			}
		}

		// Nothing fits on one line, and there is no room to nest: say how much was
		// left rather than truncating silently, which would read as though the
		// value were complete. Checked only here, so that a value which does fit
		// on one line is always shown however deep it sits.
		if ( $depth >= self::MAX_DEPTH || $this->budget < 1 ) {
			return $this->elision( count( $value ) );
		}

		return null;
	}

	/**
	 * Render a typed list as one line per item, dropping the leading type
	 * reference, which names the type every item already declares.
	 *
	 * @param array $value
	 * @param int $depth
	 * @return string[]
	 */
	private function renderListLines( array $value, int $depth ): array {
		$items = self::listItems( $value );
		$itemsLinkable = self::listItemsAreLinkable( $value );
		$lines = [];
		foreach ( $items as $index => $item ) {
			if ( $this->budget < 1 ) {
				$lines[] = $this->elision( count( $items ) - $index );
				break;
			}
			$lines = array_merge( $lines, $this->renderLines( $item, $itemsLinkable, $depth ) );
		}
		return $lines;
	}

	/**
	 * Render a record as one "<key label>: <value>" line per key, nesting any
	 * value that needs lines of its own underneath its key.
	 *
	 * @param array $value
	 * @param int $depth
	 * @return string[]
	 */
	private function renderRecordLines( array $value, int $depth ): array {
		$keys = $this->recordKeys( $value );
		$lines = [];
		$remaining = count( $keys );
		foreach ( $keys as $key ) {
			if ( $this->budget < 1 ) {
				$lines[] = $this->elision( $remaining );
				break;
			}
			$remaining--;

			$label = htmlspecialchars( $this->labels->getKeyLabel( $key ) ) . ':';
			$valueLines = $this->renderLines( $value[$key], $this->isLinkableKey( $key ), $depth + 1 );
			if ( count( $valueLines ) === 1 ) {
				$lines[] = $label . ' ' . $valueLines[0];
				continue;
			}

			// A multi-line value goes under its key rather than beside it.
			$lines[] = $label;
			foreach ( $valueLines as $line ) {
				$lines[] = self::INDENT . $line;
			}
		}
		return $lines;
	}

	/**
	 * The keys of a record worth showing. The type is dropped when it is a plain
	 * reference, since a homogeneous list repeats it on every item and a labelled
	 * key already says what the value is; it is kept when it is itself a
	 * structure, as a generic type such as "list of strings" is informative.
	 *
	 * @param array $value
	 * @return string[]
	 */
	private function recordKeys( array $value ): array {
		$keys = array_map( 'strval', array_keys( $value ) );
		$type = $value[ZTypeRegistry::Z_OBJECT_TYPE] ?? null;
		return ( $type !== null && !is_array( $type ) )
			? array_values( array_diff( $keys, [ ZTypeRegistry::Z_OBJECT_TYPE ] ) )
			: $keys;
	}

	/**
	 * Render a monolingual string or string set as "<language>: <text>", or null
	 * if this is not one.
	 *
	 * @param array $value
	 * @return string|null
	 */
	private function renderMonolingual( array $value ): ?string {
		$type = $value[ZTypeRegistry::Z_OBJECT_TYPE] ?? null;
		if ( $type === ZTypeRegistry::Z_MONOLINGUALSTRING ) {
			$languageZid = $value[ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE] ?? null;
			$text = $this->renderText( $value[ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE] ?? '' );
		} elseif ( $type === ZTypeRegistry::Z_MONOLINGUALSTRINGSET ) {
			$languageZid = $value[ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE] ?? null;
			$strings = self::listItems( $value[ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE] ?? [] );
			$text = implode( ', ', array_filter( $strings, 'is_string' ) );
		} else {
			return null;
		}

		$name = is_string( $languageZid ) ? $this->labels->getLanguage( $languageZid )['name'] : null;
		$escaped = $this->escapeMultiline( $text );
		return $name === null ? $escaped : htmlspecialchars( $name ) . ': ' . $escaped;
	}

	/**
	 * Render a leaf: a reference in a linkable position becomes a link to its
	 * target, and anything else becomes escaped text.
	 *
	 * @param mixed $value
	 * @param bool $linkable
	 * @return string
	 */
	private function renderScalar( $value, bool $linkable ): string {
		$text = $this->renderText( $value );
		return ( $linkable ? $this->referenceLink( $text ) : null )
			?? $this->escapeMultiline( $text );
	}

	/**
	 * Whether a reference-shaped value held under a key may be linked to its
	 * target.
	 *
	 * Free-text values (monolingual strings, aliases) sit under no key we can
	 * judge, and must never be linked, even when their text happens to look like
	 * a ZID. Neither may values under keys holding literal content: Z6K1 (a
	 * string's value) is the key case and is not in the shared ignore list, so it
	 * is guarded explicitly alongside that list.
	 *
	 * @param string|null $key
	 * @return bool
	 */
	public function isLinkableKey( ?string $key ): bool {
		return $key !== null
			&& $key !== ZTypeRegistry::Z_STRING_VALUE
			&& !in_array( $key, ZTypeRegistry::IGNORE_KEY_VALUES_FOR_LABELLING, true );
	}

	/**
	 * Render a reference as a link to the referenced object's page, labelled
	 * "<label> (<zid>)" (or just the linked id when no label is known). Returns
	 * null for non-references and for ids with no valid target.
	 *
	 * @param string $value
	 * @return string|null
	 */
	private function referenceLink( string $value ): ?string {
		if ( !ZObjectUtils::isValidZObjectReference( $value ) ) {
			return null;
		}

		$reference = $this->labels->getReference( $value );
		if ( $reference === null ) {
			return null;
		}

		$label = $reference['label'] ?? null;
		$text = ( $label === null || $label === '' )
			? $value
			: $label . ' (' . $value . ')';
		return Html::element( 'a', [ 'href' => $reference['url'] ], $text );
	}

	/**
	 * Escape text for HTML, turning newlines into visible line breaks.
	 *
	 * @param string $text
	 * @return string
	 */
	public function escapeMultiline( string $text ): string {
		return implode( '<br />', array_map( 'htmlspecialchars', explode( "\n", $text ) ) );
	}

	/**
	 * The marker standing in for the part of a value that was not rendered.
	 *
	 * The count is of the entries elided at this point — the remaining items of
	 * this list, or keys of this record — rather than of everything below them,
	 * which would mean walking the very structure being skipped.
	 *
	 * @param int $count
	 * @return string
	 */
	private function elision( int $count ): string {
		return htmlspecialchars(
			$this->messageLocalizer->msg( 'wikilambda-diff-value-elided' )->numParams( $count )->text()
		);
	}

	/**
	 * Whether an array is a typed list rather than a record of keys.
	 *
	 * @param array $value
	 * @return bool
	 */
	private static function isList( array $value ): bool {
		foreach ( $value as $key => $unused ) {
			if ( is_string( $key ) ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * The items of a typed list, without the leading reference to the type of
	 * its items.
	 *
	 * @param mixed $value
	 * @return array
	 */
	private static function listItems( $value ): array {
		return is_array( $value ) ? array_values( array_slice( $value, 1 ) ) : [];
	}

	/**
	 * Whether a typed list's items may be linked. Items sit at numeric indices,
	 * which say nothing either way, so judge by the list's own declared item
	 * type: a list of references may be linked, whereas a list of strings — the
	 * strings of an alias set, say — holds literal text and may not.
	 *
	 * @param array $value
	 * @return bool
	 */
	private static function listItemsAreLinkable( array $value ): bool {
		return ( $value[0] ?? null ) !== ZTypeRegistry::Z_STRING;
	}
}
