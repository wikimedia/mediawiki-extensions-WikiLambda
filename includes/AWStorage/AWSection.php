<?php
/**
 * WikiLambda Abstract Wikipedia Section Store: AWSection Object
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\AWStorage;

use MediaWiki\Html\Html;
use Wikimedia\HtmlArmor\HtmlArmor;
use Wikimedia\Timestamp\ConvertibleTimestamp;

class AWSection {

	/** The section contains all ready and successful fragments */
	public const STATUS_OK = 0;
	/** The section contains pending fragments */
	public const STATUS_PENDING = 1;
	/** The section contains failing fragments */
	public const STATUS_FAILING = 2;
	/** The section has no status record yet */
	public const STATUS_UNKNOWN = 5;

	/** String to concatenate different fragment html blobs */
	public const FRAGMENT_SEPARATOR = "\n";

	private string $payload;
	private ConvertibleTimestamp $lastUpdated;
	private int $status;

	public function __construct(
		private readonly string $topicQid,
		private readonly string $sectionQid,
		private readonly string $locale,
		string $payload = '',
		?ConvertibleTimestamp $lastUpdated = null,
		private readonly int $schemaVersion = AWArticleStore::AW_STORAGE_SCHEMA_VERSION,
	) {
		$this->payload = $payload;
		$this->lastUpdated = $lastUpdated ?? new ConvertibleTimestamp();
		// If the section is initialized with a non-empty payload, we set the
		// status as unknown, as it could have pending or failing fragments.
		$this->status = $payload !== '' ? self::STATUS_UNKNOWN : self::STATUS_OK;
	}

	/**
	 * Returns the Wikidata QID that identifies this AW Article.
	 * E.g. Q42 for Douglas Adams
	 *
	 * @return string
	 */
	public function getTopicQid(): string {
		return $this->topicQid;
	}

	/**
	 * Returns the Wikidata QID that identifies this AW Article Section.
	 * E.g. Q8776414 for Lede
	 *
	 * @return string
	 */
	public function getSectionQid(): string {
		return $this->sectionQid;
	}

	/**
	 * Returns the MediaWiki's BCP-47 locale identifier.
	 * E.g. es-mx
	 *
	 * @return string
	 */
	public function getLocale(): string {
		return $this->locale;
	}

	/**
	 * Returns the Timestamp for the latest update.
	 *
	 * @see https://www.mediawiki.org/wiki/Timestamp
	 * @return ConvertibleTimestamp
	 */
	public function getLastUpdated(): ConvertibleTimestamp {
		return $this->lastUpdated;
	}

	/**
	 * Returns the payload stored for this AW Article Section, which
	 * contains an HTML blob with the output of the Section pre-generation
	 * maintenance script (for schema version 1)
	 *
	 * @return string
	 */
	public function getPayload(): string {
		return $this->payload;
	}

	/**
	 * Returns the current schema version for this object.
	 *
	 * NOTE: or future schema updates, schema versioning can be adapted
	 * to be externally configurable. Currently schemaVersion is hardcoded
	 * in the AWArticleStore::AW_STORAGE_SCHEMA_VERSION constant.
	 *
	 * @return int
	 */
	public function getSchemaVersion(): int {
		return $this->schemaVersion;
	}

	/**
	 * Whether this AWSection contains any pending AWFragment.
	 *
	 * TODO: this is only valid when creating the section and appending its fragments one
	 * by one, but when loading the section from the store, we don't have this info (yet).
	 *
	 * One solution that would make section status be accurate at any time (which might
	 * become necessary in the future) would be to save it into the store, which means:
	 * * a table schema update to add a new column,
	 * * a new key in the MainStash payload,
	 * * update the AWArticleStore interfaces and all their implementations.
	 *
	 * Another possibility, without having to modify the data schema is:
	 * * if STATUS_UNKNOWN, then infer status from payload
	 * * if the section payload has an element marked with a pending fragment class
	 * or attribute (e.g. with a class="wf-some-class-for-pending"), return true
	 *
	 * @return bool
	 */
	public function isPending(): bool {
		return $this->status === self::STATUS_PENDING;
	}

	/**
	 * Appends a fragment html blob to the existing payload.
	 *
	 * @param AWFragment $awFragment
	 * @return void
	 */
	public function appendFragment( $awFragment ): void {
		$htmlFragment = '';

		// Fragment is a miss: set section as pending, generate pending placeholder for fragment
		if ( $awFragment->isMissing() ) {
			$this->status = self::STATUS_PENDING;
			$htmlFragment = AWFragmentStore::createPendingFragmentBlock( $this->locale );
		} else {
			$awFragmentValue = $awFragment->getValue()['value'];

			if ( !$awFragment->isOk() ) {
				// Fragment exists but is a failure: generate error fragment html
				$this->status = self::STATUS_FAILING;
				$htmlFragment = AWFragmentStore::createFailingFragmentBlock( $this->locale );
			} else {
				// Fragment exists and is a success:
				// AWFragment value has been through the rendering and sanitising pipeline
				// (WikifunctionsFragmentRender) so we know it's safe for raw HTML output.
				$htmlFragment = $awFragmentValue;
			}
		}

		// Precede fragment with separator if not the first one
		if ( $this->payload !== '' ) {
			$this->payload .= self::FRAGMENT_SEPARATOR;
		}

		// Append the fragment to the existing payload
		$this->payload .= $htmlFragment;
	}

	/**
	 * Returns the section as HtmlArmor object wrapping a <section> entity.
	 * The section will be preceded by a heading (<h2>) element depend on the following:
	 * * If the section is the default initial leading section (Q8776414), it will
	 * render no heading element, but directly the content body.
	 * * If the section is not the leading one, but the Wikidata Entity Lookup hasn't
	 * returned a viable title, it will render no heading element.
	 *
	 * @param int $sectionIndex
	 * @param ?string $sectionTitle
	 * @return HtmlArmor
	 */
	public function asWikiSection( int $sectionIndex, ?string $sectionTitle ): HtmlArmor {
		$heading = self::buildSectionHeading( $sectionTitle );

		$section = Html::rawElement( 'section', [
			'data-mw-section-id' => (string)$sectionIndex,
			'aria-labelledby' => $sectionTitle ?? $this->sectionQid,
		], $heading . $this->payload );

		// We know that AWSection->payload is built out of rendered and sanitized
		// fragments that are concatenated, or error/pending fragments that are built
		// with Html::rawElement, so it's safe for us to suppress SecurityCheck-XX
		// @phan-suppress-next-line SecurityCheck-XSS
		return new HtmlArmor( $section );
	}

	/**
	 * Returns a placeholder HtmlArmor section indicating the section is not yet available.
	 * Produces the same <section> structure as asWikiSection(), but with a warning box
	 * in place of real content.
	 *
	 * @param int $sectionIndex
	 * @param ?string $sectionTitle
	 * @param string $sectionQid
	 * @param string $time
	 * @return HtmlArmor
	 */
	public static function emptyWikiSection(
		int $sectionIndex,
		?string $sectionTitle,
		string $sectionQid,
		string $time
	): HtmlArmor {
		$heading = self::buildSectionHeading( $sectionTitle );

		$warningBox = Html::warningBox(
			Html::rawElement( 'h3', [],
				wfMessage( 'wikilambda-abstract-special-preview-empty-section-title' )->escaped() )
				. Html::rawElement( 'p', [],
						wfMessage( 'wikilambda-abstract-special-preview-empty-section-body', $time )->parse() )
		);

		$section = Html::rawElement( 'section', [
			'data-mw-section-id' => (string)$sectionIndex,
			'aria-labelledby' => $sectionTitle ?? $sectionQid,
		], $heading . $warningBox );

		return new HtmlArmor( $section );
	}

	/**
	 * Returns the section heading block for a given section title
	 *
	 * @param ?string $sectionTitle
	 * @return string
	 */
	private static function buildSectionHeading( ?string $sectionTitle ): string {
		$heading = '';

		if ( $sectionTitle ) {
			$heading = Html::rawElement( 'div', [ 'class' => 'mw-heading mw-heading2' ],
				Html::rawElement( 'h2', [ 'id' => $sectionTitle ],
				Html::element( 'span', [ 'id' => $sectionTitle, 'typeof' => 'mw:FallbackId' ] )
				. htmlspecialchars( $sectionTitle )
				)
			);
		}

		return $heading;
	}
}
