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
	 *   or attribute (e.g. with a class="wf-some-class-for-pending"), return true
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
				$htmlFragment = AWFragmentStore::createFailingFragmentBlock( $awFragmentValue, $this->locale );
			} else {
				// Fragment exists and is a success:
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
}
