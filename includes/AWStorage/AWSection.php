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

	/** Status counters: Tracks this section's pending, failing or stale fragments */
	private int $countPending = 0;
	private int $countFailed = 0;
	private int $countStale = 0;

	/** String to concatenate different fragment html blobs */
	public const FRAGMENT_SEPARATOR = "\n";

	private string $payload;
	private ConvertibleTimestamp $lastUpdated;

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

		// If the section is retrieved from the store and initialized with the stored
		// payload, we need to parse the metadata hidden element to update the status:
		if ( $payload !== '' ) {
			$this->parseStatusMetadata();
		}
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
	 * @return bool
	 */
	public function isPending(): bool {
		return $this->countPending > 0;
	}

	/**
	 * Returns the status data for this section, consisting on
	 * the total counts of pending, failed and stale fragments.
	 *
	 * @return array
	 */
	public function getFragmentStatus(): array {
		return [
			'pending' => $this->countPending,
			'failed' => $this->countFailed,
			'stale' => $this->countStale
		];
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
			$this->countPending += 1;
			$htmlFragment = AWFragmentStore::createPendingFragmentBlock( $this->locale );
		} else {
			$awFragmentValue = $awFragment->getValue()['value'];

			// If a stale fragment appears, mark section as stale
			if ( $awFragment->isStale() ) {
				$this->countStale += 1;
			}

			if ( !$awFragment->isOk() ) {
				// Fragment exists but is a failure: generate error fragment html
				$this->countFailed += 1;
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
	 * Appends a hidden span element with fragment status metadata
	 * to the existing payload (only non-zero values).
	 *
	 * @return void
	 */
	public function appendStatusMetadata(): void {
		// Only non-zero values, to keep the output clean
		$metadata = array_filter( [
			'data-pending' => $this->countPending,
			'data-failed' => $this->countFailed,
			'data-stale' => $this->countStale,
		] );
		if ( count( $metadata ) > 0 ) {
			$this->payload .= Html::element( 'meta', [
				'itemprop' => 'aw-section-status',
				...$metadata
			] );
		}
	}

	/**
	 * Reads fragment status metadata from the payload and updates
	 * the local counters for pending, failed and stale fragments.
	 *
	 * @return void
	 */
	public function parseStatusMetadata(): void {
		preg_match( '/data-pending="(\d+)"/', $this->payload, $pendingMatch );
		preg_match( '/data-failed="(\d+)"/', $this->payload, $failedMatch );
		preg_match( '/data-stale="(\d+)"/', $this->payload, $staleMatch );

		$this->countPending = isset( $pendingMatch[1] ) ? (int)$pendingMatch[1] : 0;
		$this->countFailed = isset( $failedMatch[1] ) ? (int)$failedMatch[1] : 0;
		$this->countStale = isset( $staleMatch[1] ) ? (int)$staleMatch[1] : 0;
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
			'itemscope' => true,
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
			'data-wikilambda-aw-section-status' => 'pending',
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
