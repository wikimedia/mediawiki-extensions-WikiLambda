<?php
/**
 * WikiLambda ZObjectDiffVisualiser: turns a computed ZObjectDiffer diff into
 * grouped, labelled MediaWiki diff-table rows.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Diff;

use Closure;
use Diff\DiffOp\DiffOp;
use Diff\DiffOp\DiffOpAdd;
use Diff\DiffOp\DiffOpChange;
use Diff\DiffOp\DiffOpRemove;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Html\Html;
use MediaWiki\Language\MessageLocalizer;
use UnexpectedValueException;
use Wikimedia\Diff\WordLevelDiff;

/**
 * Renders the flattened output of ZObjectDiffer as a sequence of MediaWiki
 * diff-table rows, grouped under human-readable, localised headers for the
 * top-level ZPersistentObject keys (name, aliases, description, value).
 *
 * This is the WikiLambda analogue of Wikibase's BasicDiffView. It reuses
 * ZObjectDiffer::flattenDiff() — the same diff the authorization layer
 * consumes — rather than re-walking the object tree.
 *
 * Monolingual values (Z11/Z31) anywhere in the tree are keyed by their
 * language rather than by their raw list index, and additions/removals of a
 * whole multilingual structure (Z12/Z32) are decomposed into one row per
 * language, matching how Wikibase presents term diffs.
 *
 * NOTE (T284473): This iteration localises the top-level group key and the
 * language of monolingual values. Contextual, type-relative key labels for
 * deeper Z2K2 (function body) paths are deferred to a follow-up, as they
 * require batched label lookups against ZObjectStore.
 */
class ZObjectDiffVisualiser {

	/**
	 * @param MessageLocalizer $messageLocalizer
	 * @param Closure $languageResolver Maps a language ZObject id (e.g. 'Z1002')
	 *   to [ 'name' => string, 'code' => string, 'dir' => string ] in the
	 *   viewer's language — the display name (falling back to the id), the BCP-47
	 *   code (empty if unknown), and the writing direction ('ltr'/'rtl'/'auto').
	 * @param Closure $keyLabelResolver Maps a global key (e.g. 'Z8K1') to its
	 *   human-readable label, falling back to the key itself; other segments
	 *   (list indices, bare local keys) are returned unchanged.
	 * @param Closure $referenceResolver Maps a referenced ZObject id (e.g. 'Z40')
	 *   to [ 'label' => ?string, 'url' => string ], or null when the id has no
	 *   valid target, so reference-valued changes can render as links.
	 */
	public function __construct(
		private readonly MessageLocalizer $messageLocalizer,
		private readonly Closure $languageResolver,
		private readonly Closure $keyLabelResolver,
		private readonly Closure $referenceResolver
	) {
	}

	/**
	 * Build the HTML diff body (a sequence of <tr> rows) for a computed diff.
	 *
	 * @param DiffOp $diffOp The diff returned by ZObjectDiffer::doDiff()
	 * @param array $oldObject The old ZObject as a nested array (for language lookups)
	 * @param array $newObject The new ZObject as a nested array (for language lookups)
	 * @return string HTML: one or more <tr> tags, or '' if there are no changes
	 */
	public function visualiseDiff( DiffOp $diffOp, array $oldObject = [], array $newObject = [] ): string {
		// Partition the flattened changes into the two top-level sections shown
		// as <h2> headings — "About" (name, aliases, description) and "Contents"
		// (the value/body) — preserving encounter order within each. Anything
		// else (e.g. a bare identifier or type change) is rendered ungrouped.
		$aboutKeys = [
			ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL,
			ZTypeRegistry::Z_PERSISTENTOBJECT_ALIASES,
			ZTypeRegistry::Z_PERSISTENTOBJECT_DESCRIPTION,
		];
		$about = [];
		$contents = [];
		$other = [];
		foreach ( ZObjectDiffer::flattenDiff( $diffOp ) as $entry ) {
			$head = $entry['path'][0] ?? null;
			if ( in_array( $head, $aboutKeys, true ) ) {
				$about[] = $entry;
			} elseif ( $head === ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ) {
				$contents[] = $entry;
			} else {
				$other[] = $entry;
			}
		}

		$html = '';
		if ( $about ) {
			$html .= $this->generateSectionHeaderHtml( 'wikilambda-diff-section-about' );
			foreach ( $about as $entry ) {
				$html .= $this->renderEntry( $entry['path'], $entry['op'], $oldObject, $newObject, false );
			}
		}
		if ( $contents ) {
			$html .= $this->generateSectionHeaderHtml( 'wikilambda-diff-section-contents' );
			foreach ( $contents as $entry ) {
				// The "Value" group key is represented by the section heading, so
				// drop it from the per-row breadcrumb.
				$html .= $this->renderEntry( $entry['path'], $entry['op'], $oldObject, $newObject, true );
			}
		}
		foreach ( $other as $entry ) {
			$html .= $this->renderEntry( $entry['path'], $entry['op'], $oldObject, $newObject, false );
		}
		return $html;
	}

	/**
	 * Render a single flattened diff entry, choosing a language-aware layout for
	 * monolingual and multilingual values and falling back to a plain path
	 * breadcrumb otherwise.
	 *
	 * @param array $path
	 * @param DiffOp $op
	 * @param array $oldObject
	 * @param array $newObject
	 * @param bool $dropGroupHead Whether the top-level group key is already shown
	 *   as a section heading and should be omitted from the breadcrumb
	 * @return string
	 */
	private function renderEntry(
		array $path, DiffOp $op, array $oldObject, array $newObject, bool $dropGroupHead
	): string {
		$type = $op->getType();

		// Addition/removal of a whole monolingual or multilingual structure:
		// read the language(s) straight from the value and decompose.
		if ( $type === 'add' || $type === 'remove' ) {
			$value = $this->sidedValue( $op );
			if ( is_array( $value ) && $this->isMultilingualContainer( $value ) ) {
				return $this->renderMultilingualContainer( $path, $value, $type, $dropGroupHead );
			}
			if ( is_array( $value ) && $this->isMonolingual( $value ) ) {
				return $this->renderMonolingual(
					$this->fieldPathOf( $path ),
					$this->monolingualLanguageZid( $value ),
					$this->monolingualText( $value ),
					$type,
					$dropGroupHead
				);
			}
		}

		// Any leaf change, or addition/removal of a single string, that sits
		// inside a monolingual value (e.g. one alias in a set) is headed by its
		// language rather than by the raw list index.
		$context = $this->languageContext( $path, $oldObject, $newObject );
		if ( $context !== null ) {
			$header = $this->generateDiffHeaderHtml(
				$this->labelWithLanguage( $context['fieldPath'], $context['languageZid'], $dropGroupHead )
			);
			$language = $this->languageAttributes( $context['languageZid'] );
			if ( $type === 'change' ) {
				'@phan-var DiffOpChange $op';
				return $header . $this->generateChangeRowHtml( $op, null, $language );
			}
			$line = $this->getChangedLine(
				$type === 'add' ? 'ins' : 'del',
				$this->stringifyValue( $this->sidedValue( $op ) )
			);
			return $header . ( $type === 'add'
				? $this->generateHtmlDiffTableRow( null, $line, $language )
				: $this->generateHtmlDiffTableRow( $line, null, $language ) );
		}

		// Fallback: plain breadcrumb with only the top-level group localised.
		return $this->generateDiffHeaderHtml( $this->renderPathLabel( $path, $dropGroupHead ) )
			. $this->generateOpRowHtml( $op, $this->valueKeyOf( $path ) );
	}

	/**
	 * Decompose an added/removed multilingual container (Z12/Z32) into one row
	 * per language, rather than dumping its raw JSON.
	 *
	 * @param array $fieldPath Path to the field holding the container
	 * @param array $container The Z12/Z32 value
	 * @param string $type 'add' or 'remove'
	 * @param bool $dropGroupHead
	 * @return string
	 */
	private function renderMultilingualContainer(
		array $fieldPath, array $container, string $type, bool $dropGroupHead
	): string {
		$listKey = $container['Z1K1'] === ZTypeRegistry::Z_MULTILINGUALSTRING
			? ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE
			: ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE;

		$html = '';
		foreach ( $container[$listKey] ?? [] as $item ) {
			// Skip the leading type reference (e.g. 'Z11') in the typed list.
			if ( !is_array( $item ) || !$this->isMonolingual( $item ) ) {
				continue;
			}
			$html .= $this->renderMonolingual(
				$fieldPath,
				$this->monolingualLanguageZid( $item ),
				$this->monolingualText( $item ),
				$type,
				$dropGroupHead
			);
		}
		return $html;
	}

	/**
	 * Render a single monolingual (Z11/Z31) value as an added or removed row,
	 * headed by its field label and language.
	 *
	 * @param array $fieldPath
	 * @param string|null $languageZid
	 * @param string $text
	 * @param string $type 'add' or 'remove'
	 * @param bool $dropGroupHead
	 * @return string
	 */
	private function renderMonolingual(
		array $fieldPath, ?string $languageZid, string $text, string $type, bool $dropGroupHead
	): string {
		$header = $this->generateDiffHeaderHtml(
			$this->labelWithLanguage( $fieldPath, $languageZid, $dropGroupHead )
		);
		$language = $this->languageAttributes( $languageZid );
		$line = $this->getChangedLine( $type === 'add' ? 'ins' : 'del', $text );
		return $header . ( $type === 'add'
			? $this->generateHtmlDiffTableRow( null, $line, $language )
			: $this->generateHtmlDiffTableRow( $line, null, $language ) );
	}

	/**
	 * If a changed leaf sits inside a monolingual value, return the field path
	 * (up to the multilingual container) and the language of that value, so the
	 * change can be headed "<field> (<language>)" instead of by list index.
	 *
	 * @param array $path
	 * @param array $oldObject
	 * @param array $newObject
	 * @return array{fieldPath:array,languageZid:string}|null
	 */
	private function languageContext( array $path, array $oldObject, array $newObject ): ?array {
		for ( $i = count( $path ) - 1; $i >= 0; $i-- ) {
			$languageKey = match ( $path[$i] ) {
				ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE => ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE,
				ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE => ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE,
				default => null,
			};
			if ( $languageKey === null || !isset( $path[$i + 1] ) ) {
				continue;
			}

			// The monolingual entry is at <container>/<index>; its language is a sibling.
			$languagePath = array_merge( array_slice( $path, 0, $i + 2 ), [ $languageKey ] );
			$languageZid = $this->navigate( $newObject, $languagePath )
				?? $this->navigate( $oldObject, $languagePath );
			if ( !is_string( $languageZid ) ) {
				// Not actually a monolingual container here; keep scanning
				// outwards in case an enclosing one applies.
				continue;
			}

			return [
				'fieldPath' => array_slice( $path, 0, $i ),
				'languageZid' => $languageZid,
			];
		}
		return null;
	}

	/**
	 * If a path ends in a multilingual container entry (…/Z12K1/<index> or
	 * …/Z32K1/<index>), strip that suffix to get the field that holds it.
	 *
	 * @param array $path
	 * @return array
	 */
	private function fieldPathOf( array $path ): array {
		$count = count( $path );
		if ( $count >= 2 && (
			$path[$count - 2] === ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE ||
			$path[$count - 2] === ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE
		) ) {
			return array_slice( $path, 0, $count - 2 );
		}
		return $path;
	}

	/**
	 * Walk a nested array by a path of keys/indices, returning null if any step
	 * is missing.
	 *
	 * @param array $object
	 * @param array $path
	 * @return mixed
	 */
	private function navigate( array $object, array $path ) {
		$node = $object;
		foreach ( $path as $key ) {
			if ( !is_array( $node ) || !array_key_exists( $key, $node ) ) {
				return null;
			}
			$node = $node[$key];
		}
		return $node;
	}

	private function isMultilingualContainer( array $value ): bool {
		return ( $value['Z1K1'] ?? null ) === ZTypeRegistry::Z_MULTILINGUALSTRING
			|| ( $value['Z1K1'] ?? null ) === ZTypeRegistry::Z_MULTILINGUALSTRINGSET;
	}

	private function isMonolingual( array $value ): bool {
		return ( $value['Z1K1'] ?? null ) === ZTypeRegistry::Z_MONOLINGUALSTRING
			|| ( $value['Z1K1'] ?? null ) === ZTypeRegistry::Z_MONOLINGUALSTRINGSET;
	}

	private function monolingualLanguageZid( array $value ): ?string {
		$language = ( $value['Z1K1'] ?? null ) === ZTypeRegistry::Z_MONOLINGUALSTRING
			? ( $value[ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE] ?? null )
			: ( $value[ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE] ?? null );
		return is_string( $language ) ? $language : null;
	}

	/**
	 * Extract the display string(s) from a monolingual value: the text of a Z11,
	 * or the comma-joined strings of a Z31 string set (skipping the leading type
	 * reference in the typed list).
	 *
	 * @param array $value
	 * @return string
	 */
	private function monolingualText( array $value ): string {
		if ( ( $value['Z1K1'] ?? null ) === ZTypeRegistry::Z_MONOLINGUALSTRING ) {
			return (string)( $value[ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE] ?? '' );
		}
		$strings = array_slice( $value[ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE] ?? [], 1 );
		return implode( ', ', array_filter( $strings, 'is_string' ) );
	}

	/**
	 * Compose a field label ("Name", "Value / Z8K1 / …") with its language in
	 * parentheses. Plain text; escaped when placed in the header.
	 *
	 * @param array $fieldPath
	 * @param string|null $languageZid
	 * @param bool $dropGroupHead
	 * @return string
	 */
	private function labelWithLanguage( array $fieldPath, ?string $languageZid, bool $dropGroupHead ): string {
		$label = $this->renderPathLabel( $fieldPath, $dropGroupHead );
		if ( $languageZid === null ) {
			return $label;
		}
		$language = '(' . ( $this->languageResolver )( $languageZid )['name'] . ')';
		return $label === '' ? $language : $label . ' ' . $language;
	}

	/**
	 * Resolve the HTML lang/dir attributes for a language-specific value, so it
	 * renders in its own script and direction rather than inheriting the
	 * interface chrome's direction. Returns null when there is no language.
	 *
	 * @param string|null $languageZid
	 * @return array{code:string,dir:string}|null
	 */
	private function languageAttributes( ?string $languageZid ): ?array {
		if ( $languageZid === null ) {
			return null;
		}
		$language = ( $this->languageResolver )( $languageZid );
		return [ 'code' => $language['code'], 'dir' => $language['dir'] ];
	}

	/**
	 * HTML attributes tagging a value cell with its own language and direction.
	 * These go on the cell's block-level content <div> (not an inline span) so
	 * the value gets both its base direction and alignment, overriding the diff
	 * table's inherited direction. Empty when the language is unknown.
	 *
	 * @param array{code:string,dir:string}|null $language
	 * @return array
	 */
	private function languageCellAttributes( ?array $language ): array {
		if ( $language === null ) {
			return [];
		}
		$attributes = [ 'dir' => $language['dir'] ];
		if ( $language['code'] !== '' ) {
			$attributes['lang'] = $language['code'];
		}
		return $attributes;
	}

	/**
	 * Turn a diff path into a human-readable breadcrumb. The head segment (a
	 * top-level ZPersistentObject key) is localised; deeper segments are shown
	 * verbatim for now.
	 *
	 * @param array $path Sequence of keys/indices, e.g. [ 'Z2K3', 'Z12K1', 1, 'Z11K2' ]
	 * @param bool $dropGroupHead When true, the top-level group key is shown as a
	 *   section heading, so drop it and leave the remaining body keys verbatim
	 * @return string Plain text, e.g. "Name / Z12K1 / 1 / Z11K2"
	 */
	private function renderPathLabel( array $path, bool $dropGroupHead = false ): string {
		if ( $dropGroupHead ) {
			// The head is the section heading; label the remaining body keys.
			return implode( ' / ', array_map( [ $this, 'labelSegment' ], array_slice( $path, 1 ) ) );
		}

		if ( $path === [] ) {
			return $this->messageLocalizer->msg( 'wikilambda-diff-group-object' )->text();
		}

		$segments = [ $this->localiseGroupKey( (string)$path[0] ) ];
		foreach ( array_slice( $path, 1 ) as $segment ) {
			$segments[] = $this->labelSegment( $segment );
		}
		return implode( ' / ', $segments );
	}

	/**
	 * Turn a single path segment into display text: a global key becomes its
	 * human-readable label; a list index or unresolvable key is left verbatim.
	 *
	 * @param string|int $segment
	 * @return string
	 */
	private function labelSegment( $segment ): string {
		return ( $this->keyLabelResolver )( (string)$segment );
	}

	/**
	 * Map a top-level ZPersistentObject key to its localised group label,
	 * falling back to the raw key for anything unrecognised.
	 *
	 * @param string $key
	 * @return string
	 */
	private function localiseGroupKey( string $key ): string {
		$message = match ( $key ) {
			ZTypeRegistry::Z_PERSISTENTOBJECT_ID => 'wikilambda-diff-group-zid',
			ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE => 'wikilambda-diff-group-value',
			ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL => 'wikilambda-diff-group-name',
			ZTypeRegistry::Z_PERSISTENTOBJECT_ALIASES => 'wikilambda-diff-group-aliases',
			ZTypeRegistry::Z_PERSISTENTOBJECT_DESCRIPTION => 'wikilambda-diff-group-description',
			default => null,
		};
		return $message === null ? $key : $this->messageLocalizer->msg( $message )->text();
	}

	/**
	 * Render the value row(s) for a single atomic diff operation (fallback path,
	 * used when no language-aware layout applies).
	 *
	 * @param DiffOp $op
	 * @param string|null $valueKey The key immediately holding the changed value
	 * @return string
	 */
	private function generateOpRowHtml( DiffOp $op, ?string $valueKey = null ): string {
		switch ( $op->getType() ) {
			case 'add':
				'@phan-var DiffOpAdd $op';
				return $this->generateHtmlDiffTableRow(
					null,
					$this->getChangedLine( 'ins', $this->stringifyValue( $op->getNewValue() ), $valueKey )
				);

			case 'remove':
				'@phan-var DiffOpRemove $op';
				return $this->generateHtmlDiffTableRow(
					$this->getChangedLine( 'del', $this->stringifyValue( $op->getOldValue() ), $valueKey ),
					null
				);

			case 'change':
				'@phan-var DiffOpChange $op';
				return $this->generateChangeRowHtml( $op, $valueKey );

			default:
				throw new UnexpectedValueException( 'Unsupported diff operation type: ' . $op->getType() );
		}
	}

	/**
	 * Render a change to a leaf value. A reference-valued change is shown as a
	 * whole-token swap of links (old on the deleted side, new on the added);
	 * anything else uses an inline word-level diff.
	 *
	 * @param DiffOpChange $op
	 * @param string|null $valueKey The key immediately holding the changed value
	 * @param array{code:string,dir:string}|null $language Value's language, if any
	 * @return string
	 */
	private function generateChangeRowHtml(
		DiffOpChange $op, ?string $valueKey = null, ?array $language = null
	): string {
		$old = $this->stringifyValue( $op->getOldValue() );
		$new = $this->stringifyValue( $op->getNewValue() );

		// If either side is a reference, render both as links rather than
		// character-diffing ZID strings against each other.
		if ( $this->referenceLink( $old, $valueKey ) !== null
			|| $this->referenceLink( $new, $valueKey ) !== null
		) {
			return $this->generateHtmlDiffTableRow(
				$this->getChangedLine( 'del', $old, $valueKey ),
				$this->getChangedLine( 'ins', $new, $valueKey ),
				$language
			);
		}

		// WordLevelDiff splits its input on newlines and returns one
		// (already-escaped) HTML fragment per line; ZObject leaf values may be
		// multi-line, so join every line with a visible break rather than
		// taking only the first as a single-line diff would.
		$wordLevelDiff = new WordLevelDiff( [ $old ], [ $new ] );
		return $this->generateHtmlDiffTableRow(
			implode( '<br />', $wordLevelDiff->orig() ),
			implode( '<br />', $wordLevelDiff->closing() ),
			$language
		);
	}

	/**
	 * Return the value carried by an added or removed diff operation, narrowing
	 * the base DiffOp type to the add/remove subtypes that expose it.
	 *
	 * @param DiffOp $op
	 * @return mixed The new value for an addition, the old value for a removal,
	 *   or null for any other operation type
	 */
	private function sidedValue( DiffOp $op ) {
		if ( $op instanceof DiffOpAdd ) {
			return $op->getNewValue();
		}
		if ( $op instanceof DiffOpRemove ) {
			return $op->getOldValue();
		}
		return null;
	}

	/**
	 * Coerce a diff value to a display string. ZObject leaves are strings, but
	 * add/remove of a whole sub-tree carries an array; render that as compact
	 * JSON for now (proper summarisation is deferred to a follow-up).
	 *
	 * @param mixed $value
	 * @return string
	 */
	private function stringifyValue( $value ): string {
		return is_string( $value )
			? $value
			: ( json_encode( $value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) ?: '' );
	}

	/**
	 * Wrap a value in an inline diff-change element, escaping it and rendering
	 * any newlines as visible breaks.
	 *
	 * @param string $tag 'ins' for additions, 'del' for removals
	 * @param string $value
	 * @param string|null $valueKey The key immediately holding the value
	 * @return string
	 */
	private function getChangedLine( string $tag, string $value, ?string $valueKey = null ): string {
		$inner = $this->referenceLink( $value, $valueKey ) ?? $this->escapeMultiline( $value );
		return Html::rawElement(
			$tag,
			[ 'class' => 'diffchange diffchange-inline' ],
			$inner
		);
	}

	/**
	 * If a value is a ZObject reference in a labellable position, render it as a
	 * link to the referenced object's page, labelled "<label> (<zid>)" (or just
	 * the linked id when no label is known). Returns null for non-references,
	 * literal positions, or ids with no valid target.
	 *
	 * @param string $value
	 * @param string|null $valueKey The key immediately holding the value
	 * @return string|null
	 */
	private function referenceLink( string $value, ?string $valueKey ): ?string {
		// Only leaf values with a known key position are candidate references.
		// Free-text values (monolingual strings, aliases) pass a null key and
		// must never be linked, even when their text happens to look like a ZID.
		// Likewise values under keys that hold literal content: Z6K1 (a string's
		// value) is the key case and is not in the shared ignore list, so guard
		// it explicitly alongside that list.
		if ( $valueKey === null
			|| $valueKey === ZTypeRegistry::Z_STRING_VALUE
			|| in_array( $valueKey, ZTypeRegistry::IGNORE_KEY_VALUES_FOR_LABELLING, true )
		) {
			return null;
		}
		if ( !ZObjectUtils::isValidZObjectReference( $value ) ) {
			return null;
		}

		$reference = ( $this->referenceResolver )( $value );
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
	 * The key immediately holding a leaf value is the last path segment; return
	 * it as a string (list indices included), or null for an empty path.
	 *
	 * @param array $path
	 * @return string|null
	 */
	private function valueKeyOf( array $path ): ?string {
		return $path === [] ? null : (string)$path[count( $path ) - 1];
	}

	/**
	 * Escape text for HTML, turning newlines into visible line breaks.
	 *
	 * @param string $text
	 * @return string
	 */
	private function escapeMultiline( string $text ): string {
		return implode( '<br />', array_map( 'htmlspecialchars', explode( "\n", $text ) ) );
	}

	/**
	 * Emit a full-width table row carrying an <h2> section heading (e.g. the
	 * "About" and "Contents" super-groups).
	 *
	 * @param string $messageKey
	 * @return string
	 */
	private function generateSectionHeaderHtml( string $messageKey ): string {
		$heading = Html::element( 'h2', [], $this->messageLocalizer->msg( $messageKey )->text() );
		return Html::rawElement( 'tr', [],
			Html::rawElement( 'td', [ 'colspan' => '4' ], $heading ) );
	}

	/**
	 * Emit the two-cell 'diff-lineno' header row that labels a change.
	 *
	 * @param string $name Plain-text label
	 * @return string
	 */
	private function generateDiffHeaderHtml( string $name ): string {
		$header = Html::element( 'td', [ 'colspan' => '2', 'class' => 'diff-lineno' ], $name );
		return Html::rawElement( 'tr', [], $header . $header );
	}

	/**
	 * Emit a diff-table row with the old (deleted) and/or new (added) sides.
	 * At least one of the two HTML fragments must be non-null.
	 *
	 * @param string|null $oldHtml Pre-escaped HTML for the deleted side, or null
	 * @param string|null $newHtml Pre-escaped HTML for the added side, or null
	 * @param array{code:string,dir:string}|null $language Language/direction to
	 *   tag the value on, for language-specific values; null leaves it undirected
	 * @return string
	 */
	private function generateHtmlDiffTableRow(
		?string $oldHtml, ?string $newHtml, ?array $language = null
	): string {
		$divAttributes = $this->languageCellAttributes( $language );
		$html = Html::openElement( 'tr' );
		if ( $oldHtml !== null ) {
			$html .= Html::rawElement( 'td', [ 'class' => 'diff-marker', 'data-marker' => '−' ] );
			$html .= Html::rawElement( 'td', [ 'class' => 'diff-deletedline' ],
				Html::rawElement( 'div', $divAttributes, $oldHtml ) );
		}
		if ( $newHtml !== null ) {
			if ( $oldHtml === null ) {
				$html .= Html::element( 'td', [ 'colspan' => '2' ], "\u{00A0}" );
			}
			$html .= Html::rawElement( 'td', [ 'class' => 'diff-marker', 'data-marker' => '+' ] );
			$html .= Html::rawElement( 'td', [ 'class' => 'diff-addedline' ],
				Html::rawElement( 'div', $divAttributes, $newHtml ) );
		}
		$html .= Html::closeElement( 'tr' );
		return $html;
	}
}
